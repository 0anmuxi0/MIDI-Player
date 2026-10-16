# 开发文档

面向想改动或重新构建本项目的开发者。普通用户请看 [README.md](README.md)。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 宿主 | C++17、Win32、WebView2 |
| 前端 | Vue 3、Vite、HTML5 Canvas、Tone.js |
| 界面组件 | WinUIonWeb（WinUI 3 设计语言与控件实现） |
| 音色库 | FluidR3_GM、FatBoy、Salamander |
| 构建 | clang / MinGW-w64 |

---

## 架构

```
┌─────────────────────────────────────────────┐
│  MIDI Player.exe（C++ / Win32 宿主）         │
│                                             │
│  · 原生窗口 + 深色标题栏（DWM 运行时切换）    │
│  · 启动画面：GDI 直接绘制应用图标            │
│  · 自动更新：检查 GitHub Releases            │
│  · WebView2 承载界面                         │
│      └ WebResourceRequested 拦截请求         │
│         （虚拟域名 https://midi.local/）     │
│         · /api/config      → 注册表读写      │
│         · /api/soundfonts/* → 音色按需读取   │
│         · 其余 → 前端静态资源               │
│                                             │
│  zip 资源包追加在 exe 尾部                    │
│  （前端产物 + 音色库 + WebView2Loader）      │
│      └ 运行时内存映射，零解压                │
└─────────────────────────────────────────────┘
```

### 关键设计

**为什么启动快（约 0.1 秒）**

1. 原生 C++ 宿主，没有 Python 运行时
2. 用 WebView2 的资源拦截替代 HTTP 服务器，不需要 Flask 启停
3. 前端产物与音色库以 zip 追加在 exe 尾部，运行时把 exe 映射进内存、按需切片读取单个音色，
   **不产生任何解压或临时文件**
4. 前端（Vue / Tone.js / 渲染引擎）完全复用，通过注入的 `window.pywebview.api.fs()` 垫片
   保持原有全屏调用

**宿主与页面的通信**（全部走 WebView2 的 `postMessage`）

| 方向 | 消息 | 用途 |
|---|---|---|
| 页面 → 宿主 | `{type:'fullscreen'}` | 进 / 出全屏（按钮、F11、ESC 都走这里） |
| 页面 → 宿主 | `{type:'theme', dark}` | 主题切换时同步标题栏与窗口底色 |
| 页面 → 宿主 | `{type:'ui-ready'}` | 入场动画开始播放的回执（便于排查） |
| 宿主 → 页面 | `ExecuteScript` | 添加 `body.ui-ready` 触发卡片入场动画 |

**配置**：`HKCU\Software\MIDIPlayer` 的 `config` 值（JSON）。写入采用**合并**语义
（读出现有配置 → 只更新提交的字段 → 写回），因此单独保存窗口尺寸不会清掉其它设置。

**自动更新**：启动后延迟 1.5 秒在后台线程请求
`https://api.github.com/repos/0anmuxi0/MIDI-Player/releases/latest`，
用 `APP_VERSION`（见 `host/host.h`）与远端 `tag_name` 比较；有新版则弹窗询问，
确认后用 `URLDownloadToFile` 下载到 `%TEMP%`，再生成批处理等待本进程退出、替换 exe 并重启。

---

## 构建

### 依赖

- `clang++`（MinGW-w64 目标）。开发机上用的是 LLVM 20
  （`C:\Program Files\Windhawk\Compiler`，任意 MinGW-w64 clang/gcc 均可）
- [Microsoft.Web.WebView2](https://www.nuget.org/packages/Microsoft.Web.WebView2) SDK 中的
  `WebView2.h` 与 `WebView2Loader.dll`
- Node.js + pnpm（构建前端）

### 1. 前端

```bash
cd frontend
pnpm install
pnpm build          # 产物输出到 ../assets（宿主的静态资源目录）
```

### 2. 宿主（生成单文件 exe）

```bash
powershell -ExecutionPolicy Bypass -File host\build.ps1
# 产物：host/build/MIDI Player.exe（约 93 MB，音色已内置）
```

> Windows 默认禁止运行 `.ps1`，所以要带 `-ExecutionPolicy Bypass`。
> 或在当前会话里先执行 `Set-ExecutionPolicy -Scope Process Bypass`。

脚本依次完成：

1. 编译宿主（clang++，静态链接）
2. 用 Win32 `UpdateResource` 嵌入图标 —— 该工具链没有 windres，所以走 P/Invoke
3. 把**前端产物 + 音色库 + WebView2Loader.dll** 打成 zip，追加到 exe 尾部

**整条构建链只用 PowerShell，不依赖 Python 或任何其它运行时。**

### 3. 校验

```bash
"host\build\MIDI Player.exe" --selfcheck   # 校验资源包完整性，退出码 0 表示通过
```

---

## 目录结构

```
host/                    C++ / WebView2 宿主（构建脚本全为 PowerShell）
  main.cpp               窗口、WebView2、资源拦截、全屏、主题同步、自动更新
  payload.cpp            内嵌资源包（尾部 zip 解析）+ 注册表配置
  host.h                 公共声明与版本号 APP_VERSION
  build.ps1              一键构建（编译 → 嵌图标 → 打包）
  pack.ps1               生成资源包并追加到 exe 尾部
  seticon.ps1            用 UpdateResource 嵌入图标
frontend/                前端源码
  src/App.vue            界面（WinUIonWeb 组件组合）
  src/app.css            布局与主题
  src/player/player.js   引擎：Tone.js 音频调度 + Canvas 渲染 + MIDI 解析
  src/winui/             从 WinUIonWeb 复制来的组件与 theme.css
  public/                app-icon.png
assets/                  前端构建产物（宿主静态资源目录）
soundfonts/              音色库（打包时嵌入 exe）
icon.ico                 应用图标（多尺寸）
```

---

## 发版流程

1. 改 `host/host.h` 里的 `APP_VERSION`
2. 重新构建前端与宿主（见上）
3. 打 tag、在 GitHub 创建 Release，上传 `MIDI Player.exe`
4. 已发布的旧版本会在下次启动时自动检测到这个新版本
