# Claude Monitor ESP32 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun firmware PlatformIO untuk ESP32-2432S028 yang menampilkan statistik Claude API (token, biaya, rate limit, budget) plus jam digital via NTP di layar 320×240px.

**Architecture:** ESP32 terhubung ke WiFi, sinkronisasi waktu via NTP, lalu polling Anthropic API tiap 5 menit via HTTPS. Data dirender ke TFT ILI9341. Touch XPT2046 di SPI bus terpisah (HSPI) untuk navigasi 3 screen.

**Tech Stack:** PlatformIO, Arduino framework, TFT_eSPI, ArduinoJson v7, XPT2046_Touchscreen, NTPClient, WiFiClientSecure (ESP32 core built-in).

---

## File Map

| File | Tanggung jawab |
|---|---|
| `platformio.ini` | Board config, dependencies |
| `include/User_Setup.h` | TFT_eSPI pin config untuk CYD |
| `src/config.h.example` | Template credentials (di-commit) |
| `src/config.h` | Credentials aktif (gitignored) |
| `src/main.cpp` | setup(), loop(), timer refresh, page cycle |
| `src/wifi_manager.h/cpp` | Connect WiFi, reconnect |
| `src/api_client.h/cpp` | HTTPS GET Anthropic, parse JSON + headers → `UsageData` |
| `src/display.h/cpp` | TFT init, warna, primitif, drawClockStrip() |
| `src/touch.h/cpp` | XPT2046 HSPI, tap detection |
| `src/screens/overview.h/cpp` | Render Screen 0 |
| `src/screens/limits.h/cpp` | Render Screen 1 |
| `src/screens/budget.h/cpp` | Render Screen 2 |

---

## Task 1: Project Scaffold

**Files:**
- Create: `apps/claude-monitor/platformio.ini`
- Create: `apps/claude-monitor/.gitignore`
- Create: `apps/claude-monitor/include/User_Setup.h`
- Create: `apps/claude-monitor/src/config.h.example`
- Create: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Buat struktur direktori**

```bash
mkdir -p apps/claude-monitor/src/screens
mkdir -p apps/claude-monitor/include
```

- [ ] **Step 2: Buat `apps/claude-monitor/platformio.ini`**

```ini
[env:cyd]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
build_flags =
  -DUSER_SETUP_LOADED
lib_deps =
  bodmer/TFT_eSPI@^2.5.43
  bblanchon/ArduinoJson@^7.0.0
  paulstoffregen/XPT2046_Touchscreen@^1.4.0
  arduino-libraries/NTPClient@^3.2.1
```

- [ ] **Step 3: Buat `apps/claude-monitor/include/User_Setup.h`**

File ini mendefinisikan pin CYD untuk TFT_eSPI. Karena `USER_SETUP_LOADED` di-define di build_flags, library akan mencari file ini di include path.

```cpp
#pragma once

#define ILI9341_DRIVER
#define TFT_WIDTH  240
#define TFT_HEIGHT 320

#define TFT_MISO 12
#define TFT_MOSI 13
#define TFT_SCLK 14
#define TFT_CS   15
#define TFT_DC    2
#define TFT_RST  -1
#define TFT_BL   21

#define TOUCH_CS 33

#define LOAD_GLCD
#define LOAD_FONT2
#define LOAD_FONT4
#define LOAD_FONT6
#define SMOOTH_FONT

#define SPI_FREQUENCY       55000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY 2500000
```

> **Catatan:** Jika build gagal dengan error `User_Setup.h: No such file`, copy file ini ke `.pio/libdeps/cyd/TFT_eSPI/` setelah pertama kali `pio run` men-download library.

- [ ] **Step 4: Buat `apps/claude-monitor/.gitignore`**

```
src/config.h
.pio/
```

- [ ] **Step 5: Buat `apps/claude-monitor/src/config.h.example`**

```cpp
#pragma once

// WiFi
#define WIFI_SSID     "YourSSID"
#define WIFI_PASSWORD "YourPassword"

// Anthropic API — admin key dengan permission "usage"
// Buat di: https://console.anthropic.com/settings/keys
#define ANTHROPIC_API_KEY "sk-ant-api03-..."

// Timezone offset detik dari UTC (WIB = UTC+7 = 25200)
#define NTP_OFFSET_SEC 25200

// Refresh interval ms (default 5 menit)
#define REFRESH_INTERVAL_MS 300000UL

// Budget bulanan USD — isi 0 untuk nonaktifkan
#define MONTHLY_BUDGET_USD 150.0f

// Weekly token limit — sesuaikan dengan tier API kamu
// Tier 1: ~50M/week, Tier 2: ~200M/week — cek console.anthropic.com
#define WEEKLY_TOKEN_LIMIT 50000000UL
```

- [ ] **Step 6: Salin ke config.h dan isi nilai asli**

```bash
cp apps/claude-monitor/src/config.h.example apps/claude-monitor/src/config.h
# Edit config.h: isi WIFI_SSID, WIFI_PASSWORD, ANTHROPIC_API_KEY
```

- [ ] **Step 7: Buat `apps/claude-monitor/src/main.cpp` minimal**

```cpp
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Claude Monitor booting...");
}

void loop() {
  delay(1000);
}
```

- [ ] **Step 8: Verifikasi compile**

```bash
cd apps/claude-monitor
pio run
```

