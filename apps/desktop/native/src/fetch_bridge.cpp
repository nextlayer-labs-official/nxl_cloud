#include "fetch_bridge.h"

#include <atomic>
#include <condition_variable>
#include <mutex>
#include <stdexcept>
#include <unordered_map>

namespace skylyer {

namespace {

struct PendingRequest {
  std::mutex m;
  std::condition_variable cv;
  bool done = false;
  bool errored = false;
  std::string result;
  std::string error;
};

struct CallbackData {
  std::vector<std::string> args;
  uint64_t token;
};

std::mutex g_registryMutex;
std::unordered_map<uint64_t, std::shared_ptr<PendingRequest>> g_pending;
std::atomic<uint64_t> g_nextToken{1};

std::mutex g_providersMutex;
std::unordered_map<std::string, Napi::ThreadSafeFunction> g_providers;

std::shared_ptr<PendingRequest> TakePending(uint64_t token) {
  std::lock_guard<std::mutex> lock(g_registryMutex);
  auto it = g_pending.find(token);
  if (it == g_pending.end()) return nullptr;
  return it->second;
}

}  // namespace

void NativeBridge::SetProvider(Napi::Env env, const std::string& channel, Napi::Function jsHandler) {
  std::lock_guard<std::mutex> lock(g_providersMutex);
  auto it = g_providers.find(channel);
  if (it != g_providers.end()) it->second.Release();
  g_providers[channel] = Napi::ThreadSafeFunction::New(env, jsHandler, "SkylyerBridge:" + channel, 0, 1);
}

std::string NativeBridge::Call(const std::string& channel, const std::vector<std::string>& args, uint32_t timeoutMs) {
  Napi::ThreadSafeFunction tsfn;
  {
    std::lock_guard<std::mutex> lock(g_providersMutex);
    auto it = g_providers.find(channel);
    if (it == g_providers.end()) {
      throw std::runtime_error("NativeBridge: no provider registered for channel \"" + channel + "\"");
    }
    tsfn = it->second;
  }

  auto req = std::make_shared<PendingRequest>();
  uint64_t token = g_nextToken.fetch_add(1);
  {
    std::lock_guard<std::mutex> lock(g_registryMutex);
    g_pending[token] = req;
  }

  auto* data = new CallbackData{args, token};
  napi_status status = tsfn.BlockingCall(data, [](Napi::Env env, Napi::Function jsHandler, CallbackData* cbData) {
    std::vector<napi_value> jsArgs;
    for (const auto& arg : cbData->args) jsArgs.push_back(Napi::String::New(env, arg));
    jsArgs.push_back(Napi::Number::New(env, static_cast<double>(cbData->token)));
    jsHandler.Call(jsArgs);
    delete cbData;
  });

  if (status != napi_ok) {
    std::lock_guard<std::mutex> lock(g_registryMutex);
    g_pending.erase(token);
    throw std::runtime_error("NativeBridge: failed to schedule JS call on channel \"" + channel + "\"");
  }

  std::string result;
  bool timedOut, errored = false;
  std::string errorMessage;
  {
    std::unique_lock<std::mutex> lock(req->m);
    timedOut = !req->cv.wait_for(lock, std::chrono::milliseconds(timeoutMs), [&] { return req->done; });
    if (!timedOut) {
      errored = req->errored;
      result = req->result;
      errorMessage = req->error;
    }
  }

  {
    std::lock_guard<std::mutex> lock(g_registryMutex);
    g_pending.erase(token);
  }

  if (timedOut) throw std::runtime_error("NativeBridge: timed out waiting for channel \"" + channel + "\"");
  if (errored) throw std::runtime_error(errorMessage);
  return result;
}

void NativeBridge::Resolve(uint64_t token, const std::string& resultJson) {
  auto req = TakePending(token);
  if (!req) return;  // Already timed out on the native side; safe no-op.
  std::lock_guard<std::mutex> lock(req->m);
  req->result = resultJson;
  req->done = true;
  req->cv.notify_all();
}

void NativeBridge::Reject(uint64_t token, const std::string& message) {
  auto req = TakePending(token);
  if (!req) return;
  std::lock_guard<std::mutex> lock(req->m);
  req->errored = true;
  req->error = message;
  req->done = true;
  req->cv.notify_all();
}

}  // namespace skylyer
