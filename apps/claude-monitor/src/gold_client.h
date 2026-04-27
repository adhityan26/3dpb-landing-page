#pragma once
#include <Arduino.h>

#define GOLD_HISTORY_MAX 30

struct GoldPrice {
  uint32_t buy;
  uint32_t sell;
  char     date[8];  // "25/04"
};

struct GoldData {
  GoldPrice current;
  GoldPrice history[GOLD_HISTORY_MAX];
  uint8_t   histCount;
  bool      valid;
  time_t    fetchedAt;
};

bool fetchGoldData(GoldData& out);
