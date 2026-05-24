#include "printers.h"
#include "../display.h"
#include "../wifi_manager.h"
#include <Arduino.h>
#include <ArduinoJson.h>

PrinterData gPrinters[MAX_PRINTERS];
int         gPrinterCount    = 0;
bool        gPrinterDataIsReal = false;

// ── Parse MQTT payload ───────────────────────────────────────
void parsePrintersJson(const char* json, unsigned int len) {
  Serial.printf("[Printers] parse called len=%u\n", len);
  Serial.printf("[Printers] preview: %.80s\n", json);
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json, len);
  if (err != DeserializationError::Ok) {
    Serial.printf("[Printers] JSON error: %s\n", err.c_str());
    return;
  }
  // n8n membungkus dalam {"payload":[...]}
  JsonArray arr = doc["payload"].as<JsonArray>();
  if (arr.isNull()) { Serial.println("[Printers] arr is null"); return; }

  Serial.printf("[Printers] array size=%d\n", arr.size());
  gPrinterCount = 0;
  for (JsonObject p : arr) {
    if (gPrinterCount >= MAX_PRINTERS) break;
    PrinterData& pd = gPrinters[gPrinterCount++];
    strlcpy(pd.name,     p["name"]     | "", sizeof(pd.name));
    strlcpy(pd.type,     p["type"]     | "", sizeof(pd.type));
    strlcpy(pd.filename,  p["filename"]  | "", sizeof(pd.filename));
    strlcpy(pd.error_msg, p["error_msg"] | "", sizeof(pd.error_msg));
    // Uppercase state biar konsisten dengan stateColor()
    const char* st = p["state"] | "OFFLINE";
    int si = 0;
    for (; st[si] && si < (int)sizeof(pd.state)-1; si++)
      pd.state[si] = toupper((unsigned char)st[si]);
    pd.state[si] = '\0';
    pd.progress      = (uint8_t)(p["progress"]      | 0);
    pd.remaining_min = (int16_t)(p["remaining_min"] | 0);
    pd.valid = true;
  }
  gPrinterDataIsReal = true;
  Serial.printf("[Printers] real data: %d printers\n", gPrinterCount);
}

// ── Dummy data untuk testing ─────────────────────────────────
static void loadDummy() {
  const char* names[]  = {"Mars","Saturn","Mercury","Earth","Uranus","Neptune","Venus","Moon","Jupiter","Ganymede"};
  const char* types[]  = {"P1P","P1S","A1Mini","A1","P1S","P1S","A1","P2S","X1C","U1"};
  const char* states[] = {"RUNNING","IDLE","IDLE","RUNNING","ERROR","IDLE","RUNNING","IDLE","FINISH","OFFLINE"};
  const uint8_t progs[]  = {45, 100, 100, 72, 12, 100, 30, 100, 100, 0};
  const int16_t remain[] = {90, 0, 0, 35, 0, 0, 120, 0, 0, 0};

  gPrinterCount = 10;
  for (int i = 0; i < gPrinterCount; i++) {
    strlcpy(gPrinters[i].name,  names[i],  sizeof(gPrinters[i].name));
    strlcpy(gPrinters[i].type,  types[i],  sizeof(gPrinters[i].type));
    strlcpy(gPrinters[i].state, states[i], sizeof(gPrinters[i].state));
    gPrinters[i].progress      = progs[i];
    gPrinters[i].remaining_min = remain[i];
    gPrinters[i].valid         = true;
  }
}

// ── Helpers ──────────────────────────────────────────────────
static uint16_t stateColor(const char* state) {
  if (strcmp(state, "RUNNING") == 0 || strcmp(state, "PRINT") == 0)
    return C_GREEN;
  if (strcmp(state, "ERROR") == 0)
    return C_RED;
  if (strcmp(state, "FINISH") == 0)
    return tft.color565(0, 160, 255);
  if (strcmp(state, "PAUSE") == 0 || strcmp(state, "PAUSED") == 0)
    return C_YELLOW;
  return C_DIM;
}

static void fmtTime(char* buf, size_t len, int16_t min) {
  if (min <= 0) { strlcpy(buf, "--", len); return; }
  if (min >= 60) snprintf(buf, len, "%dj%02dm", min / 60, min % 60);
  else           snprintf(buf, len, "%dm",       min);
}

