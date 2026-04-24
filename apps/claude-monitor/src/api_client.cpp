#include "api_client.h"
#include "config.h"
#include "wifi_manager.h"
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

static const char* API_HOST = "api.anthropic.com";
static const char* USAGE_PATH = "/v1/usage";

// Helper: fetch token+cost aggregate for a date range (no rate limit headers)
static bool fetchRangeAggregate(const String& startDate, const String& endDate,
                                 uint32_t& tokensOut, float& costOut) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = String("https://") + API_HOST + USAGE_PATH;
  url += "?start_time=" + startDate + "T00:00:00Z&end_time=" + endDate + "T23:59:59Z";

  if (!http.begin(client, url)) return false;
  http.addHeader("x-api-key", ANTHROPIC_API_KEY);
  http.addHeader("anthropic-version", "2023-06-01");

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[API] range %s->%s HTTP %d\n", startDate.c_str(), endDate.c_str(), code);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok) return false;
  JsonArray data = doc["data"].as<JsonArray>();
  if (data.isNull()) return false;

  tokensOut = 0;
  costOut = 0.0f;
  for (JsonObject entry : data) {
    tokensOut += (uint32_t)(entry["input_tokens"] | 0) + (uint32_t)(entry["output_tokens"] | 0);
    float cost = 0.0f;
    if (!entry["cost"].isNull()) cost = entry["cost"].as<float>();
    else cost = (entry["input_cost"] | 0.0f) + (entry["output_cost"] | 0.0f);
    costOut += cost;
  }
  return true;
}

bool fetchUsageData(UsageData& out) {
  memset(&out, 0, sizeof(out));
  out.valid = false;

  wifiEnsureConnected();

  WiFiClientSecure client;
  client.setInsecure();  // skip cert validation

  HTTPClient http;
  String url = String("https://") + API_HOST + USAGE_PATH;
  // Query: usage hari ini (today)
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

  // Register headers to collect from response
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

  // Get rate limit headers
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

  // Anthropic usage API response structure:
  // { "data": [ { "model": "...", "input_tokens": N, "output_tokens": N, ... } ] }
  // Aggregate all models for today's total
  JsonArray data = doc["data"].as<JsonArray>();
  if (data.isNull()) {
    strlcpy(out.errorMsg, "no data array in response", sizeof(out.errorMsg));
    return false;
  }
  uint32_t maxModelTokens = 0;

  for (JsonObject entry : data) {
    uint32_t inp = entry["input_tokens"] | 0;
    uint32_t out2 = entry["output_tokens"] | 0;
    out.inputTokensToday  += inp;
    out.outputTokensToday += out2;

    // Cost — field may be "input_cost" + "output_cost" or "cost"
    float cost = 0.0f;
    if (!entry["cost"].isNull()) {
      cost = entry["cost"].as<float>();
    } else {
      cost = (entry["input_cost"] | 0.0f) + (entry["output_cost"] | 0.0f);
    }
    out.costToday += cost;

    // Top model by token count
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

  // Fetch monthly cost
  {
    time_t now = (time_t)clockGetEpoch();
    struct tm* t = localtime(&now);
    char monthStart[12];
    snprintf(monthStart, sizeof(monthStart), "%04d-%02d-01", 1900+t->tm_year, t->tm_mon+1);
    uint32_t dummy;
    fetchRangeAggregate(String(monthStart), today, dummy, out.costMonthToDate);
  }

  // Fetch weekly tokens (last 7 days)
  {
    time_t now = (time_t)clockGetEpoch();
    time_t weekAgo = now - (7 * 24 * 3600);
    struct tm* t7 = localtime(&weekAgo);
    char weekStart[12];
    snprintf(weekStart, sizeof(weekStart), "%04d-%02d-%02d", 1900+t7->tm_year, t7->tm_mon+1, t7->tm_mday);
    float dummyCost;
    fetchRangeAggregate(String(weekStart), today, out.tokensWeekly, dummyCost);
  }

  return true;
}
