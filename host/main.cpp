// ============================================================================
//  MIDI 可视化播放器 —— C++ / WebView2 宿主
// ============================================================================
#include "host.h"

#include <objbase.h>
#include <shellapi.h>
#include <shlwapi.h>
#include <shlobj.h>
#include <dwmapi.h>

#include "WebView2.h"

#ifdef __MINGW32__
// MinGW 不像 MSVC 那样从 MIDL_INTERFACE 属性推导 GUID，需要显式声明
__CRT_UUID_DECL(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler,
                0x4e8a3389, 0xc9d8, 0x4bd2, 0xb6, 0xb5, 0x12, 0x4f, 0xee, 0x6c, 0xc1, 0x4d)
__CRT_UUID_DECL(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler,
                0x6c4819f3, 0xc9b7, 0x4260, 0x81, 0x27, 0xc9, 0xf5, 0xbd, 0xe7, 0xf6, 0x8c)
__CRT_UUID_DECL(ICoreWebView2WebResourceRequestedEventHandler,
                0xab00b74c, 0x15f1, 0x4646, 0x80, 0xe8, 0xe7, 0x63, 0x41, 0xd2, 0x5d, 0x71)
__CRT_UUID_DECL(ICoreWebView2WebMessageReceivedEventHandler,
                0x57213f19, 0x00e6, 0x49fa, 0x8e, 0x07, 0x89, 0x8e, 0xa0, 0x1e, 0xcb, 0xd2)
__CRT_UUID_DECL(ICoreWebView2NavigationCompletedEventHandler,
                0xd33a35bf, 0x1c49, 0x4f98, 0x93, 0xab, 0x00, 0x6e, 0x05, 0x33, 0xfe, 0x1c)
__CRT_UUID_DECL(ICoreWebView2Controller2,
                0xc979903e, 0xd4ca, 0x4228, 0x92, 0xeb, 0x47, 0xee, 0x3f, 0xa9, 0x6e, 0xab)
#endif

#include <cstdio>
#include <cstring>

const wchar_t* kAppTitle = L"MIDI 可视化播放器";
const wchar_t* kRegistryPath = L"Software\\MIDIPlayer";
const wchar_t* kRegistryValue = L"config";
const wchar_t* kBaseUrl = L"https://midi.local/";

static Payload g_payload;
static Config g_config;
static HWND g_hwnd = nullptr;
static ICoreWebView2Environment* g_env = nullptr;
static ICoreWebView2Controller* g_controller = nullptr;
static ICoreWebView2* g_webview = nullptr;
static bool g_fullscreen = false;
static RECT g_windowedRect{};
static DWORD g_windowedStyle = 0;

// 启动画面（WebView2 就绪前由 GDI 直接绘制应用图标）
static HICON g_appIconBig = nullptr;
static HICON g_appIconSmall = nullptr;
static bool g_splashVisible = true;
static COLORREF g_themeBg = RGB(32, 32, 32);
static bool g_darkTheme = true;

#ifndef DWMWA_USE_IMMERSIVE_DARK_MODE
#define DWMWA_USE_IMMERSIVE_DARK_MODE 20
#endif

// 主题：读配置（light/dark/system），system 时看系统应用主题
static bool ResolveDarkTheme() {
    std::string theme;
    if (g_config.GetString("theme", theme)) {
        if (theme == "dark") return true;
        if (theme == "light") return false;
    }
    DWORD value = 1;
    DWORD size = sizeof(value);
    HKEY key = nullptr;
    if (RegOpenKeyExW(HKEY_CURRENT_USER,
                      L"Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
                      0, KEY_READ, &key) == ERROR_SUCCESS) {
        RegQueryValueExW(key, L"AppsUseLightTheme", nullptr, nullptr, (LPBYTE)&value, &size);
        RegCloseKey(key);
    }
    return value == 0;
}

// ---------------------------------------------------------------------------
// WebView2Loader 动态加载（从资源包释放到临时目录）
// ---------------------------------------------------------------------------
typedef HRESULT(STDAPICALLTYPE* PFN_CreateEnvWithOptions)(
    PCWSTR, PCWSTR, ICoreWebView2EnvironmentOptions*,
    ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*);

static PFN_CreateEnvWithOptions g_createEnv = nullptr;

