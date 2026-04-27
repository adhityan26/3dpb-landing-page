#pragma once
#include "../display.h"

#define MAX_PRINTERS 12

struct PrinterData {
  char    name[24];
  char    type[12];
  char    state[16];
  char    filename[64];
  char    error_msg[80];
  uint8_t progress;
  int16_t remaining_min;
  bool    valid;
};

extern PrinterData gPrinters[MAX_PRINTERS];
extern int         gPrinterCount;
extern bool        gPrinterDataIsReal;  // false = masih dummy

void screenPrintersOverviewDraw();
void screenPrintersRackDraw();
void screenPrintersDraw(int page, bool paused = false);
void parsePrintersJson(const char* json, unsigned int len);
void screenPrintersRackInvalidate();