// ── Draw one printer row ──────────────────────────────────────
static void drawRow(int y, const PrinterData& p) {
  const int ROW_H = 70;
  uint16_t bg     = tft.color565(10, 10, 16);
  uint16_t sColor = stateColor(p.state);
  bool isRunning  = (strcmp(p.state,"RUNNING")==0 || strcmp(p.state,"PRINT")==0);

  tft.fillRect(0, y, SCREEN_W, ROW_H - 1, bg);
  tft.drawLine(0, y + ROW_H - 1, SCREEN_W-1, y + ROW_H - 1, tft.color565(30, 30, 40));

  // Name (size 2) + Type (dim, size 1 right of name)
  tft.setTextColor(TFT_WHITE, bg);
  tft.setTextSize(2);
  tft.setCursor(4, y + 4);
  tft.print(p.name);
  tft.setTextColor(C_DIM, bg);
  tft.setTextSize(1);
  tft.setCursor(4, y + 22);
  tft.print(p.type);

  // State + progress % (right side)
  tft.setTextColor(sColor, bg);
  tft.setTextSize(1);
  tft.setCursor(200, y + 5);
  tft.print(p.state);
  char pctBuf[6];
  snprintf(pctBuf, sizeof(pctBuf), "%3d%%", p.progress);
  tft.setCursor(270, y + 5);
  tft.print(pctBuf);

  // Progress bar
  int barY = y + 32;
  uint16_t barBg = tft.color565(25, 25, 35);
  tft.fillRect(4, barY, 312, 8, barBg);
  if (p.progress > 0) {
    int fillW = (int)(p.progress / 100.0f * 310);
    if (fillW > 310) fillW = 310;
    tft.fillRect(4, barY, fillW, 8, sColor);
  }

  // Sisa + ETA + Filename — dengan 70px row ada ruang cukup
  char timeBuf[12];
  tft.setTextColor(C_DIM, bg);
  tft.setTextSize(1);
  if (isRunning) {
    fmtTime(timeBuf, sizeof(timeBuf), p.remaining_min);
    tft.setCursor(4, y + 44);
    tft.printf("sisa: %s", timeBuf);
    if (p.remaining_min > 0) {
      time_t eta = (time_t)clockGetEpoch() + (time_t)(p.remaining_min * 60);
      struct tm* et = localtime(&eta);
      tft.setCursor(140, y + 44);
      tft.printf("ETA %02d:%02d", et->tm_hour, et->tm_min);
    }
    if (p.filename[0]) {
      tft.setCursor(4, y + 56);
      char fn[42]; strlcpy(fn, p.filename, sizeof(fn));
      tft.print(fn);
    }
  } else {
    bool offline = (strcmp(p.state, "OFFLINE") == 0);
    bool errored = (strcmp(p.state, "ERROR") == 0);

    if (offline) {
      tft.setCursor(4, y + 44);
      tft.print("offline");
    }

    if (errored && p.error_msg[0]) {
      tft.setTextColor(C_RED, bg);
      tft.setCursor(4, y + 44);
      char em[42]; strlcpy(em, p.error_msg, sizeof(em));
      tft.print(em);
    } else if (p.filename[0]) {
      tft.setCursor(4, offline ? y + 56 : y + 44);
      char fn[42]; strlcpy(fn, p.filename, sizeof(fn));
      tft.printf("terakhir: %s", fn);
    }
  }
}

// ── Rack cell draw helper ─────────────────────────────────────
static void drawCell(int x, int y, int w, int h, const PrinterData& p) {
  uint16_t sColor = stateColor(p.state);
  uint16_t bg     = tft.color565(10, 10, 16);
  bool running    = (strcmp(p.state,"RUNNING")==0 || strcmp(p.state,"PRINT")==0);

  tft.fillRect(x, y, w, h, bg);
  tft.fillRect(x, y, 3, h, sColor);

  // Name
  tft.setTextColor(TFT_WHITE, bg);
  tft.setTextSize(1);
  tft.setCursor(x + 5, y + 4);
  tft.print(p.name);

  // Type (dim, same line right side if space)
  tft.setTextColor(C_DIM, bg);
  tft.setCursor(x + 5, y + 15);
  tft.print(p.type);

  // State
  tft.setTextColor(sColor, bg);
  tft.setCursor(x + 5, y + 27);
  if (running)
    tft.printf("RUN %d%%", p.progress);
  else
    tft.print(p.state);

  // Progress bar
  if (running || strcmp(p.state,"FINISH")==0) {
    int bw = w - 8;
    tft.fillRect(x + 5, y + 38, bw, 5, tft.color565(25,25,35));
    int fw = (int)(p.progress / 100.0f * bw);
    if (fw > 0) tft.fillRect(x + 5, y + 38, fw, 5, sColor);
  }
}

