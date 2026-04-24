#include "touch.h"
#include <SPI.h>
#include <XPT2046_Touchscreen.h>

#define TOUCH_CS_PIN  33
#define TOUCH_IRQ_PIN 36
#define TOUCH_CLK     25
#define TOUCH_MISO    39
#define TOUCH_MOSI    32

static SPIClass touchSPI(HSPI);
static XPT2046_Touchscreen ts(TOUCH_CS_PIN, TOUCH_IRQ_PIN);

void touchInit() {
  touchSPI.begin(TOUCH_CLK, TOUCH_MISO, TOUCH_MOSI, TOUCH_CS_PIN);
  ts.begin(touchSPI);
  ts.setRotation(1);
  Serial.println("Touch OK");
}

bool touchTapped() {
  static bool wasPressed = false;
  static unsigned long lastTap = 0;

  if (!ts.tirqTouched()) {
    wasPressed = false;
    return false;
  }
  if (!ts.touched()) return false;

  // Debounce: abaikan tap < 300ms setelah tap sebelumnya
  if (wasPressed) return false;
  if (millis() - lastTap < 300) return false;

  wasPressed = true;
  lastTap = millis();
  Serial.println("Tap detected");
  return true;
}
