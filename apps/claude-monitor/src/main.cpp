#include <Arduino.h>
#include <WiFi.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "touch.h"
#include "screens/limits.h"
#include "screens/budget.h"
#include "screens/printers.h"
#include "screens/gold.h"
#include "gold_client.h"
#include "config.h"

UsageData usage;
GoldData  gold;
int  currentPage    = 0;
bool gRotatePaused  = false;

// Pages: 0=Claude, 1=Rack, 2-5=Detail p1-p4, 6=Gold
#define TOTAL_PAGES 7
#define DETAIL_FIRST 2
#define DETAIL_LAST  5

void renderCurrentPage() {
  switch (currentPage) {
    case 0: screenLimitsDraw(usage); break;
    case 1: screenPrintersRackDraw(); break;
    case 2: screenPrintersDraw(0, gRotatePaused); break;
    case 3: screenPrintersDraw(1, gRotatePaused); break;
    case 4: screenPrintersDraw(2, gRotatePaused); break;
    case 5: screenPrintersDraw(3, gRotatePaused); break;
    case 6: screenGoldDraw(gold); break;
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
  tft.print("Connecting MQTT...");
  fetchUsageData(usage);

  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching gold price...");
  fetchGoldData(gold);

  currentPage = 1;
  renderCurrentPage();
}

void loop() {
  static time_t lastUpdatedAt = 0;
  static unsigned long lastStatusPrint = 0;
  static unsigned long lastGoldRefresh = 0;

  // Refresh gold tiap 2 jam
  if (millis() - lastGoldRefresh >= 7200000UL) {
    lastGoldRefresh = millis();
    fetchGoldData(gold);
    if (currentPage == 5) renderCurrentPage();
  }

  // Auto-rotate printer detail pages (2-4) tiap 8 detik, kecuali di-pause
  static unsigned long lastAutoRotate = 0;
  if (!gRotatePaused && currentPage >= DETAIL_FIRST && currentPage <= DETAIL_LAST) {
    if (millis() - lastAutoRotate >= 8000UL) {
      lastAutoRotate = millis();
      currentPage = (currentPage >= DETAIL_LAST) ? DETAIL_FIRST : currentPage + 1;
      renderCurrentPage();
    }
  }

  mqttLoop(usage);
  if (usage.valid && usage.updatedAt != lastUpdatedAt) {
    lastUpdatedAt = usage.updatedAt;
    renderCurrentPage();
  }
  if (printersUpdated()) {
    if (currentPage >= 1 && currentPage <= DETAIL_LAST) renderCurrentPage();
  }

  if (millis() - lastStatusPrint >= 5000) {
    lastStatusPrint = millis();
    Serial.printf("[Main] WiFi=%s MQTT=%s page=%d\n",
      WiFi.status() == WL_CONNECTED ? "OK" : "FAIL",
      mqttConnected() ? "OK" : "FAIL",
      currentPage);
  }

  int zone = touchZone();
  if (zone == 3 && currentPage >= DETAIL_FIRST && currentPage <= DETAIL_LAST) {
    gRotatePaused = !gRotatePaused;
    renderCurrentPage();
  } else if (zone == 1 || zone == -1) {
    int prev = currentPage;
    currentPage = (zone == 1)
      ? (currentPage + 1) % TOTAL_PAGES
      : (currentPage - 1 + TOTAL_PAGES) % TOTAL_PAGES;
    lastAutoRotate = millis();
    if (currentPage == 1 && prev != 1) screenPrintersRackInvalidate();
    if ((currentPage >= DETAIL_FIRST && currentPage <= DETAIL_LAST) &&
        !(prev >= DETAIL_FIRST && prev <= DETAIL_LAST)) {
      // entering detail from non-detail: reset auto-rotate timer
      lastAutoRotate = millis();
    }
    renderCurrentPage();
  }
}
