// ============================================================================
//  内嵌资源包（zip 追加在 exe 尾部）+ 注册表配置
// ============================================================================
#include "host.h"

#include <shlwapi.h>
#include <cstdarg>
#include <cstdio>
#include <cstring>

#pragma comment(lib, "shlwapi.lib")

// ---------------------------------------------------------------------------
// 尾部布局：[exe 原始内容][zip 数据][uint64 zipSize][uint64 zipOffset][8B 魔数]
// ---------------------------------------------------------------------------
static const char kMagic[8] = {'M', 'I', 'D', 'I', 'P', 'A', 'Y', '1'};
static const size_t kFooterSize = sizeof(uint64_t) * 2 + 8;

#define SIG_EOCD 0x06054b50u
#define SIG_CENTRAL 0x02014b50u
#define SIG_LOCAL 0x04034b50u

// ---------------------------------------------------------------------------
// 字符串
// ---------------------------------------------------------------------------
std::string WideToUtf8(const std::wstring& value) {
    if (value.empty()) return std::string();
    int need = WideCharToMultiByte(CP_UTF8, 0, value.c_str(), (int)value.size(), nullptr, 0, nullptr, nullptr);
    std::string out((size_t)need, '\0');
    WideCharToMultiByte(CP_UTF8, 0, value.c_str(), (int)value.size(), &out[0], need, nullptr, nullptr);
    return out;
}

std::wstring Utf8ToWide(const std::string& value) {
    if (value.empty()) return std::wstring();
    int need = MultiByteToWideChar(CP_UTF8, 0, value.c_str(), (int)value.size(), nullptr, 0);
    std::wstring out((size_t)need, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, value.c_str(), (int)value.size(), &out[0], need);
    return out;
}

// ---------------------------------------------------------------------------
// 日志
// ---------------------------------------------------------------------------
void HostLog(const char* format, ...) {
    // 优先用 LOCALAPPDATA，其次 TEMP，最后 exe 所在目录
    wchar_t dir[MAX_PATH] = {0};
    if (GetEnvironmentVariableW(L"LOCALAPPDATA", dir, MAX_PATH) == 0) {
        if (!GetTempPathW(MAX_PATH, dir)) {
            GetModuleFileNameW(nullptr, dir, MAX_PATH);
            std::wstring self(dir);
            size_t pos = self.find_last_of(L'\\');
            if (pos == std::wstring::npos) return;
            std::wstring folder = self.substr(0, pos);
            if (folder.size() >= MAX_PATH) return;
            wcsncpy(dir, folder.c_str(), MAX_PATH - 1);
            dir[MAX_PATH - 1] = 0;
        }
    }
    std::wstring path = std::wstring(dir) + L"\\midi-player-host.log";

    char buffer[2048];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);

    FILE* fp = nullptr;
    if (_wfopen_s(&fp, path.c_str(), L"a, ccs=UTF-8") != 0 || !fp) return;
    SYSTEMTIME st;
    GetLocalTime(&st);
    fwprintf(fp, L"[%02d:%02d:%02d] %hs\n", st.wHour, st.wMinute, st.wSecond, buffer);
    fclose(fp);
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------
static uint16_t Rd16(const uint8_t* p) { return (uint16_t)(p[0] | (p[1] << 8)); }
static uint32_t Rd32(const uint8_t* p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}
static uint64_t Rd64(const uint8_t* p) {
    return (uint64_t)Rd32(p) | ((uint64_t)Rd32(p + 4) << 32);
}

