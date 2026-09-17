#include <napi.h>

#include <string>
#include <vector>

#include "fetch_bridge.h"
#include "local_changes.h"
#include "placeholders.h"
#include "reconcile.h"
#include "string_util.h"
#include "sync_root.h"

namespace {

std::wstring ToWString(const Napi::Value& value) {
  std::u16string u16 = value.As<Napi::String>().Utf16Value();
  return std::wstring(u16.begin(), u16.end());
}

std::string ToStdString(const Napi::Value& value) {
  return value.As<Napi::String>().Utf8Value();
}

Napi::Value RegisterSyncRoot(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4 || !info[0].IsString() || !info[1].IsString() || !info[2].IsString() || !info[3].IsString()) {
    Napi::TypeError::New(env, "registerSyncRoot(rootPath, syncRootId, displayName, iconPath) expects four strings")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::RegisterSyncRoot(ToWString(info[0]), ToWString(info[1]), ToWString(info[2]), ToWString(info[3]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value UnregisterSyncRoot(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "unregisterSyncRoot(syncRootId) expects one string").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::UnregisterSyncRoot(ToWString(info[0]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value CreatePlaceholders(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "createPlaceholders(parentPath, items[]) expects a string and an array")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::wstring parentPath = ToWString(info[0]);
  Napi::Array jsItems = info[1].As<Napi::Array>();
  std::vector<skylyer::PlaceholderItem> items;
  items.reserve(jsItems.Length());

  for (uint32_t i = 0; i < jsItems.Length(); i++) {
    Napi::Value v = jsItems[i];
    if (!v.IsObject()) continue;
    Napi::Object obj = v.As<Napi::Object>();

    skylyer::PlaceholderItem item;
    item.id = ToWString(obj.Get("id"));
    item.name = ToWString(obj.Get("name"));
    item.isFolder = obj.Get("isFolder").As<Napi::Boolean>().Value();
    item.sizeBytes = static_cast<uint64_t>(obj.Get("sizeBytes").As<Napi::Number>().Int64Value());
    item.createdAtUnixMs = obj.Get("createdAtUnixMs").As<Napi::Number>().Int64Value();
    item.updatedAtUnixMs = obj.Get("updatedAtUnixMs").As<Napi::Number>().Int64Value();
    items.push_back(std::move(item));
  }

  try {
    skylyer::CreatePlaceholders(parentPath, items);
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value ConnectSyncRoot(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "connectSyncRoot(rootPath) expects one string").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::ConnectSyncRoot(ToWString(info[0]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value DisconnectSyncRoot(const Napi::CallbackInfo& info) {
  skylyer::DisconnectSyncRoot();
  return info.Env().Undefined();
}

Napi::Value SetBridgeProvider(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsFunction()) {
    Napi::TypeError::New(env, "setBridgeProvider(channel, fn) expects a string and a function")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  skylyer::NativeBridge::SetProvider(env, ToStdString(info[0]), info[1].As<Napi::Function>());
  return env.Undefined();
}

Napi::Value ResolveBridgeCall(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
    Napi::TypeError::New(env, "resolveBridgeCall(token, result) expects a number and a string")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  uint64_t token = static_cast<uint64_t>(info[0].As<Napi::Number>().Int64Value());
  skylyer::NativeBridge::Resolve(token, ToStdString(info[1]));
  return env.Undefined();
}

Napi::Value RejectBridgeCall(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
    Napi::TypeError::New(env, "rejectBridgeCall(token, message) expects a number and a string")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  uint64_t token = static_cast<uint64_t>(info[0].As<Napi::Number>().Int64Value());
  skylyer::NativeBridge::Reject(token, ToStdString(info[1]));
  return env.Undefined();
}

Napi::Value StartWatchingLocalChanges(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "startWatchingLocalChanges(rootPath) expects one string").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::StartWatchingLocalChanges(ToWString(info[0]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value StopWatchingLocalChanges(const Napi::CallbackInfo& info) {
  skylyer::StopWatchingLocalChanges();
  return info.Env().Undefined();
}

Napi::Value ReadLocalPlaceholderTree(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "readLocalPlaceholderTree(rootPath) expects one string").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::vector<skylyer::LocalPlaceholderEntry> entries;
  try {
    entries = skylyer::ReadLocalPlaceholderTree(ToWString(info[0]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Array result = Napi::Array::New(env, entries.size());
  for (size_t i = 0; i < entries.size(); i++) {
    const auto& entry = entries[i];
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("path", Napi::String::New(env, skylyer::ToUtf8(entry.path)));
    obj.Set("id", Napi::String::New(env, skylyer::ToUtf8(entry.id)));
    obj.Set("isFolder", Napi::Boolean::New(env, entry.isFolder));
    obj.Set("sizeBytes", Napi::Number::New(env, static_cast<double>(entry.sizeBytes)));
    obj.Set("lastWriteTimeUnixMs", Napi::Number::New(env, static_cast<double>(entry.lastWriteTimeUnixMs)));
    result.Set(static_cast<uint32_t>(i), obj);
  }
  return result;
}

Napi::Value RenameLocalPath(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "renameLocalPath(oldPath, newPath) expects two strings").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::RenameLocalPath(ToWString(info[0]), ToWString(info[1]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value DeleteLocalPath(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBoolean()) {
    Napi::TypeError::New(env, "deleteLocalPath(path, isFolder) expects a string and a boolean")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::DeleteLocalPath(ToWString(info[0]), info[1].As<Napi::Boolean>().Value());
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value MarkLocalPathInSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "markLocalPathInSync(path) expects one string").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::MarkLocalPathInSync(ToWString(info[0]));
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Value DehydrateAndRefreshPlaceholder(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsString() || !info[1].IsNumber() || !info[2].IsNumber()) {
    Napi::TypeError::New(env, "dehydrateAndRefreshPlaceholder(path, sizeBytes, updatedAtUnixMs) expects a string and two numbers")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  try {
    skylyer::DehydrateAndRefreshPlaceholder(ToWString(info[0]),
                                             static_cast<uint64_t>(info[1].As<Napi::Number>().Int64Value()),
                                             info[2].As<Napi::Number>().Int64Value());
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
  }
  return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("registerSyncRoot", Napi::Function::New(env, RegisterSyncRoot));
  exports.Set("unregisterSyncRoot", Napi::Function::New(env, UnregisterSyncRoot));
  exports.Set("createPlaceholders", Napi::Function::New(env, CreatePlaceholders));
  exports.Set("connectSyncRoot", Napi::Function::New(env, ConnectSyncRoot));
  exports.Set("disconnectSyncRoot", Napi::Function::New(env, DisconnectSyncRoot));
  exports.Set("setBridgeProvider", Napi::Function::New(env, SetBridgeProvider));
  exports.Set("resolveBridgeCall", Napi::Function::New(env, ResolveBridgeCall));
  exports.Set("rejectBridgeCall", Napi::Function::New(env, RejectBridgeCall));
  exports.Set("startWatchingLocalChanges", Napi::Function::New(env, StartWatchingLocalChanges));
  exports.Set("stopWatchingLocalChanges", Napi::Function::New(env, StopWatchingLocalChanges));
  exports.Set("readLocalPlaceholderTree", Napi::Function::New(env, ReadLocalPlaceholderTree));
  exports.Set("renameLocalPath", Napi::Function::New(env, RenameLocalPath));
  exports.Set("deleteLocalPath", Napi::Function::New(env, DeleteLocalPath));
  exports.Set("dehydrateAndRefreshPlaceholder", Napi::Function::New(env, DehydrateAndRefreshPlaceholder));
  exports.Set("markLocalPathInSync", Napi::Function::New(env, MarkLocalPathInSync));
  return exports;
}

}  // namespace

NODE_API_MODULE(desktop_native, Init)