Expected output: `SUCCESS` tanpa error. Belum ada flash ke device.

- [ ] **Step 9: Commit**

```bash
git add apps/claude-monitor/
git commit -m "feat(claude-monitor): project scaffold + platformio config"
```

---

## Task 2: Display Init

**Files:**
- Create: `apps/claude-monitor/src/display.h`
- Create: `apps/claude-monitor/src/display.cpp`
- Modify: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Buat `apps/claude-monitor/src/display.h`**

```cpp
#pragma once
#include <TFT_eSPI.h>

// Warna 16-bit RGB565
// Gunakan tft.color565(r,g,b) untuk konversi — nilai di bawah precomputed
#define C_BG       0x0841  // #0a0a0f background gelap
#define C_GREEN    0x07F1  // #00ff88 token/limit
#define C_YELLOW   0xFD40  // #ffaa00 biaya/budget
#define C_BLUE_CLK 0xAD7F  // #aaaaff jam & tanggal
#define C_BLUE_WK  0x847F  // #8888ff weekly
#define C_DIM      0x2965  // dim gray teks sekunder
#define C_RED      0xF800  // merah untuk alert

extern TFT_eSPI tft;

void displayInit();
void displayClear();
```

- [ ] **Step 2: Buat `apps/claude-monitor/src/display.cpp`**

```cpp
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
```

- [ ] **Step 3: Update `src/main.cpp` — tampilkan teks di layar**

```cpp
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
```

- [ ] **Step 4: Flash ke device dan verifikasi**

```bash
cd apps/claude-monitor
pio run --target upload
pio device monitor
```

Expected: Layar menyala, teks "Hello CYD!" muncul hijau di tengah. Serial menampilkan "Display OK".

Jika layar putih/blank: periksa sambungan USB dan port di platformio.ini (`upload_port = /dev/cu.usbserial-*`).

- [ ] **Step 5: Commit**

```bash
git add apps/claude-monitor/src/display.h apps/claude-monitor/src/display.cpp apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): display init + hello world on screen"
```

---

## Task 3: WiFi + NTP

**Files:**
- Create: `apps/claude-monitor/src/wifi_manager.h`
- Create: `apps/claude-monitor/src/wifi_manager.cpp`
- Modify: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Buat `apps/claude-monitor/src/wifi_manager.h`**

```cpp
#pragma once
#include <NTPClient.h>
#include <WiFiUDP.h>

extern NTPClient timeClient;

void wifiConnect();
void wifiEnsureConnected();
String clockGetTime();    // returns "HH:MM:SS"
String clockGetDate();    // returns "Senin, 24 Apr 2026"
long  clockGetEpoch();
```

- [ ] **Step 2: Buat `apps/claude-monitor/src/wifi_manager.cpp`**

```cpp
#include "wifi_manager.h"
#include "config.h"
#include <WiFi.h>
#include <Arduino.h>

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", NTP_OFFSET_SEC, 60000);

static const char* DAYS[] = {"Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"};
static const char* MONTHS[] = {"","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"};

void wifiConnect() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  timeClient.begin();
  timeClient.update();
}

void wifiEnsureConnected() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.reconnect();
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
      delay(500);
    }
  }
  timeClient.update();
}

String clockGetTime() {
  return timeClient.getFormattedTime();
}

String clockGetDate() {
  time_t epoch = timeClient.getEpochTime();
  struct tm* t = localtime(&epoch);
  char buf[32];
  snprintf(buf, sizeof(buf), "%s, %d %s %d",
    DAYS[t->tm_wday], t->tm_mday, MONTHS[t->tm_mon + 1], 1900 + t->tm_year);
  return String(buf);
}

long clockGetEpoch() {
  return timeClient.getEpochTime();
}
```

- [ ] **Step 3: Update `src/main.cpp` — connect WiFi + print waktu ke serial**

```cpp
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
```

- [ ] **Step 4: Flash dan verifikasi di serial monitor**

```bash
pio run --target upload && pio device monitor
```

Expected:
```
Connecting to YourSSID......
Connected! IP: 192.168.x.x
14:32:05
Kamis, 24 Apr 2026
```

Layar menampilkan "WiFi OK: 14:32:05".

- [ ] **Step 5: Commit**

```bash
git add apps/claude-monitor/src/wifi_manager.h apps/claude-monitor/src/wifi_manager.cpp apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): wifi connect + NTP time sync"
```

---

## Task 4: Clock Strip

**Files:**
- Modify: `apps/claude-monitor/src/display.h`
- Modify: `apps/claude-monitor/src/display.cpp`
- Modify: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Tambahkan `drawClockStrip()` ke `display.h`**

```cpp
// Tambahkan di bawah deklarasi yang sudah ada:
void drawClockStrip(const String& timeStr, const String& dateStr);
```

- [ ] **Step 2: Implementasi `drawClockStrip()` di `display.cpp`**

Clock strip menempati y=16..57 (42px tinggi) di bawah header.