static bool EnsureLoader(HMODULE& outModule) {
    std::vector<uint8_t> dll;
    if (!g_payload.Read("WebView2Loader.dll", dll) || dll.empty()) {
        HostLog("Loader: 资源包中没有 WebView2Loader.dll");
        return false;
    }

    wchar_t temp[MAX_PATH] = {0};
    GetTempPathW(MAX_PATH, temp);
    std::wstring dir = std::wstring(temp) + L"MIDI-Player-Host";
    CreateDirectoryW(dir.c_str(), nullptr);
    std::wstring path = dir + L"\\WebView2Loader.dll";

    bool needWrite = true;
    WIN32_FILE_ATTRIBUTE_DATA attr{};
    if (GetFileAttributesExW(path.c_str(), GetFileExInfoStandard, &attr)) {
        ULARGE_INTEGER existing;
        existing.LowPart = attr.nFileSizeLow;
        existing.HighPart = attr.nFileSizeHigh;
        if (existing.QuadPart == dll.size()) needWrite = false;
    }
    if (needWrite) {
        HANDLE file = CreateFileW(path.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
        if (file == INVALID_HANDLE_VALUE) {
            HostLog("Loader: 无法写入 %ls", path.c_str());
            return false;
        }
        DWORD written = 0;
        WriteFile(file, dll.data(), (DWORD)dll.size(), &written, nullptr);
        CloseHandle(file);
    }

    outModule = LoadLibraryW(path.c_str());
    if (!outModule) {
        HostLog("Loader: LoadLibrary 失败 (%lu)", GetLastError());
        return false;
    }
    g_createEnv = (PFN_CreateEnvWithOptions)GetProcAddress(outModule, "CreateCoreWebView2EnvironmentWithOptions");
    if (!g_createEnv) {
        HostLog("Loader: 未找到 CreateCoreWebView2EnvironmentWithOptions");
        return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// 简易 COM 回调基类
// ---------------------------------------------------------------------------
template <typename T>
class Callback : public T {
public:
    ULONG ref_ = 1;

    virtual ~Callback() = default;

    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
        if (!ppv) return E_POINTER;
        if (riid == IID_IUnknown || riid == __uuidof(T)) {
            *ppv = static_cast<T*>(this);
            AddRef();
            return S_OK;
        }
        *ppv = nullptr;
        return E_NOINTERFACE;
    }
    ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&ref_); }
    ULONG STDMETHODCALLTYPE Release() override {
        ULONG remaining = InterlockedDecrement(&ref_);
        if (remaining == 0) delete this;
        return remaining;
    }
};

// ---------------------------------------------------------------------------
// 资源路由
// ---------------------------------------------------------------------------
static const wchar_t* MimeFor(const std::string& path) {
    auto ends = [&](const char* suffix) {
        size_t n = strlen(suffix);
        return path.size() >= n && _stricmp(path.c_str() + path.size() - n, suffix) == 0;
    };
    if (ends(".html")) return L"text/html; charset=utf-8";
    if (ends(".js") || path == "assets/midi") return L"text/javascript; charset=utf-8";
    if (ends(".css")) return L"text/css; charset=utf-8";
    if (ends(".png")) return L"image/png";
    if (ends(".ico")) return L"image/x-icon";
    if (ends(".mp3")) return L"audio/mpeg";
    if (ends(".mid") || ends(".midi")) return L"audio/midi";
    if (ends(".json")) return L"application/json; charset=utf-8";
    if (ends(".svg")) return L"image/svg+xml";
    return L"application/octet-stream";
}

static std::string UrlDecode(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (size_t i = 0; i < value.size(); ++i) {
        if (value[i] == '%' && i + 2 < value.size()) {
            auto hex = [](char c) -> int {
                if (c >= '0' && c <= '9') return c - '0';
                if (c >= 'a' && c <= 'f') return c - 'a' + 10;
                if (c >= 'A' && c <= 'F') return c - 'A' + 10;
                return -1;
            };
            int hi = hex(value[i + 1]), lo = hex(value[i + 2]);
            if (hi >= 0 && lo >= 0) {
                out.push_back((char)(hi * 16 + lo));
                i += 2;
                continue;
            }
        }
        out.push_back(value[i]);
    }
    return out;
}