bool Payload::Open() {
    wchar_t exePath[MAX_PATH] = {0};
    if (!GetModuleFileNameW(nullptr, exePath, MAX_PATH)) {
        HostLog("Payload: GetModuleFileName 失败 (%lu)", GetLastError());
        return false;
    }
    zipPath_ = exePath;

    file_ = CreateFileW(exePath, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                        OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file_ == INVALID_HANDLE_VALUE) {
        HostLog("Payload: 打开 exe 失败");
        return false;
    }

    LARGE_INTEGER size{};
    if (!GetFileSizeEx(file_, &size) || size.QuadPart < (LONGLONG)kFooterSize) {
        HostLog("Payload: exe 太小，未附加资源包");
        return false;
    }

    uint8_t footer[kFooterSize];
    LARGE_INTEGER pos{};
    pos.QuadPart = size.QuadPart - (LONGLONG)kFooterSize;
    DWORD read = 0;
    if (!SetFilePointerEx(file_, pos, nullptr, FILE_BEGIN) ||
        !ReadFile(file_, footer, (DWORD)kFooterSize, &read, nullptr) || read != kFooterSize) {
        HostLog("Payload: 读取尾部失败");
        return false;
    }
    if (memcmp(footer + 16, kMagic, 8) != 0) {
        HostLog("Payload: 尾部魔数不匹配（exe 未经打包脚本处理）");
        return false;
    }

    uint64_t zipSize = Rd64(footer);
    uint64_t zipOffset = Rd64(footer + 8);
    if (zipOffset + zipSize + kFooterSize != (uint64_t)size.QuadPart) {
        HostLog("Payload: 偏移不匹配 (offset=%llu size=%llu file=%lld)", zipSize, zipOffset, size.QuadPart);
        return false;
    }

    mapping_ = CreateFileMappingW(file_, nullptr, PAGE_READONLY, 0, 0, nullptr);
    if (!mapping_) {
        HostLog("Payload: CreateFileMapping 失败");
        return false;
    }
    base_ = (const uint8_t*)MapViewOfFile(mapping_, FILE_MAP_READ, 0, 0, 0);
    if (!base_) {
        HostLog("Payload: MapViewOfFile 失败");
        return false;
    }

    zip_ = base_ + zipOffset;
    zipSize_ = zipSize;
    HostLog("Payload: 已映射资源包 %llu MB", zipSize / 1024 / 1024);
    return ParseCentralDirectory();
}

bool Payload::ParseCentralDirectory() {
    if (zipSize_ < 22) return false;

    // 从尾部向前找 EOCD
    uint64_t scanLimit = zipSize_ > 65557 ? zipSize_ - 65557 : 0;
    int64_t eocd = -1;
    for (int64_t i = (int64_t)zipSize_ - 22; i >= (int64_t)scanLimit; --i) {
        if (Rd32(zip_ + i) == SIG_EOCD) { eocd = i; break; }
    }
    if (eocd < 0) {
        HostLog("Payload: 未找到 EOCD");
        return false;
    }

    uint32_t count = Rd16(zip_ + eocd + 10);
    uint32_t centralOffset = Rd32(zip_ + eocd + 16);
    uint32_t cursor = centralOffset;

    for (uint32_t i = 0; i < count; ++i) {
        if (cursor + 46 > zipSize_ || Rd32(zip_ + cursor) != SIG_CENTRAL) {
            HostLog("Payload: 中央目录第 %u 项损坏", i);
            return false;
        }
        uint16_t method = Rd16(zip_ + cursor + 10);
        uint32_t compSize = Rd32(zip_ + cursor + 20);
        uint32_t uncompSize = Rd32(zip_ + cursor + 24);
        uint16_t nameLen = Rd16(zip_ + cursor + 28);
        uint16_t extraLen = Rd16(zip_ + cursor + 30);
        uint16_t commentLen = Rd16(zip_ + cursor + 32);
        uint32_t localOffset = Rd32(zip_ + cursor + 42);

        std::string name((const char*)(zip_ + cursor + 46), nameLen);

        // 从本地头算出真实数据偏移
        uint64_t dataOffset = 0;
        if (localOffset + 30 <= zipSize_ && Rd32(zip_ + localOffset) == SIG_LOCAL) {
            uint16_t localNameLen = Rd16(zip_ + localOffset + 26);
            uint16_t localExtraLen = Rd16(zip_ + localOffset + 28);
            dataOffset = (uint64_t)localOffset + 30 + localNameLen + localExtraLen;
        }

        PayloadEntry entry;
        entry.dataOffset = dataOffset;
        entry.size = method == 0 ? uncompSize : compSize;
        entry.localOffset = localOffset;
        entry.method = method;
        entries_[name] = entry;

        cursor += 46 + nameLen + extraLen + commentLen;
    }

    HostLog("Payload: 解析出 %zu 个资源条目", entries_.size());
    return true;
}

