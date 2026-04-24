#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "touch.h"
#include "screens/overview.h"
#include "screens/limits.h"
#include "screens/budget.h"
#include "config.h"

UsageData usage;
int currentPage = 0;

void renderCurrentPage() {
  switch (currentPage) {
    case 0: screenOverviewDraw(usage, clockGetTime(), clockGetDate()); break;
    case 1: screenLimitsDraw(usage);  break;
    case 2: screenBudgetDraw(usage);  break;
  }
}

void setup() {
  Serial.begin(115200);
  displayInit();
  touchInit();

  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting WiFi...");
  wifiConnect();

  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Syncing time...");

  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching usage...");
  fetchUsageData(usage);

  renderCurrentPage();
}

void loop() {
  // Update clock every second (only on page 0)
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    if (currentPage == 0) {
      drawClockStrip(clockGetTime(), clockGetDate());
    }
  }

  // Refresh API every REFRESH_INTERVAL_MS
  static unsigned long lastApiRefresh = 0;
  if (millis() - lastApiRefresh >= REFRESH_INTERVAL_MS) {
    lastApiRefresh = millis();
    Serial.println("[Main] Refreshing API...");
    fetchUsageData(usage);
    renderCurrentPage();
  }

  // Touch: cycle pages
  if (touchTapped()) {
    currentPage = (currentPage + 1) % 3;
    renderCurrentPage();
  }
}
