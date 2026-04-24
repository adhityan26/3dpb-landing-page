#include "budget.h"
#include "../display.h"
#include "../config.h"
#include "../wifi_manager.h"
#include <Arduino.h>

void screenBudgetDraw(const UsageData& data) {
  displayClear();
  drawHeader("BUDGET");

  float spent   = data.costMonthToDate;
  float budget  = MONTHLY_BUDGET_USD;
  float sisa    = budget - spent;
  float pct     = (budget > 0) ? (spent / budget * 100.0f) : 0;

  // Progress bar color: green <50%, yellow 50-80%, red >80%
  uint16_t barColor = C_GREEN;
  if (pct > 80) barColor = C_RED;
  else if (pct > 50) barColor = C_YELLOW;

  // Label
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 20);
  tft.print("SPENT THIS MONTH");

  // Big number
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(4);
  tft.setCursor(8, 34);
  tft.printf("$%.2f", spent);

  // Sub: from budget
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(8, 82);
  tft.printf("dari $%.2f limit", budget);

  // Big progress bar
  int barY = 96;
  tft.fillRect(4, barY, 312, 18, tft.color565(26, 13, 0));
  tft.drawRect(4, barY, 312, 18, C_DIM);
  int fillW = (int)(pct / 100.0f * 310);
  if (fillW > 0) tft.fillRect(5, barY + 1, fillW, 16, barColor);
  // Percentage inside bar
  tft.setTextColor(TFT_WHITE, barColor);
  tft.setTextSize(1);
  tft.setCursor(140, barY + 5);
  tft.printf("%.0f%%", pct);

  // 3-column grid: SISA | RATA/HARI | PROYEKSI
  time_t now = (time_t)clockGetEpoch();
  struct tm* t = localtime(&now);
  int dayOfMonth = t->tm_mday;
  float rataHarian = (dayOfMonth > 0) ? (spent / dayOfMonth) : 0;
  int daysInMonth = 30;
  float proyeksi = rataHarian * daysInMonth;

  uint16_t bgGrid = tft.color565(17, 13, 0);
  int gx[] = {4, 110, 216};
  const char* labels[] = {"SISA", "RATA/HARI", "PROYEKSI"};
  float values[] = {sisa, rataHarian, proyeksi};
  uint16_t vColors[] = {C_GREEN, C_YELLOW, (proyeksi > budget ? C_RED : C_YELLOW)};

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
    tft.printf("$%.1f", values[i]);
  }

  // Reset date
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 186);
  int daysLeft = daysInMonth - dayOfMonth;
  tft.printf("reset: 1 bulan depan  %d hari lagi", daysLeft);
}