```cpp
void drawClockStrip(const String& timeStr, const String& dateStr) {
  // Background strip
  tft.fillRect(0, 16, 320, 42, tft.color565(10, 10, 31));  // biru gelap
  tft.drawLine(0, 15, 319, 15, C_DIM);
  tft.drawLine(0, 58, 319, 58, C_DIM);

  // Jam besar (HH:MM:SS) di kiri
  tft.setTextColor(C_BLUE_CLK, tft.color565(10, 10, 31));
  tft.setTextSize(3);  // ~18px per char
  tft.setCursor(6, 22);
  tft.print(timeStr);  // "14:32:05"

  // Tanggal di kanan
  tft.setTextColor(C_DIM, tft.color565(10, 10, 31));
  tft.setTextSize(1);
  tft.setCursor(192, 26);
  // Pisahkan hari dan tanggal: "Kamis" di atas, "24 Apr 2026" di bawah
  int commaIdx = dateStr.indexOf(',');
  if (commaIdx > 0) {
    tft.print(dateStr.substring(0, commaIdx));  // "Kamis"
    tft.setTextColor(C_BLUE_CLK, tft.color565(10, 10, 31));
    tft.setCursor(192, 42);
    tft.print(dateStr.substring(commaIdx + 2)); // "24 Apr 2026"
  } else {
    tft.print(dateStr);
  }
}
```

- [ ] **Step 3: Update `src/main.cpp` — clock update tiap detik**

```cpp
#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"

void setup() {
  Serial.begin(115200);
  displayInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting...");
  wifiConnect();
  displayClear();
  // Header placeholder
  tft.setTextColor(C_GREEN, C_BG);
  tft.setTextSize(1);
  tft.setCursor(6, 4);
  tft.print("CLAUDE MONITOR");
}

void loop() {
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    drawClockStrip(clockGetTime(), clockGetDate());
  }
}
```

- [ ] **Step 4: Flash dan verifikasi**

```bash
pio run --target upload && pio device monitor
```

Expected: Jam digital bergerak setiap detik di strip biru di bagian atas layar. Tanggal tampil di kanan.

- [ ] **Step 5: Commit**

```bash
git add apps/claude-monitor/src/display.h apps/claude-monitor/src/display.cpp apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): live clock strip with NTP time"
```

---

## Task 5: API Client

**Files:**
- Create: `apps/claude-monitor/src/api_client.h`
- Create: `apps/claude-monitor/src/api_client.cpp`

- [ ] **Step 1: Buat `apps/claude-monitor/src/api_client.h`**

```cpp
#pragma once
#include <Arduino.h>

struct UsageData {
  // Token hari ini (aggregate dari response)
  uint32_t inputTokensToday;
  uint32_t outputTokensToday;

  // Biaya (jika tersedia di API, atau 0)
  float costToday;
  float costMonthToDate;

  // Rate limit dari response headers
  uint32_t rateLimitTokensLimit;
  uint32_t rateLimitTokensRemaining;
  char     rateLimitReset[32];  // ISO 8601 string

  // Weekly — derived: total 7 hari terakhir dari data
  uint32_t tokensWeekly;

  // Top model
  char topModel[48];

  // Status
  bool   valid;
  char   errorMsg[64];
  time_t fetchedAt;
};

bool fetchUsageData(UsageData& out);
```

- [ ] **Step 2: Buat `apps/claude-monitor/src/api_client.cpp`**

> **Catatan:** Endpoint `/v1/usage` membutuhkan admin API key. Jika key biasa, endpoint mungkin berbeda atau tidak tersedia — lihat https://docs.anthropic.com untuk endpoint usage yang berlaku. Sesuaikan `USAGE_PATH` dan parsing JSON jika struktur response berbeda.

