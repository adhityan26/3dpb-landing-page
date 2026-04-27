#include "api_client.h"
#include "config.h"
#include "wifi_manager.h"
#include "screens/printers.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <time.h>

static WiFiClient  wifiClient;
static PubSubClient mqtt(wifiClient);

static UsageData _latest;
static bool      _hasNew = false;
static bool      _printersNew = false;

static void onMessage(char* topic, byte* payload, unsigned int length) {
  Serial.printf("[MQTT] msg topic=%s len=%u\n", topic, length);

  if (strcmp(topic, "3dpb/printers") == 0) {
    parsePrintersJson((const char*)payload, length);
    _printersNew = true;
    return;
  }

  JsonDocument doc;
  if (deserializeJson(doc, payload, length) != DeserializationError::Ok) {
    Serial.println("[MQTT] JSON parse error");
    return;
  }
  _latest.inputTokensToday   = doc["inputTokensToday"]   | 0U;
  _latest.outputTokensToday  = doc["outputTokensToday"]  | 0U;
  _latest.cacheReadToday     = doc["cacheReadToday"]     | 0U;
  _latest.cacheCreationToday = doc["cacheCreationToday"] | 0U;
  _latest.tokensWeekly       = doc["tokensWeekly"]       | 0U;
  _latest.tokensMonthly      = doc["tokensMonthly"]      | 0U;
  _latest.sessionsToday      = doc["sessionsToday"]      | 0U;
  const char* m = doc["topModel"] | "";
  strlcpy(_latest.topModel, m, sizeof(_latest.topModel));
  _latest.updatedAt = (time_t)(doc["ts"].as<uint32_t>());
  _latest.valid     = true;
  _hasNew           = true;
  Serial.printf("[MQTT] in=%u out=%u cacheR=%u weekly=%u monthly=%u sessions=%u\n",
    _latest.inputTokensToday, _latest.outputTokensToday,
    _latest.cacheReadToday, _latest.tokensWeekly,
    _latest.tokensMonthly, _latest.sessionsToday);
}

static void mqttReconnect() {
  if (mqtt.connected()) return;
  wifiEnsureConnected();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setBufferSize(4096);
  mqtt.setCallback(onMessage);
  Serial.printf("[MQTT] connecting to %s:%d ...\n", MQTT_BROKER, MQTT_PORT);
  if (mqtt.connect(MQTT_CLIENT_ID)) {
    mqtt.subscribe(MQTT_TOPIC);
    mqtt.subscribe("3dpb/printers");
    Serial.printf("[MQTT] subscribed to %s + 3dpb/printers\n", MQTT_TOPIC);
    // Flush incoming retained messages (tunggu lebih lama untuk payload besar)
    for (int i = 0; i < 100; i++) {
      mqtt.loop();
      delay(20);
    }
  } else {
    Serial.printf("[MQTT] failed, state=%d\n", mqtt.state());
  }
}

bool fetchUsageData(UsageData& out) {
  mqttReconnect();
  out = _latest;
  return _latest.valid;
}

void mqttLoop(UsageData& out) {
  if (!mqtt.connected()) mqttReconnect();
  mqtt.loop();
  if (_hasNew) {
    out     = _latest;
    _hasNew = false;
  }
}

bool mqttConnected() {
  return mqtt.connected();
}

bool printersUpdated() {
  if (_printersNew) { _printersNew = false; return true; }
  return false;
}
