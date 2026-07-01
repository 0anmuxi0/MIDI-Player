import json
import threading
import winreg
from pathlib import Path

import webview # type: ignore
from flask import Flask, jsonify, request, send_from_directory # type: ignore
BASE_DIR = Path(__file__).parent.resolve()
SRC_DIR = BASE_DIR / "assets"
SOUNDFONTS_DIR = BASE_DIR / "soundfonts"
app = Flask(__name__, static_folder=str(SRC_DIR), static_url_path="")
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

REGISTRY_PATH = r"Software\MIDIPlayer"

def _load_config_from_registry():
    """从 Windows 注册表读取配置"""
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH, 0, winreg.KEY_READ) as key:
            value, _ = winreg.QueryValueEx(key, "config")
            return json.loads(value)
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}

def _save_config_to_registry(cfg):
    """保存配置到 Windows 注册表"""
    try:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH) as key:
            winreg.SetValueEx(key, "config", 0, winreg.REG_SZ, json.dumps(cfg))
    except OSError as e:
        print(f"注册表写入失败: {e}")

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
        _save_config_to_registry(cfg)
        return jsonify({"status": "ok"})
    cfg = _load_config_from_registry()
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
    app.run(host="127.0.0.1", port=7891, debug=False)
def load_window_size():
    return 1360, 745
if __name__ == "__main__":
    width, height = load_window_size()
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()
    window = webview.create_window(
        "MIDI 可视化播放器",
        url="http://127.0.0.1:7891",
        js_api=api,
        width=width,
        height=height,
        resizable=True,
        min_size=(1,1),
        confirm_close=False,
        background_color='#ffffff'
    )
    api.set_window(window)
    webview.start()