```cpp
#include "api_client.h"
#include "config.h"
#include "wifi_manager.h"
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

static const char* API_HOST = "api.anthropic.com";
static const char* USAGE_PATH = "/v1/usage";

bool fetchUsageData(UsageData& out) {
  memset(&out, 0, sizeof(out));
  out.valid = false;

  wifiEnsureConnected();

  WiFiClientSecure client;
  client.setInsecure();  // skip cert validation

  HTTPClient http;
  String url = String("https://") + API_HOST + USAGE_PATH;
  // Query: usage hari ini (today) — sesuaikan parameter setelah melihat docs
  String today = "";
  {
    time_t now = clockGetEpoch();
    struct tm* t = localtime(&now);
    char buf[12];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02d", 1900+t->tm_year, t->tm_mon+1, t->tm_mday);
    today = String(buf);
  }
  url += "?start_time=" + today + "T00:00:00Z&end_time=" + today + "T23:59:59Z";

  if (!http.begin(client, url)) {
    strlcpy(out.errorMsg, "http.begin failed", sizeof(out.errorMsg));
    return false;
  }

  http.addHeader("x-api-key", ANTHROPIC_API_KEY);
  http.addHeader("anthropic-version", "2023-06-01");
  http.addHeader("Content-Type", "application/json");

  // Daftarkan header yang ingin dikumpulkan dari response
  const char* headersToCollect[] = {
    "anthropic-ratelimit-tokens-limit",
    "anthropic-ratelimit-tokens-remaining",
    "anthropic-ratelimit-tokens-reset"
  };
  http.collectHeaders(headersToCollect, 3);

  int code = http.GET();
  Serial.printf("[API] GET %s -> %d\n", url.c_str(), code);

  if (code != 200) {
    snprintf(out.errorMsg, sizeof(out.errorMsg), "HTTP %d", code);
    String body = http.getString();
    Serial.println(body);
    http.end();
    return false;
  }

  // Ambil rate limit headers
  String rlLimit     = http.header("anthropic-ratelimit-tokens-limit");
  String rlRemaining = http.header("anthropic-ratelimit-tokens-remaining");
  String rlReset     = http.header("anthropic-ratelimit-tokens-reset");

  out.rateLimitTokensLimit     = rlLimit.toInt();
  out.rateLimitTokensRemaining = rlRemaining.toInt();
  strlcpy(out.rateLimitReset, rlReset.c_str(), sizeof(out.rateLimitReset));

  // Parse JSON
  String body = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    strlcpy(out.errorMsg, err.c_str(), sizeof(out.errorMsg));
    return false;
  }

  // Struktur response Anthropic usage API:
  // { "data": [ { "model": "...", "input_tokens": N, "output_tokens": N, ... } ] }
  // Aggregate semua model untuk total hari ini
  JsonArray data = doc["data"].as<JsonArray>();
  uint32_t maxModelTokens = 0;

  for (JsonObject entry : data) {
    uint32_t inp = entry["input_tokens"] | 0;
    uint32_t out2 = entry["output_tokens"] | 0;
    out.inputTokensToday  += inp;
    out.outputTokensToday += out2;

    // Biaya — field mungkin "input_cost" + "output_cost" atau "cost"
    float cost = entry["cost"] | 0.0f;
    if (cost == 0.0f) {
      cost = (entry["input_cost"] | 0.0f) + (entry["output_cost"] | 0.0f);
    }
    out.costToday += cost;

    // Top model
    uint32_t total = inp + out2;
    if (total > maxModelTokens) {
      maxModelTokens = total;
      const char* m = entry["model"] | "";
      strlcpy(out.topModel, m, sizeof(out.topModel));
    }
  }

  out.fetchedAt = clockGetEpoch();
  out.valid = true;
  Serial.printf("[API] tokens today: in=%u out=%u cost=$%.4f top=%s\n",
    out.inputTokensToday, out.outputTokensToday, out.costToday, out.topModel);
  Serial.printf("[API] rateLimit: %u/%u reset=%s\n",
    out.rateLimitTokensRemaining, out.rateLimitTokensLimit, out.rateLimitReset);
  return true;
}
```

- [ ] **Step 3: Update `src/main.cpp` — test fetch ke serial (belum ke display)**

```cpp
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
```

- [ ] **Step 4: Flash dan verifikasi di serial monitor**

```bash
pio run --target upload && pio device monitor
```

Expected serial output:
```
[API] GET https://api.anthropic.com/v1/usage?... -> 200
[API] tokens today: in=1800000 out=600000 cost=$3.2100 top=claude-sonnet-4-6
[API] rateLimit: 660000/1000000 reset=2026-04-24T16:32:00Z
```

Jika `-> 401`: API key salah atau butuh admin key.
Jika `-> 404`: endpoint berbeda, cek docs.anthropic.com untuk endpoint usage yang benar dan update `USAGE_PATH`.

- [ ] **Step 5: Commit**

```bash
git add apps/claude-monitor/src/api_client.h apps/claude-monitor/src/api_client.cpp apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): Anthropic API client with HTTPS + JSON parsing"
```

---

## Task 6: Touch Handler

**Files:**
- Create: `apps/claude-monitor/src/touch.h`
- Create: `apps/claude-monitor/src/touch.cpp`
- Modify: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Buat `apps/claude-monitor/src/touch.h`**

```cpp
#pragma once
#include <Arduino.h>

// Inisialisasi HSPI + XPT2046
void touchInit();

// Returns true jika ada tap baru (debounced, tidak fire ulang selama jari masih di layar)
bool touchTapped();
```

- [ ] **Step 2: Buat `apps/claude-monitor/src/touch.cpp`**

Touch CYD menggunakan SPI bus terpisah (HSPI):
- SCLK=25, MISO=39, MOSI=32, CS=33, IRQ=36

```cpp
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
```

- [ ] **Step 3: Update `src/main.cpp` — tap untuk print ke serial**

```cpp
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
```

- [ ] **Step 4: Flash dan verifikasi**

```bash
pio run --target upload && pio device monitor
```

Expected: Tap layar → serial menampilkan "Tap detected" + "Switched to page N". Angka halaman berganti di layar.

- [ ] **Step 5: Commit**

```bash
git add apps/claude-monitor/src/touch.h apps/claude-monitor/src/touch.cpp apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): touch handler with debounce on HSPI bus"
```

---

## Task 7: Screen 0 — Overview

**Files:**
- Create: `apps/claude-monitor/src/screens/overview.h`
- Create: `apps/claude-monitor/src/screens/overview.cpp`
- Modify: `apps/claude-monitor/src/display.h` (tambah drawHeader)
- Modify: `apps/claude-monitor/src/display.cpp`

Layout Screen 0 (320×240 landscape):
```
y=0..14   Header bar
y=15      separator
y=16..57  Clock strip  (42px)
y=58      separator
y=59..184 Stats area   (126px)
y=185     separator
y=186..239 Status bar  (54px)
```

- [ ] **Step 1: Tambahkan `drawHeader()` ke `display.h`**

```cpp
void drawHeader(const String& lastUpdate);
```

- [ ] **Step 2: Implementasi `drawHeader()` di `display.cpp`**

