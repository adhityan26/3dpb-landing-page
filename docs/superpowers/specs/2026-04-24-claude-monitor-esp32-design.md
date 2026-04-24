# Claude Monitor ESP32 — Design Spec

**Date:** 2026-04-24  
**Device:** ESP32-2432S028 (Cheap Yellow Display / CYD)  
**Status:** Approved

---

## 1. Tujuan

Membuat display fisik yang menampilkan statistik penggunaan Claude API secara real-time. Device dipasang di meja kerja sebagai monitor pasif — tidak butuh interaksi untuk info utama, tapi bisa tap untuk detail.

---

## 2. Hardware

| Komponen | Spesifikasi |
|---|---|
| Board | ESP32-2432S028 |
| Display | ILI9341, 320×240px, SPI |
| Touch | XPT2046, SPI bus terpisah |
| Koneksi | WiFi 2.4GHz (built-in) |
| Firmware saat ini | openHASP → perlu reflash |

**Pin config (TFT_eSPI `User_Setup.h`):**
- TFT: SPI1, CS=15, DC=2, RST=-1, MOSI=13, SCLK=14, BL=21
- Touch: SPI2, CS=33, IRQ=36

---

## 3. Arsitektur Sistem

```
ESP32
 └─ WiFi → HTTPS GET api.anthropic.com/v1/usage
 └─ Parse JSON response + rate limit headers
 └─ Render ke TFT_eSPI
 └─ Tap XPT2046 → ganti screen
```

**Data source:** Anthropic API langsung dari ESP32 (HTTPS). API key disimpan di `config.h` (tidak di-commit ke repo). Migrasi ke proxy server lokal direncanakan sebagai fase berikutnya.

**Refresh interval:** setiap 5 menit (configurable di `config.h`).

---

## 4. Struktur Project

```
apps/claude-monitor/
├── platformio.ini
├── .gitignore                # mengecualikan config.h
├── src/
│   ├── main.cpp
│   ├── config.h              # WiFi creds, API key, intervals — gitignored
│   ├── config.h.example      # template tanpa nilai sensitif — di-commit
│   ├── wifi_manager.cpp/h
│   ├── api_client.cpp/h
│   ├── display.cpp/h
│   ├── touch.cpp/h
│   └── screens/
│       ├── overview.cpp/h    # Screen 0
│       ├── limits.cpp/h      # Screen 1
│       └── budget.cpp/h      # Screen 2
└── include/
    └── User_Setup.h          # TFT_eSPI pin config untuk CYD
```

`src/config.h` dikecualikan via `apps/claude-monitor/.gitignore` — berisi credentials.

---

## 5. Library Dependencies (`platformio.ini`)

```ini
[env:cyd]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
  bodmer/TFT_eSPI
  bblanchon/ArduinoJson
  paulstoffregen/XPT2046_Touchscreen
  arduino-libraries/NTPClient
```

`WiFiClientSecure` dan `WiFiUDP` tersedia dari ESP32 Arduino Core (built-in).

NTP server default: `pool.ntp.org`, timezone offset dikonfigurasi di `config.h` (contoh: WIB = UTC+7 → 25200 detik).

---

## 6. Layar & UI

Navigasi: tap layar mana pun → cycle ke screen berikutnya.

### Screen 0 — Overview (default)
- Header: "⚡ CLAUDE MONITOR" + timestamp update terakhir
- **Clock strip:** jam digital (HH:MM:SS, biru) + hari & tanggal di kanan — sinkronisasi via NTP
- Area utama: dua kolom besar — **TOKENS HARI INI** (hijau) dan **BIAYA HARI INI** (kuning)
- Sub-info: token input/output breakdown, month-to-date cost
- Status bar bawah: 5H USED · 5H RESET countdown · WEEKLY %

### Screen 1 — Limits Detail
- **Window 5 Jam:** progress bar + used/total tokens + countdown reset
- **Mingguan:** progress bar + used/total tokens + tanggal reset
- Top model yang paling banyak digunakan

### Screen 2 — Budget Bulanan
- Angka besar: total spent this month
- Progress bar besar dengan persentase
- Grid 3 kolom: SISA · RATA/HARI · PROYEKSI akhir bulan
- Tanggal reset billing cycle

**Skema warna:**
- Biru `#aaaaff` → jam & tanggal
- Hijau `#00ff88` → token / rate limit
- Kuning `#ffaa00` → biaya / budget
- Biru `#8888ff` → weekly
- Background gelap `#0a0a0f`

---

## 7. Data dari API

Data utama dari `GET /v1/usage` (membutuhkan API key dengan permission usage).

Rate limit info dari response headers:
- `anthropic-ratelimit-tokens-limit`
- `anthropic-ratelimit-tokens-remaining`
- `anthropic-ratelimit-tokens-reset`

> **Catatan implementasi:** Perlu verifikasi saat implementasi apakah Anthropic menyediakan window 5-jam secara eksplisit via header/endpoint, atau perlu di-derive dari data yang tersedia. Field di screen disesuaikan dengan apa yang tersedia.

---

## 8. Keamanan

- `config.h` (WiFi SSID/pass + API key) masuk `.gitignore`
- API key disimpan hanya di device, tidak dikirim ke server lain
- Fase berikutnya: migrasi ke proxy server lokal supaya API key tidak ada di firmware

---

## 9. Flash Process

1. Install PlatformIO extension di VS Code
2. Buka `apps/claude-monitor/` sebagai project
3. Salin `config.h.example` → `config.h`, isi credentials
4. Hubungkan ESP32 via USB
5. `pio run --target upload`

openHASP akan tertimpa otomatis saat flash pertama.

---

## 10. Out of Scope (fase ini)

- Proxy server lokal (direncanakan fase 2)
- OTA update
- Alert / notifikasi (buzzer, LED)
- Grafik historis penggunaan
