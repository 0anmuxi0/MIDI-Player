# MIDI 可视化播放器

一个基于 Python + Flask + pywebview 的 MIDI 音频可视化播放器，支持瀑布流动画、粒子特效、多种音色库。

界面使用 WinUIonWeb 项目的真实 WinUI 3 组件实现（Vue 3 + Vite 构建），支持浅色 / 深色 / 跟随系统三态主题。

---

## 预览

| 浅色模式 | 深色模式 |
|:---:|:---:|
| ![浅色模式](./screenshots/ui-light.png) | ![深色模式](./screenshots/ui-dark.png) |

| 加载 MIDI 后的音轨面板 |
|:---:|
| ![音轨面板](./screenshots/ui-tracks.png) |

| 水平模式 | 垂直模式 |
|:---:|:---:|
| ![水平模式](./screenshots/horizontal.png) | ![垂直模式](./screenshots/vertical.png) |


## 功能特性

- **MIDI 播放** — 支持 `.mid` / `.midi` 文件
- **瀑布流可视化** — 支持水平/垂直两种方向
- **粒子特效** — 音符碰撞时产生粒子效果
- **音符发光** — 自定义发光效果开关
- **可调速度** — 瀑布流滚动速度实时调整
- **独立音量** — 每个音轨独立控制音量/静音
- **循环播放** — 支持单曲循环
- **深色模式** — 浅色 / 深色 / 跟随系统三态切换，设置自动保存
- **GM 音色库** — 内置 FluidR3_GM 等音色库
- **全屏模式** — 支持原生窗口全屏（隐藏鼠标）
- **拖拽导入** — 拖拽MIDI文件到窗口即可加载


## 使用方法

### 直接运行（Python）
```bash
cd "MIDI Player"
.venv\Scripts\pythonw.exe "MIDI Player.py"
```

前端构建产物已提交到 `assets/`，克隆后即可直接运行；只有修改前端源码时才需要重新构建。

### 构建前端

前端源码在 `frontend/`，使用 Vue 3 + Vite，界面组件直接取自 WinUIonWeb。

```bash
cd frontend
pnpm install
pnpm build          # 产物输出到 ../assets（Flask 静态目录）
```

### 打包为 exe

```bash
pip install pyinstaller flask pywebview

# 1) 先把音色库打成单个归档（只需执行一次，改了音色再重跑）
python tools/pack_soundfonts.py

# 2) 打包（音色以 soundfonts.zip 随 exe 携带）
python -m PyInstaller --noconfirm --onefile --windowed --icon icon.ico ^
  --hidden-import flask --hidden-import webview ^
  --collect-all webview ^
  --add-data "assets;assets" ^
  --add-data "soundfonts.zip;." ^
  --distpath "dist" ^
  "MIDI Player.py"
```

生成的可执行文件在 `dist/MIDI Player.exe`（约 88 MB）。

> **为什么要先打成 zip**：PyInstaller 单文件模式每次启动都会把打包内容解开到 `%TEMP%`。
> 若直接打包 `soundfonts/`（4504 个小文件、91 MB），启动要花约 10 秒；
> 换成单个 `soundfonts.zip` 后启动只需解压这一个文件，**启动时间从约 11 秒降到约 3 秒**，
> 具体音色在浏览器请求时由 `serve_soundfont` 按需从 zip 中取出，仍然是单文件分发。
>
> 开发模式（直接 `python "MIDI Player.py"`）无需 zip，会直接读取 `soundfonts/` 目录。

### 已打包版本
前往[Releases](https://github.com/0anmuxi0/MIDI-Player/releases)页面下载构建好的版本

---

## 技术栈

- **后端**: Python, Flask, pywebview
- **前端**: Vue 3, Vite, HTML5 Canvas, Tone.js
- **界面组件**: WinUIonWeb（WinUI 3 设计语言与控件实现，位于 `frontend/src/winui/`）
- **音色库**: FluidR3_GM, FatBoy, Salamander
- **打包**: PyInstaller

## 目录结构

```
MIDI Player.py           Flask 服务 + pywebview 窗口
assets/                  前端构建产物（Tone.js、midi 解析库也在此）
frontend/                前端源码
  src/App.vue            界面（WinUIonWeb 组件组合）
  src/player/player.js   引擎：Tone.js 音频调度 + Canvas 渲染 + MIDI 解析
  src/winui/             从 WinUIonWeb 原样复制的组件与 theme.css
soundfonts/              音色库（开发模式直接读取）
soundfonts.zip           打包用音色归档（由 tools/pack_soundfonts.py 生成，不提交仓库）
tools/pack_soundfonts.py 生成打包用音色归档
```
