#pragma once
#include <Arduino.h>

struct UsageData {
  // Token hari ini (aggregate dari response)
  uint32_t inputTokensToday;
  uint32_t outputTokensToday;

  // Biaya (jika tersedia di API, atau 0)
  float costToday;
  float costMonthToDate;

  // Rate limit dari response headers
  uint32_t rateLimitTokensLimit;
  uint32_t rateLimitTokensRemaining;
  char     rateLimitReset[32];  // ISO 8601 string

  // Weekly — derived: total 7 hari terakhir dari data
  uint32_t tokensWeekly;

  // Top model
  char topModel[48];

  // Status
  bool   valid;
  char   errorMsg[64];
  time_t fetchedAt;
};

bool fetchUsageData(UsageData& out);