const PayloadEntry* Payload::Find(const std::string& name) const {
    auto it = entries_.find(name);
    return it == entries_.end() ? nullptr : &it->second;
}

bool Payload::Read(const std::string& name, std::vector<uint8_t>& out) const {
    const PayloadEntry* entry = Find(name);
    if (!entry) return false;
    if (entry->method != 0) {
        HostLog("Payload: 条目 %s 使用 deflate，未支持", name.c_str());
        return false;
    }
    if (entry->dataOffset + entry->size > zipSize_) return false;

    out.resize((size_t)entry->size);
    if (entry->size) memcpy(out.data(), zip_ + entry->dataOffset, (size_t)entry->size);
    return true;
}

uint64_t Payload::Size(const std::string& name) const {
    const PayloadEntry* entry = Find(name);
    return entry ? entry->size : 0;
}

// ---------------------------------------------------------------------------
// 顶层 JSON 合并
// ---------------------------------------------------------------------------
static void SkipWs(const std::string& s, size_t& i) {
    while (i < s.size() && (s[i] == ' ' || s[i] == '\t' || s[i] == '\r' || s[i] == '\n')) ++i;
}

// 从 i 处读取一个 JSON 值，返回其原始文本
static bool ReadValue(const std::string& s, size_t& i, std::string& out) {
    SkipWs(s, i);
    if (i >= s.size()) return false;
    size_t start = i;
    char c = s[i];
    if (c == '"') {
        ++i;
        while (i < s.size()) {
            if (s[i] == '\\') { i += 2; continue; }
            if (s[i] == '"') { ++i; break; }
            ++i;
        }
        out = s.substr(start, i - start);
        return true;
    }
    if (c == '{' || c == '[') {
        char open = c, close = (c == '{') ? '}' : ']';
        int depth = 0;
        bool inStr = false;
        while (i < s.size()) {
            char ch = s[i];
            if (inStr) {
                if (ch == '\\') { i += 2; continue; }
                if (ch == '"') inStr = false;
            } else {
                if (ch == '"') inStr = true;
                else if (ch == open) ++depth;
                else if (ch == close) { --depth; if (depth == 0) { ++i; break; } }
            }
            ++i;
        }
        out = s.substr(start, i - start);
        return true;
    }
    while (i < s.size() && s[i] != ',' && s[i] != '}' && s[i] != ']') ++i;
    out = s.substr(start, i - start);
    while (!out.empty() && (out.back() == ' ' || out.back() == '\n' || out.back() == '\r' || out.back() == '\t')) out.pop_back();
    return !out.empty();
}

static bool ParseTopLevel(const std::string& json, std::vector<std::pair<std::string, std::string>>& out) {
    size_t i = 0;
    SkipWs(json, i);
    if (i >= json.size() || json[i] != '{') return false;
    ++i;
    while (true) {
        SkipWs(json, i);
        if (i >= json.size()) break;
        if (json[i] == '}') break;
        if (json[i] == ',') { ++i; continue; }
        if (json[i] != '"') break;

        std::string keyText;
        if (!ReadValue(json, i, keyText)) break;
        std::string key = keyText.substr(1, keyText.size() >= 2 ? keyText.size() - 2 : 0);

        SkipWs(json, i);
        if (i >= json.size() || json[i] != ':') break;
        ++i;

        std::string value;
        if (!ReadValue(json, i, value)) break;
        out.emplace_back(key, value);
    }
    return true;
}

