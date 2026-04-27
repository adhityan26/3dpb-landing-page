#include "budget.h"
#include "../display.h"
#include "../config.h"
#include "../wifi_manager.h"
#include <Arduino.h>

void screenBudgetDraw(const UsageData& data) {
  displayClear();
  drawHeader("BUDGET");

  uint32_t used   = data.tokensMonthly;
  uint32_t budget = MONTHLY_BUDGET_TOKENS;
  float    pct    = (budget > 0) ? ((float)used / budget * 100.0f) : 0;

  uint16_t barColor = C_GREEN;
  if (pct > 80) barColor = C_RED;
  else if (pct > 50) barColor = C_YELLOW;

  // Label
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 20);
  tft.print("DIGUNAKAN BULAN INI");

  // Big number
  char usedBuf[16];
  if (used >= 1000000) snprintf(usedBuf, sizeof(usedBuf), "%.2fM", used / 1000000.0f);
  else                 snprintf(usedBuf, sizeof(usedBuf), "%.0fK", used / 1000.0f);

  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(4);
  tft.setCursor(8, 34);
  tft.print(usedBuf);

  // Sub: from budget
  char budgetBuf[16];
  if (budget >= 1000000) snprintf(budgetBuf, sizeof(budgetBuf), "%.0fM", budget / 1000000.0f);
  else                   snprintf(budgetBuf, sizeof(budgetBuf), "%.0fK", budget / 1000.0f);

  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(8, 82);
  tft.printf("dari %s token limit", budgetBuf);

  // Progress bar
  int barY = 96;
  tft.fillRect(4, barY, 312, 18, tft.color565(0, 13, 26));
  tft.drawRect(4, barY, 312, 18, C_DIM);
  int fillW = (int)(pct / 100.0f * 310);
  if (fillW > 310) fillW = 310;
  if (fillW > 0) tft.fillRect(5, barY + 1, fillW, 16, barColor);
  tft.setTextColor(TFT_WHITE, barColor);
  tft.setTextSize(1);
  tft.setCursor(140, barY + 5);
  tft.printf("%.0f%%", pct);

  // 3-column grid: SISA | RATA/HARI | PROYEKSI
  time_t now = (time_t)clockGetEpoch();
  struct tm* t = localtime(&now);
  int dayOfMonth = t->tm_mday;
  float rataHarian = (dayOfMonth > 0) ? ((float)used / dayOfMonth) : 0;
  int daysInMonth = 30;
  float proyeksi = rataHarian * daysInMonth;

  // Format helper
  auto fmtM = [](char* b, size_t l, float v) {
    if (v >= 1000000)     snprintf(b, l, "%.1fM", v / 1000000.0f);
    else if (v >= 1000)   snprintf(b, l, "%.0fK", v / 1000.0f);
    else                  snprintf(b, l, "%.0f",  v);
  };

  float sisa = (float)budget - (float)used;
  uint16_t bgGrid = tft.color565(0, 13, 26);
  int gx[] = { 4, 110, 216 };
  const char* labels[] = { "SISA", "RATA/HARI", "PROYEKSI" };
  float values[] = { sisa, rataHarian, proyeksi };
  uint16_t vColors[] = {
    (uint16_t)(sisa >= 0 ? C_GREEN : C_RED),
    C_YELLOW,
    (uint16_t)(proyeksi > budget ? C_RED : C_YELLOW)
  };

  for (int i = 0; i < 3; i++) {
    tft.fillRect(gx[i], 124, 102, 52, bgGrid);
    tft.drawRect(gx[i], 124, 102, 52, C_DIM);
    tft.setTextColor(C_DIM, bgGrid);
    tft.setTextSize(1);
    tft.setCursor(gx[i] + 4, 130);
    tft.print(labels[i]);
    tft.setTextColor(vColors[i], bgGrid);
    tft.setTextSize(2);
    tft.setCursor(gx[i] + 4, 146);
    char vBuf[12];
    fmtM(vBuf, sizeof(vBuf), values[i]);
    tft.print(vBuf);
  }

  // Reset date
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 186);
  int daysLeft = daysInMonth - dayOfMonth;
  tft.printf("reset: 1 bulan depan  %d hari lagi", daysLeft);
}
