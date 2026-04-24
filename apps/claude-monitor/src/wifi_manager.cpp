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
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 30000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connect failed! Check credentials.");
    // Don't halt — continue so display shows something
    return;
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
