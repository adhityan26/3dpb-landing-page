#include <Arduino.h>
#include "display.h"

void setup() {
  Serial.begin(115200);
  displayInit();
  tft.setTextColor(C_GREEN, C_BG);
  tft.setTextSize(2);
  tft.setCursor(60, 100);
  tft.print("Hello CYD!");
  Serial.println("Display OK");
}

void loop() {
  delay(1000);
}