static void RespondWith(ICoreWebView2WebResourceRequestedEventArgs* args,
                        const std::vector<uint8_t>& body, const wchar_t* mime, int status = 200) {
    if (!g_env) return;
    IStream* stream = SHCreateMemStream(body.empty() ? (const BYTE*)"" : body.data(), (UINT)body.size());
    std::wstring headers = std::wstring(L"Content-Type: ") + mime +
                           L"\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *";
    ICoreWebView2WebResourceResponse* response = nullptr;
    if (SUCCEEDED(g_env->CreateWebResourceResponse(stream, status, status == 200 ? L"OK" : L"Not Found",
                                                  headers.c_str(), &response)) && response) {
        args->put_Response(response);
        response->Release();
    }
    if (stream) stream->Release();
}

static void RespondText(ICoreWebView2WebResourceRequestedEventArgs* args, const std::string& text,
                        const wchar_t* mime = L"application/json; charset=utf-8", int status = 200) {
    std::vector<uint8_t> body(text.begin(), text.end());
    RespondWith(args, body, mime, status);
}

// 读取请求体
static std::string ReadRequestBody(ICoreWebView2WebResourceRequest* request) {
    IStream* stream = nullptr;
    if (FAILED(request->get_Content(&stream)) || !stream) return std::string();
    STATSTG stat{};
    if (FAILED(stream->Stat(&stat, STATFLAG_NONAME))) { stream->Release(); return std::string(); }
    ULONG size = (ULONG)stat.cbSize.QuadPart;
    std::string body(size, '\0');
    LARGE_INTEGER zero{};
    stream->Seek(zero, STREAM_SEEK_SET, nullptr);
    ULONG read = 0;
    stream->Read(&body[0], size, &read);
    body.resize(read);
    stream->Release();
    return body;
}

static bool HandleApi(const std::string& path, const std::string& method,
                      ICoreWebView2WebResourceRequest* request,
                      ICoreWebView2WebResourceRequestedEventArgs* args) {
    if (path == "/api/config") {
        if (method == "POST") {
            std::string body = ReadRequestBody(request);
            if (!body.empty()) g_config.MergeAndSave(body);
            RespondText(args, "{\"status\":\"ok\"}");
        } else {
            RespondText(args, g_config.Raw());
        }
        return true;
    }
    if (path == "/api/env") {
        bool ok = g_payload.Contains("assets/index.html") &&
                  (g_payload.Contains("soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/C3.mp3") ||
                   g_payload.Contains("soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/A3.mp3"));
        std::string json = std::string("{\"soundfonts\":") + (ok ? "true" : "false") + ",\"frozen\":true}";
        RespondText(args, json);
        return true;
    }
    if (path.rfind("/api/soundfonts/", 0) == 0) {
        std::string rest = UrlDecode(path.substr(strlen("/api/soundfonts/")));
        std::string name = "soundfonts/" + rest;
        std::vector<uint8_t> data;
        if (!g_payload.Read(name, data)) {
            RespondText(args, "{\"error\":\"not found\"}", L"application/json", 404);
            return true;
        }
        RespondWith(args, data, MimeFor(name));
        return true;
    }
    return false;
}

class RequestHandler : public Callback<ICoreWebView2WebResourceRequestedEventHandler> {
public:
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* /*sender*/,
                                     ICoreWebView2WebResourceRequestedEventArgs* args) override {
        ICoreWebView2WebResourceRequest* request = nullptr;
        if (FAILED(args->get_Request(&request)) || !request) return S_OK;

        LPWSTR uriRaw = nullptr;
        request->get_Uri(&uriRaw);
        std::string uri = uriRaw ? WideToUtf8(uriRaw) : std::string();
        if (uriRaw) CoTaskMemFree(uriRaw);

        LPWSTR methodRaw = nullptr;
        request->get_Method(&methodRaw);
        std::string method = methodRaw ? WideToUtf8(methodRaw) : "GET";
        if (methodRaw) CoTaskMemFree(methodRaw);

        // 取路径（去掉协议、主机与查询串）
        std::string path = uri;
        size_t scheme = path.find("://");
        if (scheme != std::string::npos) {
            size_t slash = path.find('/', scheme + 3);
            path = (slash == std::string::npos) ? "/" : path.substr(slash);
        }
        size_t query = path.find('?');
        if (query != std::string::npos) path = path.substr(0, query);
        size_t hash = path.find('#');
        if (hash != std::string::npos) path = path.substr(0, hash);
        if (path.empty()) path = "/";

        if (HandleApi(path, method, request, args)) {
            request->Release();
            return S_OK;
        }

        // 静态资源
        std::string relative = UrlDecode(path == "/" ? std::string("index.html") : path.substr(1));
        std::string name = "assets/" + relative;
        std::vector<uint8_t> data;
        if (g_payload.Read(name, data)) {
            RespondWith(args, data, MimeFor(relative));
        } else {
            HostLog("静态资源未找到: %s", name.c_str());
            RespondText(args, "Not Found", L"text/plain; charset=utf-8", 404);
        }
        request->Release();
        return S_OK;
    }
};

