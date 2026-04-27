#include "gold.h"
#include "../display.h"
#include "../wifi_manager.h"
#include <Arduino.h>

static void fmtIDR(char* buf, size_t len, uint32_t val) {
  // 27960 → "27.960"
  if (val >= 1000000)
    snprintf(buf, len, "%lu.%03lu.%03lu", val/1000000, (val%1000000)/1000, val%1000);
  else if (val >= 1000)
    snprintf(buf, len, "%lu.%03lu", val/1000, val%1000);
  else
    snprintf(buf, len, "%lu", (unsigned long)val);
}

void screenGoldDraw(const GoldData& data) {
  tft.fillScreen(C_BG);

  // ── Header: tanggal + jam mencolok ──────────────────────────
  String dateStr = clockGetDate();
  String timeStr = clockGetTime().substring(0, 5);

  tft.setTextColor(TFT_WHITE, C_BG);
  tft.setTextSize(2);
  tft.setCursor(4, 4);
  tft.print(dateStr);

  tft.setTextColor(C_YELLOW, C_BG);
  tft.setCursor(320 - (int)timeStr.length() * 12 - 4, 4);
  tft.print(timeStr);

  tft.drawLine(0, 22, 319, 22, tft.color565(40, 40, 50));

  if (!data.valid) {
    tft.setTextColor(C_DIM, C_BG);
    tft.setTextSize(1);
    tft.setCursor(8, 40);
    tft.print("Fetching gold price...");
    return;
  }

  // ── Harga jual besar (yang relevan buat pembeli) ─────────────
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 26);
  tft.print("HARGA EMAS PEGADAIAN");

  char sellBuf[16], buyBuf[16];
  fmtIDR(sellBuf, sizeof(sellBuf), data.current.sell);
  fmtIDR(buyBuf,  sizeof(buyBuf),  data.current.buy);

  // Big sell price
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(3);
  tft.setCursor(4, 38);
  tft.printf("Rp %s", sellBuf);

  // Buy/sell detail
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 68);
  tft.printf("Beli: %s  |  Jual: %s", buyBuf, sellBuf);

  // ── Prediksi + akurasi kemarin ───────────────────────────────
  if (data.histCount >= 3) {
    int n = data.histCount;

    // Helper: linear regression untuk n titik, return prediksi di titik ke-n
    auto linReg = [](const GoldPrice* h, int count) -> float {
      float sx=0, sy=0, sxy=0, sx2=0;
      for (int i=0; i<count; i++) {
        float x=i, y=(float)h[i].sell;
        sx+=x; sy+=y; sxy+=x*y; sx2+=x*x;
      }
      float d = count*sx2 - sx*sx;
      if (d == 0) return h[count-1].sell;
      float slope = (count*sxy - sx*sy) / d;
      float intercept = (sy - slope*sx) / count;
      return intercept + slope * count;  // prediksi titik berikutnya
    };

    // Prediksi besok (pakai semua n titik)
    float predTomorrow = linReg(data.history, n);
    uint32_t pred   = (uint32_t)predTomorrow;
    int32_t  delta  = (int32_t)pred - (int32_t)data.current.sell;
    char predBuf[16], deltaBuf[16];
    fmtIDR(predBuf, sizeof(predBuf), pred);
    bool up = delta >= 0;
    fmtIDR(deltaBuf, sizeof(deltaBuf), (uint32_t)(delta < 0 ? -delta : delta));

    tft.setTextColor(C_DIM, C_BG);
    tft.setTextSize(1);
    tft.setCursor(4, 78);
    tft.print("BESOK:");
    tft.setTextColor(up ? C_GREEN : C_RED, C_BG);
    tft.setCursor(48, 78);
    tft.printf("Rp %s  %c%s", predBuf, up ? '+' : '-', deltaBuf);

    // Akurasi kemarin: prediksi menggunakan n-1 titik vs aktual hari ini
    if (n >= 4) {
      float predYesterday = linReg(data.history, n-1);  // prediksi hari ini dari data kemarin
      uint32_t actual     = data.current.sell;
      int32_t  err        = (int32_t)actual - (int32_t)predYesterday;
      float    errPct     = (predYesterday > 0) ? (err * 100.0f / predYesterday) : 0;
      char actBuf[16], predYBuf[16];
      fmtIDR(predYBuf, sizeof(predYBuf), (uint32_t)predYesterday);
      fmtIDR(actBuf,   sizeof(actBuf),   actual);

      uint16_t errColor = (errPct > 2 || errPct < -2) ? C_RED : C_GREEN;
      tft.setTextColor(C_DIM, C_BG);
      tft.setCursor(4, 87);
      tft.print("KEMARIN:");
      tft.setTextColor(TFT_WHITE, C_BG);
      tft.setCursor(60, 87);
      tft.printf("pred %s", predYBuf);
      tft.setTextColor(errColor, C_BG);
      tft.setCursor(200, 87);
      tft.printf("akurasi %+.1f%%", errPct);
    }
  }

  // ── Chart: tampilkan 7 hari terakhir ────────────────────────
  const int CHART_X = 4;
  const int CHART_Y = 98;
  const int CHART_W = 312;
  const int CHART_H = 100;
  const int BAR_GAP = 2;
  const int DISPLAY_DAYS = 7;

  int n       = data.histCount;
  int startI  = (n > DISPLAY_DAYS) ? n - DISPLAY_DAYS : 0;
  int dispN   = n - startI;
  if (n == 0) return;

  // Scale berdasarkan 7 hari yang ditampilkan
  uint32_t minV = data.history[startI].sell, maxV = data.history[startI].sell;
  for (int i = startI+1; i < n; i++) {
    if (data.history[i].sell < minV) minV = data.history[i].sell;
    if (data.history[i].sell > maxV) maxV = data.history[i].sell;
  }
  uint32_t range = maxV - minV;
  if (range == 0) range = 1;
  uint32_t pad = range / 10;
  uint32_t lo  = (minV > pad) ? minV - pad : 0;
  uint32_t hi  = maxV + pad;

  int barW = (CHART_W - BAR_GAP * (dispN - 1)) / dispN;

  tft.fillRect(CHART_X, CHART_Y, CHART_W, CHART_H, tft.color565(8, 8, 12));

  for (int i = 0; i < dispN; i++) {
    int di  = startI + i;
    int x   = CHART_X + i * (barW + BAR_GAP);
    int barH = (int)((float)(data.history[di].sell - lo) / (hi - lo) * (CHART_H - 16));
    if (barH < 2) barH = 2;
    int y = CHART_Y + CHART_H - 16 - barH;

    bool isLatest = (di == n - 1);
    uint16_t barColor = isLatest ? C_YELLOW : tft.color565(80, 70, 30);
    tft.fillRect(x, y, barW, barH, barColor);

    char label[6];
    strlcpy(label, data.history[di].date, 3);
    tft.setTextColor(C_DIM, tft.color565(8, 8, 12));
    tft.setTextSize(1);
    tft.setCursor(x + barW/2 - 3, CHART_Y + CHART_H - 12);
    tft.print(label);
  }

  // Y-axis labels
  char hiLabel[16], loLabel[16];
  fmtIDR(hiLabel, sizeof(hiLabel), hi);
  fmtIDR(loLabel, sizeof(loLabel), lo);
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, CHART_Y + CHART_H + 4);
  tft.printf("lo:%s  hi:%s", loLabel, hiLabel);
}
