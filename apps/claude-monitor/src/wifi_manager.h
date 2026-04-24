#pragma once
#include <NTPClient.h>
#include <WiFiUDP.h>

extern NTPClient timeClient;

void wifiConnect();
void wifiEnsureConnected();
String clockGetTime();    // returns "HH:MM:SS"
String clockGetDate();    // returns "Senin, 24 Apr 2026"
long  clockGetEpoch();