// ── Rack visualization ────────────────────────────────────────
static PrinterData sPrev[MAX_PRINTERS];
static bool        sForceAll = true;

void screenPrintersRackInvalidate() { sForceAll = true; }

// Cari printer by name, kembalikan pointer (atau dummy kosong jika tidak ada)
static PrinterData sEmpty = {};
static const PrinterData& findPrinter(const char* name) {
  for (int i = 0; i < gPrinterCount; i++)
    if (strcmp(gPrinters[i].name, name) == 0) return gPrinters[i];
  return sEmpty;
}
static const PrinterData& findPrev(const char* name) {
  for (int i = 0; i < MAX_PRINTERS; i++)
    if (strcmp(sPrev[i].name, name) == 0) return sPrev[i];
  return sEmpty;
}
static bool namedCellChanged(const char* name) {
  if (sForceAll) return true;
  const PrinterData& a = findPrinter(name);
  const PrinterData& b = findPrev(name);
  return strcmp(a.state, b.state) != 0 || a.progress != b.progress ||
         a.remaining_min != b.remaining_min || a.valid != b.valid;
}
static void savePrev(const char* name) {
  const PrinterData& p = findPrinter(name);
  for (int i = 0; i < MAX_PRINTERS; i++) {
    if (sPrev[i].name[0] == '\0' || strcmp(sPrev[i].name, name) == 0) {
      sPrev[i] = p; return;
    }
  }
}

