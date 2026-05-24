#include "overview.h"
#include "../display.h"
#include "../config.h"
#include "../wifi_manager.h"
#include <Arduino.h>

static void formatTokens(uint32_t t, char* buf, size_t len) {
  if (t >= 1000000)      snprintf(buf, len, "%.1fM", t / 1000000.0f);
  else if (t >= 1000)    snprintf(buf, len, "%.0fK", t / 1000.0f);
  else                   snprintf(buf, len, "%u", t);
}

static void formatPct(uint32_t used, uint32_t limit, char* buf, size_t len) {
  if (limit == 0) snprintf(buf, len, "--%%");
  else            snprintf(buf, len, "%u%%", (uint32_t)((uint64_t)used * 100 / limit));
}

void screenOverviewDraw(const UsageData& data, const String& timeStr, const String& dateStr) {
  displayClear();

  char lastUpd[9] = "--:--";
  if (data.valid) strlcpy(lastUpd, timeStr.c_str(), sizeof(lastUpd));
  drawHeader(String(lastUpd));

  drawClockStrip(timeStr, dateStr);

  uint16_t bgStats = C_BG;

  // Divider vertikal di tengah x=160
  tft.drawLine(160, 60, 160, 184, C_DIM);

  // Kiri: TOKENS HARI INI
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(8, 64);
  tft.print("TOKENS HARI INI");

  char tkBuf[10];
  uint32_t totalTok = data.inputTokensToday + data.outputTokensToday;
  formatTokens(totalTok, tkBuf, sizeof(tkBuf));
  tft.setTextColor(C_GREEN, bgStats);
  tft.setTextSize(4);
  tft.setCursor(8, 80);
  tft.print(tkBuf);

  char inBuf[10], outBuf[10];
  formatTokens(data.inputTokensToday, inBuf, sizeof(inBuf));
  formatTokens(data.outputTokensToday, outBuf, sizeof(outBuf));
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(8, 140);
  tft.printf("in:%s out:%s", inBuf, outBuf);

  // Kanan: CACHE HARI INI
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(168, 64);
  tft.print("CACHE HARI INI");

  char cBuf[10];
  formatTokens(data.cacheReadToday, cBuf, sizeof(cBuf));
  tft.setTextColor(tft.color565(0, 200, 255), bgStats);
  tft.setTextSize(3);
  tft.setCursor(168, 80);
  tft.print(cBuf);

  char cwBuf[10];
  formatTokens(data.cacheCreationToday, cwBuf, sizeof(cwBuf));
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(168, 140);
  tft.printf("wr:%s", cwBuf);

  // ── Status bar ─────────────────────────────────────────
  uint16_t bgBar = tft.color565(10, 26, 10);
  tft.fillRect(0, 186, SCREEN_W, 54, bgBar);
  tft.drawLine(0, 185, SCREEN_W-1, 185, C_DIM);

  // SESI
  tft.setTextColor(C_DIM, bgBar);
  tft.setTextSize(1);
  tft.setCursor(4, 192);
  tft.print("SESI");
  tft.setTextColor(C_GREEN, bgBar);
  tft.setCursor(4, 204);
  tft.printf("%u", data.sessionsToday);

  // WEEKLY %
  char wkPctBuf[8];
  formatPct(data.tokensWeekly, WEEKLY_TOKEN_LIMIT, wkPctBuf, sizeof(wkPctBuf));
  tft.setTextColor(C_DIM, bgBar);
  tft.setCursor(100, 192);
  tft.print("WEEKLY");
  tft.setTextColor(C_BLUE_WK, bgBar);
  tft.setCursor(100, 204);
  tft.print(wkPctBuf);

  // BULANAN %
  char moPctBuf[8];
  formatPct(data.tokensMonthly, MONTHLY_BUDGET_TOKENS, moPctBuf, sizeof(moPctBuf));
  tft.setTextColor(C_DIM, bgBar);
  tft.setCursor(200, 192);
  tft.print("BULANAN");
  tft.setTextColor(C_YELLOW, bgBar);
  tft.setCursor(200, 204);
  tft.print(moPctBuf);
}
