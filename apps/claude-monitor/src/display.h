#pragma once
#include <TFT_eSPI.h>
#include "config.h"

// Dimensi layar sesuai rotation
#if (DISPLAY_ROTATION == 1 || DISPLAY_ROTATION == 3)
  #define SCREEN_W 320
  #define SCREEN_H 240
#else
  #define SCREEN_W 240
  #define SCREEN_H 320
#endif

// Warna 16-bit RGB565
#define C_BG       0x0841  // #0a0a0f background gelap
#define C_GREEN    0x07F1  // #00ff88 token/limit
#define C_YELLOW   0xFD40  // #ffaa00 biaya/budget
#define C_BLUE_CLK 0xAD5F  // #aaaaff jam & tanggal
#define C_BLUE_WK  0x8C5F  // #8888ff weekly
#define C_DIM      0x9CD3  // medium gray teks sekunder (~RGB 156,154,152)
#define C_RED      0xF800  // merah untuk alert

extern TFT_eSPI tft;

void displayInit();
void displayClear();
void drawClockStrip(const String& timeStr, const String& dateStr);
void drawHeader(const String& lastUpdate);
