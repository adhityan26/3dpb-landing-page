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
