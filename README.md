# MIDI 可视化播放器

Windows 桌面 MIDI 播放器：把 MIDI 音符以瀑布流形式可视化，并用采样音源实时播放。

![界面预览](screenshots/ui-dark.png)

---

## 特性

**可视化**
- MIDI 瀑布流渲染（水平 / 垂直两种方向，判定线位置可调）
- 粒子特效、音符发光、屏幕震动（震动幅度随画布分辨率等比缩放，高分屏不失效）
- 音名与小节标签、播放进度、循环播放
- 画布高度可用鼠标拖拽调整，并记住上次的高度

**音频**
- Tone.js 采样播放，内置三套音色库：`FluidR3_GM`、`FatBoy`、`salamander`
- 多音轨控制：逐轨开关、音量、音色（GM 128 音色 / 采样音色 / 合成器音色）
- 播放速度（0.5×–2×）、音量、瀑布流速度可调

**界面**
- WinUI 3 设计语言（组件来自 [WinUIonWeb](https://github.com/) 原样复制）
- 浅色 / 深色 / 跟随系统
- 设置项按窗口宽度自动增减列数（宽屏最多 4 列）
- 全屏时只保留画布，隐藏全部其它界面
- 启动画面 + 卡片缓动入场动画

---

## 性能

| 宿主实现 | 启动耗时 | 分发形式 |
|---|---|---|
| **C++ / WebView2（当前）** | **约 0.1 秒** | 单 exe（约 93 MB，音色内置） |
| Python / pywebview（历史版本） | 2.2 ~ 11 秒 | 单 exe |

---

## 架构

```
┌─────────────────────────────────────────────┐
│  MIDI Player.exe（C++ / Win32 宿主）         │
│                                             │
│  · 原生窗口 + 深色标题栏（DWM）              │
│  · 启动画面：GDI 直接绘制应用图标            │
│  · WebView2 承载界面                         │
│      └ WebResourceRequested 拦截请求         │
│         （虚拟域名 https://midi.local/）     │
│         · /api/config   → 注册表读写         │
│         · /api/soundfonts/* → 音色按需读取   │
│         · 其余 → 前端静态资源               │
│                                             │
│  resources.zip 追加在 exe 尾部               │
│  （前端产物 + 音色库 + WebView2Loader）      │
│      └ 运行时内存映射，零解压                │
└─────────────────────────────────────────────┘
```

**启动为什么这么快**

1. **没有 Python 运行时** —— 宿主是原生 C++，省掉解释器与依赖加载
2. **没有 HTTP 服务器** —— 用 WebView2 的资源拦截直接提供文件，省掉 Flask 启停
3. **没有解压过程** —— 资源包以 zip 追加在 exe 尾部，运行时把 exe 映射进内存、按需切片读取单个音色文件（实测单个采样读取约几十毫秒）
4. 前端（Vue / Tone.js / 渲染引擎）**一行未改**，通过注入的 `window.pywebview.api.fs()` 垫片保持原有全屏调用

**配置存储**：`HKCU\Software\MIDIPlayer` 的 `config` 值（JSON），局部更新采用合并写入，
因此单独保存窗口尺寸不会影响其它设置。旧版 Python 宿主的设置可被直接继承。

---

## 构建

### 1. 前端

```bash
cd frontend
pnpm install
pnpm build          # 产物输出到 ../assets（宿主的静态资源目录）
```

### 2. 宿主（生成单文件 exe）

依赖：

- `clang++`（MinGW-w64 目标；本机使用 Windhawk 自带的 LLVM 20）
- [Microsoft.Web.WebView2](https://www.nuget.org/packages/Microsoft.Web.WebView2) SDK 中的 `WebView2.h` 与 `WebView2Loader.dll`

```bash
pwsh -File host/build.ps1
# 产物：host/build/MIDI Player.exe（约 93 MB，音色已内置）
```

构建脚本依次完成：编译宿主 → 用 Win32 `UpdateResource` 嵌入图标（该工具链没有 windres）→
把前端产物、音色库与 `WebView2Loader.dll` 打成 zip 追加到 exe 尾部。

### 3. 验证

```bash
"host/build/MIDI Player.exe" --selfcheck    # 校验资源包完整性，退出码 0 表示通过
```

---

## 目录结构

```
MIDI Player.py           历史实现（Python + Flask + pywebview），保留以备回退
host/                    C++ / WebView2 宿主
  main.cpp               窗口、WebView2、资源拦截、全屏
  payload.cpp            内嵌资源包（尾部 zip 解析）+ 注册表配置
  host.h                 公共声明
  pack.py                生成资源包并追加到 exe 尾部
  seticon.py             用 UpdateResource 嵌入图标
  build.ps1              一键构建
frontend/                前端源码
  src/App.vue            界面（WinUIonWeb 组件组合）
  src/app.css            布局与主题
  src/player/player.js   引擎：Tone.js 音频调度 + Canvas 渲染 + MIDI 解析
  src/winui/             从 WinUIonWeb 复制来的组件与 theme.css
  public/                splash.html、app-icon.png
assets/                  前端构建产物（宿主静态资源目录）
soundfonts/              音色库（开发模式直接读取）
icon.ico                 应用图标（多尺寸）
```

---

## 操作

| 操作 | 说明 |
|---|---|
| 上传 MIDI 文件 | 点击按钮选择，或直接把 `.mid` 拖进窗口 |
| 空格 | 暂停 / 继续 |
| R | 重置 |
| 全屏 | 画布右上角按钮（全屏时只显示画布） |
| 调整画布高度 | 鼠标移到画布底边，出现拖拽条后上下拖动 |
| 单轨控制 | 音轨面板中逐轨开关、调音量、换音色 |

---

## 技术栈

| 层 | 技术 |
|---|---|
| 宿主 | C++17、Win32、WebView2 |
| 前端 | Vue 3、Vite、HTML5 Canvas、Tone.js |
| 界面组件 | WinUIonWeb（WinUI 3 设计语言与控件实现） |
| 音色库 | FluidR3_GM、FatBoy、Salamander |
| 构建 | clang / MinGW-w64、PyInstaller（历史版本） |

---

## 已构建版本

前往 [Releases](https://github.com/0anmuxi0/MIDI-Player/releases) 下载。
当前推荐 **2.x（C++ 宿主）** 版本：单文件、音色内置、启动约 0.1 秒。