void screenPrintersRackDraw() {
  if (gPrinterCount == 0) loadDummy();

  if (sForceAll) tft.fillScreen(C_BG);
  tft.fillRect(0, 0, SCREEN_W, 14, C_BG);

  // Header: tanggal kiri (mencolok), jam kanan
  tft.setTextColor(TFT_WHITE, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 4);
  tft.print(clockGetDate());
  String t = clockGetTime().substring(0, 5);
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setCursor(SCREEN_W - (int)t.length() * 6 - 4, 4);
  tft.print(t);
  tft.drawLine(0, 13, SCREEN_W-1, 13, tft.color565(30, 30, 40));

  // Watermark jika masih dummy
  if (!gPrinterDataIsReal) {
    tft.setTextColor(tft.color565(60, 0, 0), C_BG);
    tft.setTextSize(1);
    tft.setCursor(SCREEN_W-80, 4);
    tft.print("DEMO");
  }

  // Layout: 5 equal cols × 63px + 4px gap antara rak = 319px (1px margin kiri)
  // Col 0-1 = Rak Kiri, gap, Col 2-4 = Rak Kanan
  // x positions: 0, 63, 126, [gap 126-129], 130, 193, 256
  const int TOP_Y  = 14;
  const int MID_Y  = 99;
  const int BOT_Y  = 100;
  const int END_Y  = 184;
  const int GAN_Y  = 185;
  const int CELL_H = MID_Y - TOP_Y;
  const int CELL_H2= END_Y - BOT_Y;
  const int CW     = 63;  // cell width
  const int GAP_X  = 126; // gap start (after 2 cols)
  const int GAP_W  = 4;
  const int RX     = GAP_X + GAP_W; // right rack start = 130

  uint16_t frameColor = tft.color565(45, 45, 55);

  // Gap (dark fill)
  tft.fillRect(GAP_X, TOP_Y, GAP_W, END_Y - TOP_Y, tft.color565(5, 5, 8));

  // Horizontal lines
  tft.drawLine(0,   TOP_Y, GAP_X-1, TOP_Y, frameColor);
  tft.drawLine(RX,  TOP_Y, SCREEN_W-1, TOP_Y, frameColor);
  tft.drawLine(0,   MID_Y, GAP_X-1, MID_Y, frameColor);
  tft.drawLine(RX,  MID_Y, SCREEN_W-1, MID_Y, frameColor);
  tft.drawLine(0,   END_Y, GAP_X-1, END_Y, frameColor);
  tft.drawLine(RX,  END_Y, SCREEN_W-1, END_Y, frameColor);

  // Col dividers within racks
  tft.drawLine(CW,       TOP_Y, CW,       END_Y, frameColor); // kiri col divider
  tft.drawLine(RX+CW,    TOP_Y, RX+CW,    END_Y, frameColor); // kanan col 1
  tft.drawLine(RX+CW*2,  TOP_Y, RX+CW*2,  END_Y, frameColor); // kanan col 2

  // Rack labels
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4,      TOP_Y + 2); tft.print("RAK KIRI");
  tft.setCursor(RX + 4, TOP_Y + 2); tft.print("RAK KANAN");

  // Cell x positions
  int lx[2] = {1, CW+1};
  int rx3[3] = {RX+1, RX+CW+1, RX+CW*2+1};
  int cw = CW - 2;

  // Top row — by name, hanya redraw jika berubah
  // Rak kiri atas: Mars | Saturn
  // Rak kanan atas: Uranus | Neptune | Moon
  #define DRAW_NAMED(px, py, pw, ph, nm) \
    if (namedCellChanged(nm)) { drawCell(px, py, pw, ph, findPrinter(nm)); savePrev(nm); }

  DRAW_NAMED(lx[0],  TOP_Y+11, cw, CELL_H-12, "Mars")
  DRAW_NAMED(lx[1],  TOP_Y+11, cw, CELL_H-12, "Saturn")
  DRAW_NAMED(rx3[0], TOP_Y+11, cw, CELL_H-12, "Uranus")
  DRAW_NAMED(rx3[1], TOP_Y+11, cw, CELL_H-12, "Neptune")
  DRAW_NAMED(rx3[2], TOP_Y+11, cw, CELL_H-12, "Moon")

  // Rak kiri bawah: Mercury | Earth
  // Rak kanan bawah: kosong | Venus | Jupiter
  DRAW_NAMED(lx[0],  BOT_Y+1, cw, CELL_H2-2, "Mercury")
  DRAW_NAMED(lx[1],  BOT_Y+1, cw, CELL_H2-2, "Earth")
  if (sForceAll) tft.fillRect(rx3[0], BOT_Y+1, cw, CELL_H2-2, tft.color565(8,8,12));
  DRAW_NAMED(rx3[1], BOT_Y+1, cw, CELL_H2-2, "Venus")
  DRAW_NAMED(rx3[2], BOT_Y+1, cw, CELL_H2-2, "Jupiter")

  // ── Ganymede — hanya redraw jika berubah ──────────────────
  const PrinterData& gan = findPrinter("Ganymede");
  uint16_t ganColor = stateColor(gan.state);
  uint16_t ganBg    = tft.color565(12, 12, 18);
  if (namedCellChanged("Ganymede")) {
    savePrev("Ganymede");
    tft.drawLine(0, GAN_Y-1, SCREEN_W-1, GAN_Y-1, frameColor);
    tft.fillRect(0, GAN_Y, SCREEN_W, SCREEN_H-GAN_Y, ganBg);
    tft.fillRect(0, GAN_Y, 3, SCREEN_H-GAN_Y, ganColor);
    tft.setTextColor(TFT_WHITE, ganBg);
    tft.setTextSize(1);
    tft.setCursor(8, GAN_Y+5);
    tft.print(gan.name);
    tft.setTextColor(C_DIM, ganBg);
    tft.setCursor(8, GAN_Y+17);
    tft.print(gan.type);
    tft.setTextColor(ganColor, ganBg);
    tft.setCursor(80, GAN_Y+5);
    tft.print(gan.state);
    if (strcmp(gan.state,"RUNNING")==0 || strcmp(gan.state,"PRINT")==0) {
      tft.setTextColor(C_DIM, ganBg);
      tft.setCursor(80, GAN_Y+17);
      tft.printf("%d%%", gan.progress);
      if (gan.filename[0]) { tft.setCursor(160, GAN_Y+5); tft.print(gan.filename); }
      int bw = 230;
      tft.fillRect(8, GAN_Y+30, bw, 6, tft.color565(25,25,35));
      int fw = (int)(gan.progress/100.0f*bw);
      if (fw > 0) tft.fillRect(8, GAN_Y+30, fw, 6, ganColor);
    }
  }

  sForceAll = false;
}

