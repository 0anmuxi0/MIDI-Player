import json
import threading
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

@app.route("/")
def index():
    return send_from_directory(str(SRC_DIR), "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    """提供 src/ 下的静态文件（app.js, styles.css, Tone.js, midi 等）"""
    return send_from_directory(str(SRC_DIR), filename)


# ==================== API：配置读写（内存存储，不写文件） ====================

_memory_config = {}

@app.route("/api/config", methods=["GET", "POST"])
def handle_config():
    global _memory_config
    if request.method == "POST":
        _memory_config = request.get_json(force=True)
        return jsonify({"status": "ok"})
    return jsonify(_memory_config)


# ==================== API：音色库音频文件 ====================

@app.route("/api/soundfonts/<path:subpath>")
def serve_soundfont(subpath):
    """
    提供 soundfonts/ 下的音频文件。
    例如：/api/soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/C4.mp3
    """
    return send_from_directory(str(SOUNDFONTS_DIR), subpath)


# ==================== pywebview JS API ====================

class WebViewApi:
    """通过 pywebview JS bridge 暴露给前端的 API"""

    def __init__(self):
        self._window = None
        self._is_fullscreen = False

    def set_window(self, window):
        self._window = window

    def fs(self):
        """切换原生窗口全屏/窗口化，返回当前是否全屏"""
        if not self._window:
            return "no_window"
        try:
            self._window.toggle_fullscreen()
            self._is_fullscreen = not self._is_fullscreen
            return "fullscreen" if self._is_fullscreen else "windowed"
        except Exception as e:
            return str(e)


api = WebViewApi()


# ==================== 启动 ====================

def start_flask():
    """在后台线程中启动 Flask 服务器"""
    app.run(host="127.0.0.1", port=5000, debug=False)


def load_window_size():
    return 1360, 745


if __name__ == "__main__":
    width, height = load_window_size()

    # 后台启动 Flask
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()

    # 创建原生窗口
    window = webview.create_window(
        "MIDI 可视化播放器",
        url="http://127.0.0.1:5000",
        js_api=api,
        width=width,
        height=height,
        resizable=True,
        min_size=(800, 480),
        confirm_close=False,
    )
    api.set_window(window)
    webview.start()