```cpp
void drawHeader(const String& lastUpdate) {
  tft.fillRect(0, 0, 320, 15, C_BG);
  tft.setTextColor(C_GREEN, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 4);
  tft.print("CLAUDE MONITOR");
  tft.setTextColor(C_DIM, C_BG);
  tft.setCursor(180, 4);
  tft.print("upd: ");
  tft.print(lastUpdate);
}
```

- [ ] **Step 3: Buat `apps/claude-monitor/src/screens/overview.h`**

```cpp
#pragma once
#include "../api_client.h"

void screenOverviewDraw(const UsageData& data, const String& timeStr, const String& dateStr);
```

- [ ] **Step 4: Buat `apps/claude-monitor/src/screens/overview.cpp`**

```cpp
#include "overview.h"
#include "../display.h"
#include "../config.h"
#include "../wifi_manager.h"
#include <Arduino.h>

static void formatTokens(uint32_t t, char* buf, size_t len) {
  if (t >= 1000000)      snprintf(buf, len, "%.1fM", t / 1000000.0f);
  else if (t >= 1000)    snprintf(buf, len, "%.0fK", t / 1000.0f);
  else                   snprintf(buf, len, "%u", t);
}

static void formatPct(uint32_t used, uint32_t limit, char* buf, size_t len) {
  if (limit == 0) snprintf(buf, len, "--%%");
  else            snprintf(buf, len, "%u%%", (used * 100) / limit);
}

static void formatResetCountdown(const char* isoReset, char* buf, size_t len) {
  // isoReset: "2026-04-24T16:32:00Z"
  // Hitung sisa waktu dari sekarang — parsing sederhana
  // Jika gagal parse, tampilkan string apa adanya
  struct tm t = {};
  if (sscanf(isoReset, "%d-%d-%dT%d:%d:%d",
      &t.tm_year, &t.tm_mon, &t.tm_mday,
      &t.tm_hour, &t.tm_min, &t.tm_sec) == 6) {
    t.tm_year -= 1900;
    t.tm_mon  -= 1;
    time_t resetEpoch = mktime(&t);
    // mktime() assumes local time; isoReset is UTC — koreksi offset
    resetEpoch -= NTP_OFFSET_SEC;
    time_t now = (time_t)clockGetEpoch();
    long diff = (long)resetEpoch - (long)now;
    if (diff <= 0) {
      snprintf(buf, len, "now");
    } else {
      int h = diff / 3600;
      int m = (diff % 3600) / 60;
      snprintf(buf, len, "%dj %dm", h, m);
    }
  } else {
    strlcpy(buf, isoReset, len > 16 ? 16 : len);
  }
}

void screenOverviewDraw(const UsageData& data, const String& timeStr, const String& dateStr) {
  displayClear();

  // Header
  char lastUpd[9] = "--:--";
  if (data.valid) strlcpy(lastUpd, timeStr.c_str(), sizeof(lastUpd));
  drawHeader(String(lastUpd));

  // Clock strip
  drawClockStrip(timeStr, dateStr);

  // ── Stats area ─────────────────────────────────────────
  uint16_t bgStats = C_BG;

  // Divider vertikal di tengah x=160
  tft.drawLine(160, 60, 160, 184, C_DIM);

  // Kiri: TOKENS
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(8, 64);
  tft.print("TOKENS HARI INI");

  char tkBuf[10];
  uint32_t totalTok = data.inputTokensToday + data.outputTokensToday;
  formatTokens(totalTok, tkBuf, sizeof(tkBuf));
  tft.setTextColor(C_GREEN, bgStats);
  tft.setTextSize(4);  // ~28px
  tft.setCursor(8, 80);
  tft.print(tkBuf);

  // Sub-info tokens
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  char inBuf[10], outBuf[10];
  formatTokens(data.inputTokensToday, inBuf, sizeof(inBuf));
  formatTokens(data.outputTokensToday, outBuf, sizeof(outBuf));
  tft.setCursor(8, 140);
  tft.printf("in:%s out:%s", inBuf, outBuf);

  // Kanan: BIAYA
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(168, 64);
  tft.print("BIAYA HARI INI");

  tft.setTextColor(C_YELLOW, bgStats);
  tft.setTextSize(3);
  tft.setCursor(168, 80);
  if (data.costToday < 10.0f) tft.printf("$%.2f", data.costToday);
  else                         tft.printf("$%.1f", data.costToday);

  // mtd
  tft.setTextColor(C_DIM, bgStats);
  tft.setTextSize(1);
  tft.setCursor(168, 140);
  tft.printf("mtd:$%.1f", data.costMonthToDate);

  // ── Status bar ─────────────────────────────────────────
  uint16_t bgBar = tft.color565(10, 26, 10);
  tft.fillRect(0, 186, 320, 54, bgBar);
  tft.drawLine(0, 185, 319, 185, C_DIM);

  // 5H USED
  char pctBuf[8];
  uint32_t used5h = data.rateLimitTokensLimit - data.rateLimitTokensRemaining;
  formatTokens(used5h, tkBuf, sizeof(tkBuf));
  char limitBuf[10];
  formatTokens(data.rateLimitTokensLimit, limitBuf, sizeof(limitBuf));
  tft.setTextColor(C_DIM, bgBar);
  tft.setTextSize(1);
  tft.setCursor(4, 192);
  tft.print("5H USED");
  tft.setTextColor(C_GREEN, bgBar);
  tft.setTextSize(1);
  tft.setCursor(4, 204);
  tft.printf("%s/%s", tkBuf, limitBuf);

  // RESET
  char rstBuf[16];
  formatResetCountdown(data.rateLimitReset, rstBuf, sizeof(rstBuf));
  tft.setTextColor(C_DIM, bgBar);
  tft.setCursor(110, 192);
  tft.print("RESET");
  tft.setTextColor(C_GREEN, bgBar);
  tft.setCursor(110, 204);
  tft.print(rstBuf);

  // WEEKLY
  tft.setTextColor(C_DIM, bgBar);
  tft.setCursor(222, 192);
  tft.print("WEEKLY");
  tft.setTextColor(C_BLUE_WK, bgBar);
  tft.setCursor(222, 204);
  formatPct(data.tokensWeekly, WEEKLY_TOKEN_LIMIT, pctBuf, sizeof(pctBuf));
  tft.print(pctBuf);
}
```