// ── Overview: semua printer 2 kolom + jam ────────────────────
void screenPrintersOverviewDraw() {
  if (gPrinterCount == 0) loadDummy();

  tft.fillRect(0, 0, SCREEN_W, 14, C_BG);

  // Header: tanggal kiri, jam kanan
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 4);
  tft.print(clockGetDate());

  String t = clockGetTime().substring(0, 5);  // "HH:MM"
  tft.setTextColor(TFT_WHITE, C_BG);
  tft.setCursor(SCREEN_W - (int)t.length() * 6 - 4, 4);
  tft.print(t);

  tft.drawLine(0, 13, SCREEN_W-1, 13, tft.color565(30, 30, 40));

  // 2-column grid, 6 rows, row height 37px
  const int ROW_H  = 37;
  const int COL_W  = 158;
  const int START_Y = 15;

  for (int i = 0; i < MAX_PRINTERS; i++) {
    int col  = i / 6;
    int row  = i % 6;
    int x    = col * (COL_W + 4);
    int y    = START_Y + row * ROW_H;

    if (i >= gPrinterCount || !gPrinters[i].valid) continue;

    const PrinterData& p = gPrinters[i];
    uint16_t sColor = stateColor(p.state);
    uint16_t bg     = tft.color565(10, 10, 16);

    tft.fillRect(x, y, COL_W, ROW_H - 1, bg);
    tft.fillRect(x, y, 3, ROW_H - 1, sColor);  // colored left border

    // Name
    tft.setTextColor(TFT_WHITE, bg);
    tft.setTextSize(1);
    tft.setCursor(x + 6, y + 5);
    char truncName[12];
    strlcpy(truncName, p.name, sizeof(truncName));
    tft.print(truncName);

    // State
    tft.setTextColor(sColor, bg);
    tft.setCursor(x + 6, y + 18);
    if (strcmp(p.state, "RUNNING") == 0 || strcmp(p.state, "PRINT") == 0) {
      tft.printf("RUN %d%%", p.progress);
    } else {
      tft.print(p.state);
    }

    // Divider bawah
    tft.drawLine(x, y + ROW_H - 1, x + COL_W - 1, y + ROW_H - 1, tft.color565(25, 25, 35));
  }

  // Divider tengah kolom
  tft.drawLine(COL_W + 2, 14, COL_W + 2, 239, tft.color565(30, 30, 40));
}

// ── Detail per page — 3 printer, tab navigation ──────────────
void screenPrintersDraw(int page, bool paused) {
  if (gPrinterCount == 0) loadDummy();

  const int PER_PAGE  = 3;
  int totalPages = (gPrinterCount + PER_PAGE - 1) / PER_PAGE;
  if (page >= totalPages) page = 0;

  // ── Header ────────────────────────────────────────────────
  tft.fillRect(0, 0, SCREEN_W, 16, C_BG);
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 4);
  tft.print("PRINTERS");

  // Tab buttons
  const int TAB_W = 20, TAB_H = 12, TAB_X0 = 90;
  for (int i = 0; i < totalPages; i++) {
    int tx = TAB_X0 + i * (TAB_W + 2);
    bool active = (i == page);
    uint16_t tabBg = active ? C_BLUE_WK : tft.color565(20, 20, 30);
    uint16_t tabFg = active ? TFT_WHITE  : C_DIM;
    tft.fillRect(tx, 2, TAB_W, TAB_H, tabBg);
    tft.setTextColor(tabFg, tabBg);
    tft.setCursor(tx + 7, 5);
    tft.print(i + 1);
  }

  // Watermark jika dummy
  if (!gPrinterDataIsReal) {
    tft.setTextColor(tft.color565(60, 0, 0), C_BG);
    tft.setTextSize(1);
    tft.setCursor(SCREEN_W-80, 5);
    tft.print("DEMO");
  }

  // ── Bottom strip: pause toggle ─────────────────────────────
  uint16_t btnBg = paused ? tft.color565(40, 30, 0) : tft.color565(10, 20, 10);
  uint16_t btnFg = paused ? C_YELLOW : C_GREEN;
  tft.fillRect(0, SCREEN_H-14, SCREEN_W, 14, btnBg);
  tft.setTextColor(btnFg, btnBg);
  tft.setTextSize(1);
  tft.setCursor(118, 229);
  tft.print(paused ? "|| ROTASI PAUSE" : "> ROTASI AUTO");

  // ── 3 rows × 70px = 210px (y=16..225) ────────────────────
  int startIdx = page * PER_PAGE;
  for (int i = 0; i < PER_PAGE; i++) {
    int idx  = startIdx + i;
    int rowY = 16 + i * 70;
    if (idx < gPrinterCount && gPrinters[idx].valid) {
      drawRow(rowY, gPrinters[idx]);
    } else {
      tft.fillRect(0, rowY, SCREEN_W, 69, tft.color565(8, 8, 12));
      tft.drawLine(0, rowY + 69, SCREEN_W-1, rowY + 69, tft.color565(20, 20, 28));
    }
  }
}
