// ============================================================================
//  MIDI 可视化播放器 —— C++ / WebView2 宿主（公共声明）
//
//  用原生宿主替代 Python + Flask + pywebview：
//    * 不启 HTTP 服务器：用 WebView2 的 WebResourceRequested 直接提供资源
//    * 不产生临时解压：assets 与 soundfonts 以 zip 形式追加在 exe 尾部，
//      运行时把 exe 映射进内存按需切片读取
//    * 配置仍写 HKCU\Software\MIDIPlayer\config，与旧版设置完全兼容
// ============================================================================
#pragma once

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX

#include <windows.h>
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

// ---------------- 字符串转换 ----------------
std::string WideToUtf8(const std::wstring& value);
std::wstring Utf8ToWide(const std::string& value);

// ---------------- 日志（写 %TEMP%\midi-player-host.log） ----------------
void HostLog(const char* format, ...);

// ---------------- 内嵌资源包 ----------------
struct PayloadEntry {
    uint64_t dataOffset = 0;  // 相对 zip 数据起点的偏移（stored 时即数据本身）
    uint64_t size = 0;        // 未压缩大小
    uint32_t localOffset = 0; // 本地文件头偏移
    uint16_t method = 0;      // 0 = stored，8 = deflate
};

class Payload {
public:
    // 定位并映射 exe 尾部追加的 zip
    bool Open();
    const PayloadEntry* Find(const std::string& name) const;
    bool Read(const std::string& name, std::vector<uint8_t>& out) const;
    uint64_t Size(const std::string& name) const;
    bool Contains(const std::string& name) const { return Find(name) != nullptr; }
    const std::wstring& ZipPath() const { return zipPath_; }

private:
    HANDLE file_ = INVALID_HANDLE_VALUE;
    HANDLE mapping_ = nullptr;
    const uint8_t* base_ = nullptr;
    const uint8_t* zip_ = nullptr;
    uint64_t zipSize_ = 0;
    std::unordered_map<std::string, PayloadEntry> entries_;
    std::wstring zipPath_;

    bool ParseCentralDirectory();
};

// ---------------- 配置（注册表 + 顶层 JSON 合并） ----------------
class Config {
public:
    void Load();
    bool Save() const;

    const std::string& Raw() const { return json_; }
    // 把一段 JSON 对象的顶层字段合并进现有配置并写回注册表
    void MergeAndSave(const std::string& patchJson);

    bool GetNumber(const std::string& key, double& out) const;
    bool GetString(const std::string& key, std::string& out) const;
    void SetNumber(const std::string& key, double value);

private:
    std::string json_ = "{}";
};

// 顶层键值合并（patch 覆盖 base 的同名键，其余保留）
std::string JsonMergeObject(const std::string& base, const std::string& patch);
bool JsonGetTopNumber(const std::string& json, const std::string& key, double& out);
bool JsonGetTopString(const std::string& json, const std::string& key, std::string& out);

// ---------------- 应用常量 ----------------
extern const wchar_t* kAppTitle;
extern const wchar_t* kRegistryPath;   // Software\MIDIPlayer
extern const wchar_t* kRegistryValue;  // config
extern const wchar_t* kVirtualHost;    // 前端页面使用的虚拟域名

// 当前版本号（自动更新比较用；发版时同步修改，可用编译参数覆盖以便测试）
#ifndef APP_VERSION
#define APP_VERSION L"2.1.0"
#endif