- [ ] **Step 5: Update `src/main.cpp` — tampilkan Screen 0**

```cpp
#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "touch.h"
#include "screens/overview.h"

UsageData usage;
int currentPage = 0;

void setup() {
  Serial.begin(115200);
  displayInit();
  touchInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting...");
  wifiConnect();
  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching API...");
  fetchUsageData(usage);
  screenOverviewDraw(usage, clockGetTime(), clockGetDate());
}

void loop() {
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    if (currentPage == 0) {
      drawClockStrip(clockGetTime(), clockGetDate());
    }
  }
  if (touchTapped()) {
    currentPage = (currentPage + 1) % 3;
    if (currentPage == 0) {
      screenOverviewDraw(usage, clockGetTime(), clockGetDate());
    }
  }
}
```

- [ ] **Step 6: Flash dan verifikasi**

```bash
pio run --target upload && pio device monitor
```

Expected: Screen 0 tampil lengkap — header, jam berjalan, angka token & biaya, status bar dengan 5H/reset/weekly.

- [ ] **Step 7: Commit**

```bash
git add apps/claude-monitor/src/display.h apps/claude-monitor/src/display.cpp \
        apps/claude-monitor/src/screens/overview.h apps/claude-monitor/src/screens/overview.cpp \
        apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): Screen 0 overview with clock + stats + status bar"
```

---

## Task 8: Screen 1 — Limits

**Files:**
- Create: `apps/claude-monitor/src/screens/limits.h`
- Create: `apps/claude-monitor/src/screens/limits.cpp`
- Modify: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Buat `apps/claude-monitor/src/screens/limits.h`**

```cpp
#pragma once
#include "../api_client.h"

void screenLimitsDraw(const UsageData& data);
```

- [ ] **Step 2: Buat `apps/claude-monitor/src/screens/limits.cpp`**

```cpp
#include "limits.h"
#include "../display.h"
#include <Arduino.h>

static void drawProgressBar(int x, int y, int w, int h,
                             uint32_t used, uint32_t total,
                             uint16_t fillColor, uint16_t bgColor) {
  tft.fillRect(x, y, w, h, bgColor);
  tft.drawRect(x, y, w, h, C_DIM);
  if (total > 0) {
    int fillW = (int)((float)used / total * (w - 2));
    if (fillW > 0) tft.fillRect(x + 1, y + 1, fillW, h - 2, fillColor);
  }
}

void screenLimitsDraw(const UsageData& data) {
  displayClear();
  drawHeader("LIMITS");

  uint16_t bg5h  = tft.color565(10, 26, 10);
  uint16_t bgWk  = tft.color565(10, 10, 26);

  // ── 5H Window ─────────────────────────────────────────
  tft.fillRect(4, 20, 312, 86, bg5h);
  tft.drawRect(4, 20, 312, 86, tft.color565(26, 60, 26));

  tft.setTextColor(C_DIM, bg5h);
  tft.setTextSize(1);
  tft.setCursor(10, 26);
  tft.print("WINDOW 5 JAM");

  // Reset countdown di kanan
  char rstBuf[20];
  // Re-use logic sederhana: tampilkan raw reset string, trimmed
  strlcpy(rstBuf, data.rateLimitReset, sizeof(rstBuf));
  // Tampilkan hanya jam:menit dari ISO string "2026-04-24T16:32:00Z"
  char rstShort[12] = "--:--";
  if (strlen(rstBuf) >= 16) {
    strlcpy(rstShort, rstBuf + 11, 6);  // "16:32"
  }
  tft.setTextColor(C_GREEN, bg5h);
  tft.setCursor(200, 26);
  tft.print("reset: ");
  tft.print(rstShort);

  // Progress bar
  uint32_t used5h = data.rateLimitTokensLimit - data.rateLimitTokensRemaining;
  drawProgressBar(10, 42, 300, 12, used5h, data.rateLimitTokensLimit, C_GREEN, tft.color565(13,26,13));

  // Angka
  tft.setTextColor(C_GREEN, bg5h);
  tft.setTextSize(2);
  tft.setCursor(10, 60);
  char buf[24];
  if (used5h >= 1000000)
    snprintf(buf, sizeof(buf), "%.1fM", used5h / 1000000.0f);
  else
    snprintf(buf, sizeof(buf), "%.0fK", used5h / 1000.0f);
  tft.print(buf);
  tft.setTextColor(C_DIM, bg5h);
  tft.setTextSize(1);
  tft.print(" tokens");
  tft.setCursor(10, 82);
  char limBuf[16];
  if (data.rateLimitTokensLimit >= 1000000)
    snprintf(limBuf, sizeof(limBuf), "%.1fM", data.rateLimitTokensLimit / 1000000.0f);
  else
    snprintf(limBuf, sizeof(limBuf), "%.0fK", data.rateLimitTokensLimit / 1000.0f);
  tft.printf("limit: %s tokens", limBuf);

  // ── Weekly ─────────────────────────────────────────────
  tft.fillRect(4, 114, 312, 86, bgWk);
  tft.drawRect(4, 114, 312, 86, tft.color565(26, 26, 60));

  tft.setTextColor(C_DIM, bgWk);
  tft.setTextSize(1);
  tft.setCursor(10, 120);
  tft.print("MINGGUAN");
  tft.setCursor(200, 120);
  tft.print("reset: Sen");

  drawProgressBar(10, 136, 300, 12, data.tokensWeekly, WEEKLY_TOKEN_LIMIT, C_BLUE_WK, tft.color565(13,13,26));

  tft.setTextColor(C_BLUE_WK, bgWk);
  tft.setTextSize(2);
  tft.setCursor(10, 154);
  char wkBuf[12];
  if (data.tokensWeekly >= 1000000)
    snprintf(wkBuf, sizeof(wkBuf), "%.1fM", data.tokensWeekly / 1000000.0f);
  else
    snprintf(wkBuf, sizeof(wkBuf), "%.0fK", data.tokensWeekly / 1000.0f);
  tft.print(wkBuf);
  tft.setTextColor(C_DIM, bgWk);
  tft.setTextSize(1);
  tft.print(" tokens");
  tft.setCursor(10, 176);
  tft.printf("limit: %.0fM tokens", weeklyLimit / 1000000.0f);

  // ── Top model ─────────────────────────────────────────
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 208);
  tft.print("TOP MODEL: ");
  tft.setTextColor(tft.color565(204, 136, 255), C_BG);
  tft.print(data.topModel);
}
```