// ---------------------------------------------------------------------------
// 前端兼容垫片：伪装 pywebview 的 api.fs()，指向宿主全屏切换
// ---------------------------------------------------------------------------
static const wchar_t* kShimScript = LR"JS(
(function () {
  if (window.pywebview) return;
  // 前端靠 fs() 的返回值（'fullscreen' / 'windowed'）同步全屏 class，这里如实返回
  var fullscreenState = 'windowed';
  window.pywebview = {
    api: {
      fs: function () {
        try { window.chrome.webview.postMessage(JSON.stringify({ type: 'fullscreen' })); } catch (e) { }
        fullscreenState = (fullscreenState === 'windowed') ? 'fullscreen' : 'windowed';
        return fullscreenState;
      }
    },
    token: 'host',
    platform: 'windows'
  };
  try {
    window.chrome.webview.addEventListener('message', function (event) {
      var payload = event.data;
      if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (e) { } }
      if (payload && payload.type === 'fullscreen-changed') {
        window.dispatchEvent(new CustomEvent('pywebview-fullscreen-changed', { detail: payload.value }));
      }
    });
  } catch (e) { }

  // F11 切换全屏：WebView2 有焦点时键盘消息不会传给宿主，因此在这里监听后通知宿主
  window.addEventListener('keydown', function (event) {
    if (event.key === 'F11') {
      event.preventDefault();
      try { window.chrome.webview.postMessage(JSON.stringify({ type: 'fullscreen' })); } catch (e) { }
    }
  }, true);
})();
)JS";

static void ToggleFullscreen() {
    if (!g_hwnd) return;
    if (!g_fullscreen) {
        g_windowedStyle = GetWindowLongW(g_hwnd, GWL_STYLE);
        GetWindowRect(g_hwnd, &g_windowedRect);
        MONITORINFO mi{};
        mi.cbSize = sizeof(mi);
        HMONITOR monitor = MonitorFromWindow(g_hwnd, MONITOR_DEFAULTTONEAREST);
        GetMonitorInfoW(monitor, &mi);
        SetWindowLongW(g_hwnd, GWL_STYLE, (g_windowedStyle & ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)));
        SetWindowPos(g_hwnd, HWND_TOP, mi.rcMonitor.left, mi.rcMonitor.top,
                     mi.rcMonitor.right - mi.rcMonitor.left, mi.rcMonitor.bottom - mi.rcMonitor.top,
                     SWP_FRAMECHANGED | SWP_NOOWNERZORDER);
        g_fullscreen = true;
    } else {
        SetWindowLongW(g_hwnd, GWL_STYLE, g_windowedStyle);
        SetWindowPos(g_hwnd, nullptr, g_windowedRect.left, g_windowedRect.top,
                     g_windowedRect.right - g_windowedRect.left, g_windowedRect.bottom - g_windowedRect.top,
                     SWP_FRAMECHANGED | SWP_NOZORDER | SWP_NOOWNERZORDER);
        g_fullscreen = false;
    }
    if (g_controller) {
        RECT rc;
        GetClientRect(g_hwnd, &rc);
        g_controller->put_Bounds(rc);
    }
    if (g_webview) {
        std::wstring script = std::wstring(L"document.body.classList.toggle('pywebview-fullscreen', ") +
                              (g_fullscreen ? L"true" : L"false") + L");";
        g_webview->ExecuteScript(script.c_str(), nullptr);
    }
}

