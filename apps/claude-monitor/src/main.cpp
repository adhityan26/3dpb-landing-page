#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"

UsageData usage;

void setup() {
  Serial.begin(115200);
  displayInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting...");
  wifiConnect();
  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching API...");
  fetchUsageData(usage);
  if (usage.valid) {
    tft.setTextColor(C_GREEN, C_BG);
    tft.setCursor(10, 120);
    tft.printf("Tokens: %uK", (usage.inputTokensToday + usage.outputTokensToday) / 1000);
  } else {
    tft.setTextColor(C_RED, C_BG);
    tft.setCursor(10, 120);
    tft.print(usage.errorMsg);
  }
}

void loop() { delay(1000); }
