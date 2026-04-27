#include "gold_client.h"
#include "wifi_manager.h"
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

static const char* GOLD_URL =
  "https://sahabat.pegadaian.co.id/gold/prices/chart?interval=30&isRequest=true";

bool fetchGoldData(GoldData& out) {
  memset(&out, 0, sizeof(out));
  out.valid = false;

  wifiEnsureConnected();

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  if (!http.begin(client, GOLD_URL)) return false;
  http.addHeader("User-Agent", "Mozilla/5.0");
  http.addHeader("Accept",     "application/json");
  http.addHeader("Referer",    "https://sahabat.pegadaian.co.id/harga-emas");

  int code = http.GET();
  Serial.printf("[Gold] GET %d\n", code);
  if (code != 200) { http.end(); return false; }

  String body = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok) return false;

  JsonArray list  = doc["data"]["priceList"].as<JsonArray>();
  JsonArray xAxis = doc["data"]["xAxis"].as<JsonArray>();
  if (list.isNull() || list.size() == 0) return false;

  out.histCount = min((int)list.size(), GOLD_HISTORY_MAX);
  for (int i = 0; i < out.histCount; i++) {
    // Dari sudut pandang user: beli = hargaJual (kita bayar ke Pegadaian), jual = hargaBeli (kita terima dari Pegadaian)
    out.history[i].buy  = (uint32_t)atoi(list[i]["hargaJual"] | "0");
    out.history[i].sell = (uint32_t)atoi(list[i]["hargaBeli"] | "0");
    strlcpy(out.history[i].date, xAxis[i]["lastUpdate"] | "", sizeof(out.history[i].date));
  }

  out.current = out.history[out.histCount - 1];
  out.fetchedAt = (time_t)clockGetEpoch();
  out.valid = true;

  Serial.printf("[Gold] buy=%u sell=%u histCount=%d\n",
    out.current.buy, out.current.sell, out.histCount);
  return true;
}
