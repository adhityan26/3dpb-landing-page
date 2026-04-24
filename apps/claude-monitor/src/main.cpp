#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"

void setup() {
  Serial.begin(115200);
  displayInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting...");
  wifiConnect();
  displayClear();
  // Header placeholder
  tft.setTextColor(C_GREEN, C_BG);
  tft.setTextSize(1);
  tft.setCursor(6, 4);
  tft.print("CLAUDE MONITOR");
}

void loop() {
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    drawClockStrip(clockGetTime(), clockGetDate());
  }
}
