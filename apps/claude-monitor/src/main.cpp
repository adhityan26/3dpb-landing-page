#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "touch.h"

int page = 0;

void setup() {
  Serial.begin(115200);
  displayInit();
  touchInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Tap to cycle pages");
}

void loop() {
  if (touchTapped()) {
    page = (page + 1) % 3;
    tft.fillScreen(C_BG);
    tft.setTextColor(C_GREEN, C_BG);
    tft.setTextSize(2);
    tft.setCursor(60, 100);
    tft.printf("Page %d", page);
    Serial.printf("Switched to page %d\n", page);
  }
}
