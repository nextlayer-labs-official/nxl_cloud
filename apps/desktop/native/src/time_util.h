#pragma once
#include <windows.h>

#include <cstdint>

namespace skylyer {

// FILE_BASIC_INFO's timestamp fields (used by CF_FS_METADATA) are
// LARGE_INTEGER, not the classic two-DWORD FILETIME struct — both represent
// the same 100ns-tick-since-1601 value, just packed differently. Unix epoch
// (1970-01-01) is 116444736000000000 of those ticks after 1601-01-01.
constexpr int64_t kUnixEpochAsFileTimeTicks = 116444736000000000LL;

inline LARGE_INTEGER UnixMsToFileTime(int64_t unixMs) {
  LARGE_INTEGER li;
  li.QuadPart = unixMs * 10000LL + kUnixEpochAsFileTimeTicks;
  return li;
}

inline int64_t FileTimeToUnixMs(const FILETIME& ft) {
  ULARGE_INTEGER li;
  li.LowPart = ft.dwLowDateTime;
  li.HighPart = ft.dwHighDateTime;
  return (static_cast<int64_t>(li.QuadPart) - kUnixEpochAsFileTimeTicks) / 10000LL;
}

}  // namespace skylyer
