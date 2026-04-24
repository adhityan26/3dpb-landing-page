#include "display.h"

TFT_eSPI tft = TFT_eSPI();

void displayInit() {
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  tft.init();
  tft.setRotation(1);  // landscape 320x240
  tft.fillScreen(C_BG);
}

void displayClear() {
  tft.fillScreen(C_BG);
}

void drawClockStrip(const String& timeStr, const String& dateStr) {
  // Background strip
  tft.fillRect(0, 16, 320, 42, tft.color565(10, 10, 31));  // biru gelap
  tft.drawLine(0, 15, 319, 15, C_DIM);
  tft.drawLine(0, 58, 319, 58, C_DIM);

  // Jam besar (HH:MM:SS) di kiri
  tft.setTextColor(C_BLUE_CLK, tft.color565(10, 10, 31));
  tft.setTextSize(3);  // ~18px per char
  tft.setCursor(6, 22);
  tft.print(timeStr);  // "14:32:05"

  // Tanggal di kanan
  tft.setTextColor(C_DIM, tft.color565(10, 10, 31));
  tft.setTextSize(1);
  tft.setCursor(192, 26);
  // Pisahkan hari dan tanggal: "Kamis" di atas, "24 Apr 2026" di bawah
  int commaIdx = dateStr.indexOf(',');
  if (commaIdx > 0) {
    tft.print(dateStr.substring(0, commaIdx));  // "Kamis"
    tft.setTextColor(C_BLUE_CLK, tft.color565(10, 10, 31));
    tft.setCursor(192, 42);
    tft.print(dateStr.substring(commaIdx + 2)); // "24 Apr 2026"
  } else {
    tft.print(dateStr);
  }
}