- [ ] **Step 3: Update `src/main.cpp` — integrasikan Screen 1**

```cpp
#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "touch.h"
#include "screens/overview.h"
#include "screens/limits.h"

UsageData usage;
int currentPage = 0;

void renderCurrentPage() {
  if (currentPage == 0) screenOverviewDraw(usage, clockGetTime(), clockGetDate());
  else if (currentPage == 1) screenLimitsDraw(usage);
}

void setup() {
  Serial.begin(115200);
  displayInit();
  touchInit();
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting...");
  wifiConnect();
  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching API...");
  fetchUsageData(usage);
  renderCurrentPage();
}

void loop() {
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    if (currentPage == 0) drawClockStrip(clockGetTime(), clockGetDate());
  }
  if (touchTapped()) {
    currentPage = (currentPage + 1) % 3;
    renderCurrentPage();
  }
}
```

- [ ] **Step 4: Flash dan verifikasi**

```bash
pio run --target upload && pio device monitor
```

Expected: Tap layar → Screen 1 muncul dengan dua progress bar (5H + weekly) dan top model di bawah.

- [ ] **Step 5: Commit**

```bash
git add apps/claude-monitor/src/screens/limits.h apps/claude-monitor/src/screens/limits.cpp \
        apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): Screen 1 limits with progress bars"
```

---

## Task 9: Screen 2 — Budget + Main Loop Integration

**Files:**
- Create: `apps/claude-monitor/src/screens/budget.h`
- Create: `apps/claude-monitor/src/screens/budget.cpp`
- Modify: `apps/claude-monitor/src/main.cpp`

- [ ] **Step 1: Buat `apps/claude-monitor/src/screens/budget.h`**

```cpp
#pragma once
#include "../api_client.h"

void screenBudgetDraw(const UsageData& data);
```

- [ ] **Step 2: Buat `apps/claude-monitor/src/screens/budget.cpp`**