std::string JsonMergeObject(const std::string& base, const std::string& patch) {
    std::vector<std::pair<std::string, std::string>> baseItems, patchItems;
    if (!ParseTopLevel(base, baseItems)) baseItems.clear();
    if (!ParseTopLevel(patch, patchItems)) return base;

    std::string result = "{";
    bool first = true;
    auto append = [&](const std::string& key, const std::string& value) {
        if (!first) result += ", ";
        first = false;
        result += "\"" + key + "\": " + value;
    };

    for (auto& item : baseItems) {
        const std::string* value = &item.second;
        for (auto& p : patchItems) {
            if (p.first == item.first) { value = &p.second; break; }
        }
        append(item.first, *value);
    }
    for (auto& p : patchItems) {
        bool exists = false;
        for (auto& b : baseItems) {
            if (b.first == p.first) { exists = true; break; }
        }
        if (!exists) append(p.first, p.second);
    }
    result += "}";
    return result;
}

bool JsonGetTopNumber(const std::string& json, const std::string& key, double& out) {
    std::vector<std::pair<std::string, std::string>> items;
    if (!ParseTopLevel(json, items)) return false;
    for (auto& item : items) {
        if (item.first == key) {
            try {
                out = std::stod(item.second);
                return true;
            } catch (...) {
                return false;
            }
        }
    }
    return false;
}

bool JsonGetTopString(const std::string& json, const std::string& key, std::string& out) {
    std::vector<std::pair<std::string, std::string>> items;
    if (!ParseTopLevel(json, items)) return false;
    for (auto& item : items) {
        if (item.first == key) {
            const std::string& v = item.second;
            if (v.size() >= 2 && v.front() == '"' && v.back() == '"') out = v.substr(1, v.size() - 2);
            else out = v;
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Config（HKCU\Software\MIDIPlayer\config）
// ---------------------------------------------------------------------------
void Config::Load() {
    HKEY key = nullptr;
    if (RegOpenKeyExW(HKEY_CURRENT_USER, kRegistryPath, 0, KEY_READ, &key) == ERROR_SUCCESS) {
        wchar_t buffer[8192] = {0};
        DWORD size = sizeof(buffer);
        DWORD type = 0;
        if (RegQueryValueExW(key, kRegistryValue, nullptr, &type, (LPBYTE)buffer, &size) == ERROR_SUCCESS) {
            json_ = WideToUtf8(buffer);
            if (json_.empty()) json_ = "{}";
        }
        RegCloseKey(key);
    }
    HostLog("Config: 载入 %zu 字节", json_.size());
}

bool Config::Save() const {
    HKEY key = nullptr;
    if (RegCreateKeyExW(HKEY_CURRENT_USER, kRegistryPath, 0, nullptr, 0, KEY_WRITE, nullptr, &key, nullptr) != ERROR_SUCCESS) {
        HostLog("Config: 无法创建注册表项");
        return false;
    }
    std::wstring wide = Utf8ToWide(json_);
    LONG rc = RegSetValueExW(key, kRegistryValue, 0, REG_SZ, (const BYTE*)wide.c_str(),
                             (DWORD)((wide.size() + 1) * sizeof(wchar_t)));
    RegCloseKey(key);
    if (rc != ERROR_SUCCESS) {
        HostLog("Config: 写入失败 (%ld)", rc);
        return false;
    }
    return true;
}

void Config::MergeAndSave(const std::string& patchJson) {
    json_ = JsonMergeObject(json_, patchJson);
    Save();
}

bool Config::GetNumber(const std::string& key, double& out) const {
    return JsonGetTopNumber(json_, key, out);
}

bool Config::GetString(const std::string& key, std::string& out) const {
    return JsonGetTopString(json_, key, out);
}

void Config::SetNumber(const std::string& key, double value) {
    char buffer[64];
    snprintf(buffer, sizeof(buffer), "%.0f", value);
    MergeAndSave(std::string("{\"") + key + "\": " + buffer + "}");
}
