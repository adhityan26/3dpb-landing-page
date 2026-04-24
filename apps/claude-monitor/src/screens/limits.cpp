#include "limits.h"
#include "../display.h"
#include "../config.h"
#include <Arduino.h>

static void drawProgressBar(int x, int y, int w, int h,
                             uint32_t used, uint32_t total,
                             uint16_t fillColor, uint16_t bgColor) {
  tft.fillRect(x, y, w, h, bgColor);
  tft.drawRect(x, y, w, h, C_DIM);
  if (total > 0) {
    int fillW = (int)((float)used / total * (w - 2));
    if (fillW > 0) tft.fillRect(x + 1, y + 1, fillW, h - 2, fillColor);
  }
}

void screenLimitsDraw(const UsageData& data) {
  displayClear();
  drawHeader("LIMITS");

  uint16_t bg5h  = tft.color565(10, 26, 10);
  uint16_t bgWk  = tft.color565(10, 10, 26);

  // ── 5H Window ─────────────────────────────────────────
  tft.fillRect(4, 20, 312, 86, bg5h);
  tft.drawRect(4, 20, 312, 86, tft.color565(26, 60, 26));

  tft.setTextColor(C_DIM, bg5h);
  tft.setTextSize(1);
  tft.setCursor(10, 26);
  tft.print("WINDOW 5 JAM");

  // Reset time — extract HH:MM from ISO string "2026-04-24T16:32:00Z"
  char rstBuf[20];
  strlcpy(rstBuf, data.rateLimitReset, sizeof(rstBuf));
  char rstShort[12] = "--:--";
  if (strlen(rstBuf) >= 16) {
    strlcpy(rstShort, rstBuf + 11, 6);  // "16:32"
  }
  tft.setTextColor(C_GREEN, bg5h);
  tft.setCursor(200, 26);
  tft.print("reset: ");
  tft.print(rstShort);

  // Progress bar
  uint32_t used5h = data.rateLimitTokensLimit - data.rateLimitTokensRemaining;
  drawProgressBar(10, 42, 300, 12, used5h, data.rateLimitTokensLimit, C_GREEN, tft.color565(13,26,13));

  // Numbers
  tft.setTextColor(C_GREEN, bg5h);
  tft.setTextSize(2);
  tft.setCursor(10, 60);
  char buf[24];
  if (used5h >= 1000000)
    snprintf(buf, sizeof(buf), "%.1fM", used5h / 1000000.0f);
  else
    snprintf(buf, sizeof(buf), "%.0fK", used5h / 1000.0f);
  tft.print(buf);
  tft.setTextColor(C_DIM, bg5h);
  tft.setTextSize(1);
  tft.print(" tokens");
  tft.setCursor(10, 82);
  char limBuf[16];
  if (data.rateLimitTokensLimit >= 1000000)
    snprintf(limBuf, sizeof(limBuf), "%.1fM", data.rateLimitTokensLimit / 1000000.0f);
  else
    snprintf(limBuf, sizeof(limBuf), "%.0fK", data.rateLimitTokensLimit / 1000.0f);
  tft.printf("limit: %s tokens", limBuf);

  // ── Weekly ─────────────────────────────────────────────
  tft.fillRect(4, 114, 312, 86, bgWk);
  tft.drawRect(4, 114, 312, 86, tft.color565(26, 26, 60));

  tft.setTextColor(C_DIM, bgWk);
  tft.setTextSize(1);
  tft.setCursor(10, 120);
  tft.print("MINGGUAN");
  tft.setCursor(200, 120);
  tft.print("reset: Sen");

  drawProgressBar(10, 136, 300, 12, data.tokensWeekly, WEEKLY_TOKEN_LIMIT, C_BLUE_WK, tft.color565(13,13,26));

  tft.setTextColor(C_BLUE_WK, bgWk);
  tft.setTextSize(2);
  tft.setCursor(10, 154);
  char wkBuf[12];
  if (data.tokensWeekly >= 1000000)
    snprintf(wkBuf, sizeof(wkBuf), "%.1fM", data.tokensWeekly / 1000000.0f);
  else
    snprintf(wkBuf, sizeof(wkBuf), "%.0fK", data.tokensWeekly / 1000.0f);
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
