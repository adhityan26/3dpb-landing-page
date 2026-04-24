#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"

void setup() {
  Serial.begin(115200);
  displayInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting WiFi...");
  wifiConnect();
  Serial.println(clockGetTime());
  Serial.println(clockGetDate());
  tft.fillScreen(C_BG);
  tft.setTextColor(C_GREEN, C_BG);
  tft.setCursor(10, 110);
  tft.print("WiFi OK: ");
  tft.print(clockGetTime());
}

void loop() {
  delay(1000);
}