class WebMessageHandler : public Callback<ICoreWebView2WebMessageReceivedEventHandler> {public:
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* /*sender*/,
                                     ICoreWebView2WebMessageReceivedEventArgs* args) override {
        LPWSTR raw = nullptr;
        if (SUCCEEDED(args->get_WebMessageAsJson(&raw)) && raw) {
            std::string message = WideToUtf8(raw);
            CoTaskMemFree(raw);
            if (message.find("fullscreen") != std::string::npos) {
                ToggleFullscreen();
            }
        }
        return S_OK;
    }
};

// 导航完成：收起 GDI 启动画面，把画面交给 WebView2
class NavigationHandler : public Callback<ICoreWebView2NavigationCompletedEventHandler> {
public:
    HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* /*sender*/,
                                     ICoreWebView2NavigationCompletedEventArgs* /*args*/) override {
        if (g_splashVisible) {
            HostLog("导航完成，显示主界面");
            g_splashVisible = false;
            if (g_controller) g_controller->put_IsVisible(TRUE);
            KillTimer(g_hwnd, 1);
            InvalidateRect(g_hwnd, nullptr, TRUE);
        }
        return S_OK;
    }
};

// ---------------------------------------------------------------------------
// WebView2 初始化链
// ---------------------------------------------------------------------------
class ControllerHandler : public Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler> {
public:
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, ICoreWebView2Controller* controller) override {
        if (FAILED(result) || !controller) {
            HostLog("Controller: 创建失败 0x%08lX", (unsigned long)result);
            return S_OK;
        }
        g_controller = controller;
        g_controller->AddRef();

        RECT rc;
        GetClientRect(g_hwnd, &rc);
        g_controller->put_Bounds(rc);
        // 先隐藏 WebView2：否则它一创建就盖住 GDI 启动画面，造成"图标→空→界面"的闪动
        g_controller->put_IsVisible(FALSE);

        if (FAILED(g_controller->get_CoreWebView2(&g_webview)) || !g_webview) {
            HostLog("Controller: 无法获取 CoreWebView2");
            return S_OK;
        }

        ICoreWebView2Settings* settings = nullptr;
        if (SUCCEEDED(g_webview->get_Settings(&settings)) && settings) {
            settings->put_AreDefaultContextMenusEnabled(FALSE);
            settings->put_IsStatusBarEnabled(FALSE);
            settings->put_AreDevToolsEnabled(FALSE);
            settings->Release();
        }

        // 允许虚拟域名（无需真实网络）
        g_webview->AddWebResourceRequestedFilter(L"https://midi.local/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
        EventRegistrationToken token{};
        g_webview->add_WebResourceRequested(new RequestHandler(), &token);
        g_webview->add_WebMessageReceived(new WebMessageHandler(), &token);
        g_webview->add_NavigationCompleted(new NavigationHandler(), &token);

        g_webview->AddScriptToExecuteOnDocumentCreated(kShimScript, nullptr);

        // WebView2 底色跟随主题，避免主界面出现前闪白
        ICoreWebView2Controller2* controller2 = nullptr;
        if (SUCCEEDED(g_controller->QueryInterface(IID_PPV_ARGS(&controller2))) && controller2) {
            COREWEBVIEW2_COLOR color = {};
            color.A = 255;
            color.R = GetRValue(g_themeBg);
            color.G = GetGValue(g_themeBg);
            color.B = GetBValue(g_themeBg);
            controller2->put_DefaultBackgroundColor(color);
            controller2->Release();
        }

        HostLog("Controller: 导航到主界面");
        g_webview->Navigate(L"https://midi.local/index.html");
        return S_OK;
    }
};

class EnvironmentHandler : public Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler> {
public:
    HRESULT STDMETHODCALLTYPE Invoke(HRESULT result, ICoreWebView2Environment* env) override {
        if (FAILED(result) || !env) {
            HostLog("Env: 创建失败 0x%08lX（WebView2 运行时是否已安装？）", (unsigned long)result);
            MessageBoxW(nullptr, L"无法初始化 WebView2 运行时。\n请安装 Microsoft Edge WebView2 Runtime 后重试。",
                        kAppTitle, MB_ICONERROR);
            PostQuitMessage(1);
            return S_OK;
        }
        g_env = env;
        g_env->AddRef();
        HostLog("Env: 就绪，创建控制器");
        g_env->CreateCoreWebView2Controller(g_hwnd, new ControllerHandler());
        return S_OK;
    }
};