```cpp
#include "budget.h"
#include "../display.h"
#include "../config.h"
#include "../wifi_manager.h"
#include <Arduino.h>

void screenBudgetDraw(const UsageData& data) {
  displayClear();
  drawHeader("BUDGET");

  float spent   = data.costMonthToDate;
  float budget  = MONTHLY_BUDGET_USD;
  float sisa    = budget - spent;
  float pct     = (budget > 0) ? (spent / budget * 100.0f) : 0;

  // Warna progress: hijau <50%, kuning 50-80%, merah >80%
  uint16_t barColor = C_GREEN;
  if (pct > 80) barColor = C_RED;
  else if (pct > 50) barColor = C_YELLOW;

  // Label
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 20);
  tft.print("SPENT THIS MONTH");

  // Angka besar
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(4);
  tft.setCursor(8, 34);
  tft.printf("$%.2f", spent);

  // Sub: dari budget
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(8, 82);
  tft.printf("dari $%.2f limit", budget);

  // Progress bar besar
  int barY = 96;
  tft.fillRect(4, barY, 312, 18, tft.color565(26, 13, 0));
  tft.drawRect(4, barY, 312, 18, C_DIM);
  int fillW = (int)(pct / 100.0f * 310);
  if (fillW > 0) tft.fillRect(5, barY + 1, fillW, 16, barColor);
  // Persentase di dalam bar
  tft.setTextColor(TFT_WHITE, barColor);
  tft.setTextSize(1);
  tft.setCursor(140, barY + 5);
  tft.printf("%.0f%%", pct);

  // Grid 3 kolom: SISA | RATA/HARI | PROYEKSI
  // Hitung rata-rata harian: spent / hari-ke-N bulan ini
  time_t now = (time_t)clockGetEpoch();
  struct tm* t = localtime(&now);
  int dayOfMonth = t->tm_mday;
  float rataHarian = (dayOfMonth > 0) ? (spent / dayOfMonth) : 0;
  int daysInMonth = 30;  // approx
  float proyeksi = rataHarian * daysInMonth;

  uint16_t bgGrid = tft.color565(17, 13, 0);
  int gx[] = {4, 110, 216};
  const char* labels[] = {"SISA", "RATA/HARI", "PROYEKSI"};
  float values[] = {sisa, rataHarian, proyeksi};
  uint16_t vColors[] = {C_GREEN, C_YELLOW, (proyeksi > budget ? C_RED : C_YELLOW)};

  for (int i = 0; i < 3; i++) {
    tft.fillRect(gx[i], 124, 102, 52, bgGrid);
    tft.drawRect(gx[i], 124, 102, 52, C_DIM);
    tft.setTextColor(C_DIM, bgGrid);
    tft.setTextSize(1);
    tft.setCursor(gx[i] + 4, 130);
    tft.print(labels[i]);
    tft.setTextColor(vColors[i], bgGrid);
    tft.setTextSize(2);
    tft.setCursor(gx[i] + 4, 146);
    tft.printf("$%.1f", values[i]);
  }

  // Reset date
  tft.setTextColor(C_DIM, C_BG);
  tft.setTextSize(1);
  tft.setCursor(4, 186);
  // Hari tersisa: asumsi billing reset tanggal 1
  int daysLeft = daysInMonth - dayOfMonth;
  tft.printf("reset: 1 bulan depan  %d hari lagi", daysLeft);
}
```

- [ ] **Step 3: Final `src/main.cpp` — loop lengkap dengan refresh API 5 menit**

```cpp
#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "touch.h"
#include "screens/overview.h"
#include "screens/limits.h"
#include "screens/budget.h"
#include "config.h"

UsageData usage;
int currentPage = 0;

void renderCurrentPage() {
  switch (currentPage) {
    case 0: screenOverviewDraw(usage, clockGetTime(), clockGetDate()); break;
    case 1: screenLimitsDraw(usage);  break;
    case 2: screenBudgetDraw(usage);  break;
  }
}

void setup() {
  Serial.begin(115200);
  displayInit();
  touchInit();

  // Tampilkan status loading
  tft.setTextColor(C_YELLOW, C_BG);
  tft.setTextSize(1);
  tft.setCursor(10, 110);
  tft.print("Connecting WiFi...");
  wifiConnect();

  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Syncing time...");
  // NTP sudah di-update di wifiConnect()

  tft.fillScreen(C_BG);
  tft.setCursor(10, 110);
  tft.print("Fetching usage...");
  fetchUsageData(usage);

  renderCurrentPage();
}

void loop() {
  // Update jam setiap detik (hanya di page 0)
  static unsigned long lastClockUpdate = 0;
  if (millis() - lastClockUpdate >= 1000) {
    lastClockUpdate = millis();
    if (currentPage == 0) {
      drawClockStrip(clockGetTime(), clockGetDate());
    }
  }

  // Refresh API setiap REFRESH_INTERVAL_MS
  static unsigned long lastApiRefresh = 0;
  if (millis() - lastApiRefresh >= REFRESH_INTERVAL_MS) {
    lastApiRefresh = millis();
    Serial.println("[Main] Refreshing API...");
    fetchUsageData(usage);
    renderCurrentPage();
  }

  // Touch: cycle pages
  if (touchTapped()) {
    currentPage = (currentPage + 1) % 3;
    renderCurrentPage();
  }
}
```

- [ ] **Step 4: Flash dan verifikasi end-to-end**

```bash
pio run --target upload && pio device monitor
```

Expected flow:
1. Layar tampil "Connecting WiFi..." → "Syncing time..." → "Fetching usage..."
2. Screen 0 muncul: jam berjalan, token & biaya, status bar
3. Tap → Screen 1 (limits + progress bars)
4. Tap → Screen 2 (budget + grid)
5. Tap → kembali Screen 0
6. Setelah 5 menit: refresh otomatis (cek serial "Refreshing API...")

- [ ] **Step 5: Commit final**

```bash
git add apps/claude-monitor/src/screens/budget.h apps/claude-monitor/src/screens/budget.cpp \
        apps/claude-monitor/src/main.cpp
git commit -m "feat(claude-monitor): Screen 2 budget + complete main loop with 5min refresh"
```

---

## Checklist Verifikasi Akhir

- [ ] `pio run` compile tanpa warning kritis
- [ ] Screen 0: jam bergerak tiap detik
- [ ] Screen 0: data token & biaya muncul (bukan 0 semua)
- [ ] Tap → cycle 3 screens dan kembali ke 0
- [ ] Serial log menampilkan API response valid (bukan HTTP 401/404)
- [ ] Setelah 5 menit: data di-refresh otomatis
- [ ] `config.h` tidak ikut ter-commit (`git status` tidak menampilkannya)
