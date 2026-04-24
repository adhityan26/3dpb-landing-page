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

static void formatResetCountdown(const char* isoReset, char* buf, size_t len) {
  struct tm t = {};
  if (sscanf(isoReset, "%d-%d-%dT%d:%d:%d",
      &t.tm_year, &t.tm_mon, &t.tm_mday,
      &t.tm_hour, &t.tm_min, &t.tm_sec) == 6) {
    t.tm_year -= 1900;
    t.tm_mon  -= 1;
    time_t resetEpoch = mktime(&t);
    resetEpoch -= NTP_OFFSET_SEC;
    time_t now = (time_t)clockGetEpoch();
    long diff = (long)resetEpoch - (long)now;
    if (diff <= 0) {
      snprintf(buf, len, "now");
    } else {
      int h = diff / 3600;
      int m = (diff % 3600) / 60;
      snprintf(buf, len, "%dj %dm", h, m);
    }
  } else {
    strlcpy(buf, isoReset, len > 16 ? 16 : len);
  }
}

void screenOverviewDraw(const UsageData& data, const String& timeStr, const String& dateStr) {
  displayClear();

  // Header
  char lastUpd[9] = "--:--";
  if (data.valid) strlcpy(lastUpd, timeStr.c_str(), sizeof(lastUpd));
  drawHeader(String(lastUpd));

  // Clock strip
  drawClockStrip(timeStr, dateStr);

  // ── Stats area ─────────────────────────────────────────
  uint16_t bgStats = C_BG;

  // Divider vertikal di tengah x=160
  tft.drawLine(160, 60, 160, 184, C_DIM);

  // Kiri: TOKENS
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

  // Sub-info tokens
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  char inBuf[10], outBuf[10];
  formatTokens(data.inputTokensToday, inBuf, sizeof(inBuf));
  formatTokens(data.outputTokensToday, outBuf, sizeof(outBuf));
  tft.setCursor(8, 140);
  tft.printf("in:%s out:%s", inBuf, outBuf);

  // Kanan: BIAYA
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(168, 64);
  tft.print("BIAYA HARI INI");

  tft.setTextColor(C_YELLOW, bgStats);
  tft.setTextSize(3);
  tft.setCursor(168, 80);
  if (data.costToday < 10.0f) tft.printf("$%.2f", data.costToday);
  else                         tft.printf("$%.1f", data.costToday);

  // mtd
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(168, 140);
  tft.printf("mtd:$%.1f", data.costMonthToDate);

  // ── Status bar ─────────────────────────────────────────
  uint16_t bgBar = tft.color565(10, 26, 10);
  tft.fillRect(0, 186, 320, 54, bgBar);
  tft.drawLine(0, 185, 319, 185, C_DIM);

  // 5H USED
  char pctBuf[8];
  uint32_t used5h = (data.rateLimitTokensRemaining <= data.rateLimitTokensLimit)
    ? (data.rateLimitTokensLimit - data.rateLimitTokensRemaining)
    : 0;
  formatTokens(used5h, tkBuf, sizeof(tkBuf));
  char limitBuf[10];
  formatTokens(data.rateLimitTokensLimit, limitBuf, sizeof(limitBuf));
  tft.setTextColor(C_DIM, bgBar);
  tft.setTextSize(1);
  tft.setCursor(4, 192);
  tft.print("5H USED");
  tft.setTextColor(C_GREEN, bgBar);
  tft.setTextSize(1);
  tft.setCursor(4, 204);
  tft.printf("%s/%s", tkBuf, limitBuf);

  // RESET
  char rstBuf[16];
  formatResetCountdown(data.rateLimitReset, rstBuf, sizeof(rstBuf));
  tft.setTextColor(C_DIM, bgBar);
  tft.setCursor(110, 192);
  tft.print("RESET");
  tft.setTextColor(C_GREEN, bgBar);
  tft.setCursor(110, 204);
  tft.print(rstBuf);

  // WEEKLY
  tft.setTextColor(C_DIM, bgBar);
  tft.setCursor(222, 192);
  tft.print("WEEKLY");
  tft.setTextColor(C_BLUE_WK, bgBar);
  tft.setCursor(222, 204);
  formatPct(data.tokensWeekly, WEEKLY_TOKEN_LIMIT, pctBuf, sizeof(pctBuf));
  tft.print(pctBuf);
}
