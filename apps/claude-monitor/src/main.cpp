#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "touch.h"
#include "screens/overview.h"

UsageData usage;
int currentPage = 0;

void setup() {
  Serial.begin(115200);
  displayInit();
  touchInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting...");
  wifiConnect();
  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching API...");
  fetchUsageData(usage);
  screenOverviewDraw(usage, clockGetTime(), clockGetDate());
}

void loop() {
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    if (currentPage == 0) {
      drawClockStrip(clockGetTime(), clockGetDate());
    }
  }
  if (touchTapped()) {
    currentPage = (currentPage + 1) % 3;
    if (currentPage == 0) {
      screenOverviewDraw(usage, clockGetTime(), clockGetDate());
    }
  }
}
