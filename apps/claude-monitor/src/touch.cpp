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

  if (!ts.tirqTouched()) { wasPressed = false; return false; }
  if (!ts.touched()) return false;
  if (wasPressed) return false;
  if (millis() - lastTap < 300) return false;

  wasPressed = true;
  lastTap = millis();
  return true;
}

int touchZone() {
  static bool wasPressed = false;
  static unsigned long lastTap = 0;

  if (!ts.tirqTouched()) { wasPressed = false; return 0; }
  if (!ts.touched()) return 0;
  if (wasPressed) return 0;
  if (millis() - lastTap < 300) return 0;

  TS_Point p = ts.getPoint();
  wasPressed = true;
  lastTap = millis();

  Serial.printf("[Touch] raw x=%d y=%d\n", p.x, p.y);

  // Bottom strip ~40px: raw_y > 3400 (240px total, 40/240*4095 ≈ 682, bottom = 4095-682)
  if (p.y > 3400) return 3;  // bottom strip = toggle pause

  // Raw X: 0-4095 → 320px. Kiri 1/3 ≈ < 1365
  return (p.x < 1365) ? -1 : 1;
}
