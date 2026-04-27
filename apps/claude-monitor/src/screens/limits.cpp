#include "limits.h"
#include "../display.h"
#include "../config.h"
#include "../wifi_manager.h"
#include <Arduino.h>

static void drawProgressBar(int x, int y, int w, int h,
                             uint32_t used, uint32_t total,
                             uint16_t fillColor, uint16_t bgColor) {
  tft.fillRect(x, y, w, h, bgColor);
  tft.drawRect(x, y, w, h, C_DIM);
  if (total > 0) {
    int fillW = (int)((float)used / total * (w - 2));
    if (fillW > w - 2) fillW = w - 2;
    if (fillW > 0) tft.fillRect(x + 1, y + 1, fillW, h - 2, fillColor);
  }
}

static void fmtTokens(char* buf, size_t len, uint32_t n) {
  if (n >= 1000000) snprintf(buf, len, "%.1fM", n / 1000000.0f);
  else              snprintf(buf, len, "%.0fK", n / 1000.0f);
}

void screenLimitsDraw(const UsageData& data) {
  displayClear();

  // Header: tanggal kiri, jam kanan
  tft.setTextColor(TFT_WHITE, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 4);
  tft.print(clockGetDate());
  String t = clockGetTime().substring(0, 5);
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setCursor(320 - (int)t.length() * 6 - 4, 4);
  tft.print(t);
  tft.drawLine(0, 13, 319, 13, tft.color565(30, 30, 40));

  uint16_t bgToday = tft.color565(10, 26, 10);
  uint16_t bgWk    = tft.color565(10, 10, 26);

  // ── Today token breakdown ──────────────────────────────
  tft.fillRect(4, 20, 312, 86, bgToday);
  tft.drawRect(4, 20, 312, 86, tft.color565(26, 60, 26));

  tft.setTextColor(C_DIM, bgToday);
  tft.setTextSize(1);
  tft.setCursor(10, 26);
  tft.print("HARI INI");

  // 4 columns: INPUT | OUTPUT | CACHE | SESI
  const char*  labels[]  = { "INPUT", "OUTPUT", "CACHE", "SESI" };
  uint32_t     vals[]    = {
    data.inputTokensToday,
    data.outputTokensToday,
    data.cacheReadToday,
    data.sessionsToday
  };
  uint16_t     colors[]  = { C_GREEN, C_YELLOW, tft.color565(0, 200, 255), tft.color565(255, 150, 0) };
  int          gx[]      = { 8, 88, 168, 248 };

  for (int i = 0; i < 4; i++) {
    tft.setTextColor(C_DIM, bgToday);
    tft.setTextSize(1);
    tft.setCursor(gx[i], 38);
    tft.print(labels[i]);

    tft.setTextColor(colors[i], bgToday);
    tft.setTextSize(2);
    tft.setCursor(gx[i], 52);

    if (i == 3) {
      // sessions: just a number
      tft.print(vals[i]);
    } else {
      char buf[12];
      fmtTokens(buf, sizeof(buf), vals[i]);
      tft.print(buf);
    }
  }

  // Cache creation (smaller, below cache)
  tft.setTextColor(C_DIM, bgToday);
  tft.setTextSize(1);
  tft.setCursor(168, 74);
  char cBuf[12];
  fmtTokens(cBuf, sizeof(cBuf), data.cacheCreationToday);
  tft.printf("+%s wr", cBuf);

  // ── Weekly ─────────────────────────────────────────────
  tft.fillRect(4, 114, 312, 86, bgWk);
  tft.drawRect(4, 114, 312, 86, tft.color565(26, 26, 60));

  tft.setTextColor(C_DIM, bgWk);
  tft.setTextSize(1);
  tft.setCursor(10, 120);
  tft.print("MINGGUAN");
  tft.setCursor(200, 120);
  tft.print("reset: Sen");

  drawProgressBar(10, 136, 300, 12, data.tokensWeekly, WEEKLY_TOKEN_LIMIT, C_BLUE_WK, tft.color565(13, 13, 26));

  tft.setTextColor(C_BLUE_WK, bgWk);
  tft.setTextSize(2);
  tft.setCursor(10, 154);
  char wkBuf[12];
  fmtTokens(wkBuf, sizeof(wkBuf), data.tokensWeekly);
  tft.print(wkBuf);
  tft.setTextColor(C_DIM, bgWk);
  tft.setTextSize(1);
  tft.print(" tokens");
  tft.setCursor(10, 176);
  tft.printf("limit: %.0fM tokens", (float)WEEKLY_TOKEN_LIMIT / 1000000.0f);

  // ── Top model ─────────────────────────────────────────
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 208);
  tft.print("TOP MODEL: ");
  tft.setTextColor(tft.color565(204, 136, 255), C_BG);
  tft.print(data.topModel);
}
