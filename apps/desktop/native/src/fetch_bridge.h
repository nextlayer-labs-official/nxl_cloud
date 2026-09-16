#pragma once
#include <napi.h>

#include <string>
#include <vector>

namespace skylyer {

/**
 * Bridges native Cloud Filter callback threads to async JS work — the
 * only thing per callback that needs JS involvement (getDownloadUrl,
 * rename/move, trash). Each channel is set once from JS at startup;
 * `Call` blocks the calling native thread until the JS promise resolves
 * (or `timeoutMs` elapses). Arguments are passed as plain strings — one
 * JS call argument each — rather than an encoded blob, so no
 * escaping/parsing is needed on either side.
 */
class NativeBridge {
 public:
  // `jsHandler` is a JS function: (...args: string[], token: number) => void
  // — it must eventually call back `resolveBridgeCall`/`rejectBridgeCall`
  // (exposed in binding.cpp) with that same token once its own async work
  // (typically an ApiClient call) settles.
  static void SetProvider(Napi::Env env, const std::string& channel, Napi::Function jsHandler);

  // Blocks the calling (native callback) thread. Returns the string passed
  // to `resolveBridgeCall`, or throws std::runtime_error on timeout,
  // JS-side rejection, or a missing provider for `channel`.
  static std::string Call(const std::string& channel, const std::vector<std::string>& args, uint32_t timeoutMs = 30000);

  static void Resolve(uint64_t token, const std::string& result);
  static void Reject(uint64_t token, const std::string& message);
};

}  // namespace skylyer
