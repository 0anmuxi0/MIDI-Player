import json
import os
import threading
import time
import winreg
from pathlib import Path
from elevate import elevate
import webview
from flask import Flask, jsonify, request, send_from_directory

# ==================== 启动耗时日志（排查启动慢） ====================
_BOOT_TS = time.time()
_BOOT_LOG = Path(os.environ.get("TEMP", ".")) / "midi-player-boot.log"
try:
    _BOOT_LOG.write_text("", encoding="utf-8")
except OSError:
    pass


def boot_log(message):
    try:
        with open(_BOOT_LOG, "a", encoding="utf-8") as handle:
            handle.write(f"{time.time() - _BOOT_TS:6.2f}s  {message}\n")
    except OSError:
        pass


BASE_DIR = Path(__file__).parent.resolve()
SRC_DIR = BASE_DIR / "assets"
SOUNDFONTS_DIR = BASE_DIR / "soundfonts"
app = Flask(__name__, static_folder=str(SRC_DIR), static_url_path="")
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

boot_log("模块导入完成")

REGISTRY_PATH = r"Software\MIDIPlayer"

def load_config_from_registry():
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH, 0, winreg.KEY_READ) as key:
            value, _ = winreg.QueryValueEx(key, "config")
            return json.loads(value)
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}

def save_config_to_registry(cfg):
    """合并写入：只更新传入的字段，避免局部更新（如窗口尺寸）覆盖其它设置。"""
    if not isinstance(cfg, dict):
        return
    try:
        merged = load_config_from_registry()
        merged.update(cfg)
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH) as key:
            winreg.SetValueEx(key, "config", 0, winreg.REG_SZ, json.dumps(merged))
    except OSError as e:
        print(f"{e}")

@app.route("/")
def index():    
    return send_from_directory(str(SRC_DIR), "index.html")
@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(str(SRC_DIR), filename)
@app.route("/api/config", methods=["GET", "POST"])
def handle_config():
    if request.method == "POST":
        cfg = request.get_json(force=True)
        save_config_to_registry(cfg)
        return jsonify({"status": "ok"})
    cfg = load_config_from_registry()
    return jsonify(cfg)
@app.route("/api/soundfonts/<path:subpath>")
def serve_soundfont(subpath):
    return send_from_directory(str(SOUNDFONTS_DIR), subpath)
class WebViewApi:
    def __init__(self):
        self._window = None
        self._is_fullscreen = False

    def set_window(self, window):
        self._window = window
    def fs(self):
        if not self._window:
            return "no_window"
        try:
            self._window.toggle_fullscreen()
            self._is_fullscreen = not self._is_fullscreen
            return "fullscreen" if self._is_fullscreen else "windowed"
        except Exception as e:
            return str(e)
api = WebViewApi()
def start_flask():
    app.run(host="127.0.0.1", port=8000, debug=False)
DEFAULT_WINDOW_SIZE = (1360, 745)


def load_window_size():
    """优先使用上次窗口尺寸（前端在 resize 时会写回注册表）。"""
    cfg = load_config_from_registry()
    try:
        width = int(cfg.get("windowWidth", 0))
        height = int(cfg.get("windowHeight", 0))
    except (TypeError, ValueError):
        return DEFAULT_WINDOW_SIZE
    # 过滤异常值，避免窗口跑到屏幕外或小到不可用
    if 800 <= width <= 5120 and 500 <= height <= 2880:
        return width, height
    return DEFAULT_WINDOW_SIZE

# 与前端 theme.css 的 --app-bg 保持一致
THEME_BACKGROUNDS = {"light": "#f3f3f3", "dark": "#202020"}

def resolve_background_color():
    """按配置（light / dark / system）决定窗口底色，避免启动时闪白。"""
    theme = load_config_from_registry().get("theme", "system")
    if theme in THEME_BACKGROUNDS:
        return THEME_BACKGROUNDS[theme]
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
            0,
            winreg.KEY_READ,
        ) as key:
            apps_use_light_theme, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
        return THEME_BACKGROUNDS["light"] if apps_use_light_theme else THEME_BACKGROUNDS["dark"]
    except (FileNotFoundError, OSError):
        return THEME_BACKGROUNDS["light"]

if __name__ == "__main__":
    boot_log("准备提权")
    elevate()
    boot_log("提权完成")
    width, height = load_window_size()
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()
    boot_log("Flask 线程已启动")
    window = webview.create_window(
        "MIDI 可视化播放器",
        url="http://127.0.0.1:8000",
        js_api=api,
        width=width,
        height=height,
        resizable=True,
        min_size=(1,1),
        confirm_close=False,
        background_color=resolve_background_color()
    )
    api.set_window(window)
    boot_log("窗口对象已创建，开始 webview.start()")
    webview.start()
    boot_log("webview 已退出")
