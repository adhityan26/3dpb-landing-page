#pragma once
#include <Arduino.h>

// Payload JSON dari MQTT topic claude/usage/total:
// {
//   "inputTokensToday": 150000,
//   "outputTokensToday": 45000,
//   "cacheReadToday": 2000000,
//   "cacheCreationToday": 100000,
//   "tokensWeekly": 500000,
//   "tokensMonthly": 1500000,
//   "sessionsToday": 3,
//   "topModel": "claude-sonnet-4-6",
//   "ts": 1777065699
// }

struct UsageData {
  uint32_t inputTokensToday;
  uint32_t outputTokensToday;
  uint32_t cacheReadToday;
  uint32_t cacheCreationToday;
  uint32_t tokensWeekly;
  uint32_t tokensMonthly;
  uint32_t sessionsToday;
  char     topModel[48];
  bool     valid;
  time_t   updatedAt;
};

bool fetchUsageData(UsageData& out);
void mqttLoop(UsageData& out);
bool mqttConnected();
bool printersUpdated();  // true sekali setelah data printer baru tiba