// ---------------------------------------------------------------------------
// 窗口
// ---------------------------------------------------------------------------
static std::wstring UserDataDir() {
    wchar_t local[MAX_PATH] = {0};
    if (FAILED(SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, 0, local))) {
        GetTempPathW(MAX_PATH, local);
    }
    std::wstring dir = std::wstring(local) + L"\\MIDI-Player-Host";
    CreateDirectoryW(dir.c_str(), nullptr);
    return dir;
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_SIZE:
            if (g_controller) {
                RECT rc;
                GetClientRect(hwnd, &rc);
                g_controller->put_Bounds(rc);
            }
            return 0;
        case WM_GETMINMAXINFO: {
            MINMAXINFO* info = (MINMAXINFO*)lParam;
            info->ptMinTrackSize.x = 900;
            info->ptMinTrackSize.y = 600;
            return 0;
        }
        case WM_TIMER:
            // 兜底：导航回调迟迟不来时也显示主界面
            if (wParam == 1 && g_splashVisible) {
                HostLog("启动画面超时，强制显示主界面");
                g_splashVisible = false;
                if (g_controller) g_controller->put_IsVisible(TRUE);
                KillTimer(hwnd, 1);
                InvalidateRect(hwnd, nullptr, TRUE);
            }
            return 0;
        case WM_CLOSE:
            g_config.Save();
            DestroyWindow(hwnd);
            return 0;
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
        case WM_ERASEBKGND: {
            RECT rc;
            GetClientRect(hwnd, &rc);
            HBRUSH brush = CreateSolidBrush(g_themeBg);
            FillRect((HDC)wParam, &rc, brush);
            DeleteObject(brush);
            return 1;
        }
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            // WebView2 就绪前：填主题底色并居中绘制应用图标
            if (g_splashVisible) {
                RECT rc;
                GetClientRect(hwnd, &rc);
                HBRUSH brush = CreateSolidBrush(g_themeBg);
                FillRect(hdc, &rc, brush);
                DeleteObject(brush);
                if (g_appIconBig) {
                    int size = 132;
                    DrawIconEx(hdc, (rc.right - size) / 2, (rc.bottom - size) / 2,
                               g_appIconBig, size, size, 0, nullptr, DI_NORMAL);
                }
            }
            EndPaint(hwnd, &ps);
            return 0;
        }
        default:
            return DefWindowProcW(hwnd, msg, wParam, lParam);
    }
}

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, LPWSTR, int) {
    // 单实例
    HANDLE mutex = CreateMutexW(nullptr, TRUE, L"MIDI-Player-Host-SingleInstance");
    if (mutex && GetLastError() == ERROR_ALREADY_EXISTS) {
        HWND existing = FindWindowW(L"MIDIPlayerHostWnd", kAppTitle);
        if (existing) {
            ShowWindow(existing, SW_RESTORE);
            SetForegroundWindow(existing);
        }
        return 0;
    }

    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

    HostLog("======== 启动 ========");
    if (!g_payload.Open()) {
        MessageBoxW(nullptr, L"资源包缺失或损坏（exe 未经打包脚本处理）。", kAppTitle, MB_ICONERROR);
        return 1;
    }
    g_config.Load();

    // 自检模式：只校验资源包内容，不启动界面（用于构建后自动验证）
    {
        int argc = 0;
        LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
        bool selfCheck = false;
        if (argv && argc >= 2 && wcscmp(argv[1], L"--selfcheck") == 0) selfCheck = true;
        if (argv) LocalFree(argv);
        if (selfCheck) {
            const char* required[] = {
                "assets/index.html", "assets/Tone.js", "assets/midi",
                "assets/app-icon.png", "assets/splash.html",
                "soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/C3.mp3",
                "WebView2Loader.dll",
            };
            int missing = 0;
            for (const char* name : required) {
                bool ok = g_payload.Contains(name);
                if (!ok) ++missing;
                HostLog("自检: %-58s %s", name, ok ? "OK" : "缺失");
            }
            HostLog("自检结果: %s（缺失 %d 项）", missing == 0 ? "通过" : "失败", missing);
            return missing == 0 ? 0 : 2;
        }
    }

    HMODULE loader = nullptr;
    if (!EnsureLoader(loader)) {
        MessageBoxW(nullptr, L"未能加载 WebView2Loader.dll（资源包不完整）。", kAppTitle, MB_ICONERROR);
        return 1;
    }

    // 主题 + 图标（图标资源是 seticon.py 写入的 RT_GROUP_ICON，ID 为 1）
    g_darkTheme = ResolveDarkTheme();
    g_themeBg = g_darkTheme ? RGB(32, 32, 32) : RGB(243, 243, 243);
    g_appIconBig = (HICON)LoadImageW(instance, MAKEINTRESOURCEW(1), IMAGE_ICON, 132, 132, LR_DEFAULTCOLOR);
    g_appIconSmall = (HICON)LoadImageW(instance, MAKEINTRESOURCEW(1), IMAGE_ICON,
                                       GetSystemMetrics(SM_CXSMICON), GetSystemMetrics(SM_CYSMICON), LR_DEFAULTCOLOR);
    if (!g_appIconBig) g_appIconBig = LoadIconW(nullptr, IDI_APPLICATION);
    if (!g_appIconSmall) g_appIconSmall = g_appIconBig;

    WNDCLASSEXW wc{};
    wc.cbSize = sizeof(wc);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WndProc;
    wc.hInstance = instance;
    wc.hCursor = LoadCursorW(nullptr, IDC_ARROW);
    wc.hIcon = g_appIconBig;
    wc.hIconSm = g_appIconSmall;
    wc.lpszClassName = L"MIDIPlayerHostWnd";
    wc.hbrBackground = CreateSolidBrush(g_themeBg);
    if (!RegisterClassExW(&wc)) {
        HostLog("窗口类注册失败");
        return 1;
    }

    double width = 1360, height = 745;
    g_config.GetNumber("windowWidth", width);
    g_config.GetNumber("windowHeight", height);
    if (width < 900 || width > 5120) width = 1360;
    if (height < 600 || height > 2880) height = 745;

    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);
    int x = (screenW - (int)width) / 2;
    int y = (screenH - (int)height) / 2;

    g_hwnd = CreateWindowExW(0, L"MIDIPlayerHostWnd", kAppTitle,
                             WS_OVERLAPPEDWINDOW, x, y, (int)width, (int)height,
                             nullptr, nullptr, instance, nullptr);
    if (!g_hwnd) {
        HostLog("窗口创建失败");
        return 1;
    }

    // 启动画面：先显示一个纯色窗口，WebView2 就绪后立即导航到界面
    ShowWindow(g_hwnd, SW_SHOW);
    UpdateWindow(g_hwnd);

    // 标题栏跟随主题 + 应用图标（含任务栏）
    BOOL darkMode = g_darkTheme ? TRUE : FALSE;
    DwmSetWindowAttribute(g_hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, &darkMode, sizeof(darkMode));
    DwmSetWindowAttribute(g_hwnd, 19 /*旧版 Windows 10*/, &darkMode, sizeof(darkMode));
    SendMessageW(g_hwnd, WM_SETICON, ICON_BIG, (LPARAM)g_appIconBig);
    SendMessageW(g_hwnd, WM_SETICON, ICON_SMALL, (LPARAM)g_appIconSmall);
    // 兜底：即使导航回调没回来，也在 4 秒后收起启动画面
    SetTimer(g_hwnd, 1, 4000, nullptr);

    std::wstring userData = UserDataDir();
    HostLog("创建 WebView2 环境（用户数据目录 %ls）", userData.c_str());
    HRESULT hr = g_createEnv(nullptr, userData.c_str(), nullptr, new EnvironmentHandler());
    if (FAILED(hr)) {
        HostLog("CreateCoreWebView2EnvironmentWithOptions 调用失败 0x%08lX", (unsigned long)hr);
        MessageBoxW(nullptr, L"无法初始化 WebView2。", kAppTitle, MB_ICONERROR);
        return 1;
    }
    HostLog("已发起环境创建，进入消息循环");

    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    if (g_controller) g_controller->Release();
    if (g_webview) g_webview->Release();
    if (g_env) g_env->Release();
    if (loader) FreeLibrary(loader);
    CoUninitialize();
    HostLog("======== 退出 ========");
    return 0;
}
