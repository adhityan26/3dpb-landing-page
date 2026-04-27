#!/usr/bin/env python3
import os
import json
import time
import glob
import datetime
import paho.mqtt.client as mqtt

CLAUDE_DIR   = os.environ.get("CLAUDE_DIR", os.path.expanduser("~/.claude"))
MQTT_BROKER  = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT    = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC   = os.environ.get("MQTT_TOPIC", "claude/usage/total")
INTERVAL_SEC = int(os.environ.get("INTERVAL_SEC", "300"))


def parse_all(projects_dir: str, since: datetime.date) -> dict:
    """Scan all project JSONL files, return aggregated usage keyed by ISO date."""
    by_date: dict[str, dict] = {}

    for path in glob.glob(os.path.join(projects_dir, "**", "*.jsonl"), recursive=True):
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    d = json.loads(line)
                    msg = d.get("message", {})
                    usage = msg.get("usage")
                    if not usage:
                        continue
                    ts = d.get("timestamp", "")
                    if len(ts) < 10:
                        continue
                    try:
                        entry_date = datetime.date.fromisoformat(ts[:10])
                    except ValueError:
                        continue
                    if entry_date < since:
                        continue

                    key = entry_date.isoformat()
                    if key not in by_date:
                        by_date[key] = {
                            "input": 0, "output": 0,
                            "cache_read": 0, "cache_creation": 0,
                            "sessions": set(), "model_tokens": {},
                        }
                    r = by_date[key]
                    r["input"]          += usage.get("input_tokens", 0)
                    r["output"]         += usage.get("output_tokens", 0)
                    r["cache_read"]     += usage.get("cache_read_input_tokens", 0)
                    r["cache_creation"] += usage.get("cache_creation_input_tokens", 0)
                    r["sessions"].add(path)
                    model = msg.get("model", "")
                    if model:
                        t = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
                        r["model_tokens"][model] = r["model_tokens"].get(model, 0) + t
        except Exception:
            continue

    return by_date


def agg_range(by_date: dict, start: datetime.date, end: datetime.date) -> dict:
    result = {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0,
              "sessions": set(), "model_tokens": {}}
    d = start
    while d <= end:
        day = by_date.get(d.isoformat())
        if day:
            result["input"]          += day["input"]
            result["output"]         += day["output"]
            result["cache_read"]     += day["cache_read"]
            result["cache_creation"] += day["cache_creation"]
            result["sessions"]       |= day["sessions"]
            for m, t in day["model_tokens"].items():
                result["model_tokens"][m] = result["model_tokens"].get(m, 0) + t
        d += datetime.timedelta(days=1)
    return result


def build_payload() -> dict:
    today       = datetime.date.today()
    week_start  = today - datetime.timedelta(days=7)
    month_start = today.replace(day=1)

    projects_dir = os.path.join(CLAUDE_DIR, "projects")
    by_date = parse_all(projects_dir, month_start)

    td = agg_range(by_date, today, today)
    wk = agg_range(by_date, week_start, today)
    mo = agg_range(by_date, month_start, today)

    top = max(td["model_tokens"], key=td["model_tokens"].get) if td["model_tokens"] else ""

    return {
        "inputTokensToday":   td["input"],
        "outputTokensToday":  td["output"],
        "cacheReadToday":     td["cache_read"],
        "cacheCreationToday": td["cache_creation"],
        "tokensWeekly":       wk["input"] + wk["output"],
        "tokensMonthly":      mo["input"] + mo["output"],
        "sessionsToday":      len(td["sessions"]),
        "topModel":           top,
        "ts":                 int(time.time()),
    }


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="claude-usage-publisher")
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    print(f"[publisher] CLAUDE_DIR={CLAUDE_DIR}  broker={MQTT_BROKER}:{MQTT_PORT}  interval={INTERVAL_SEC}s")

    while True:
        try:
            payload = build_payload()
            client.publish(MQTT_TOPIC, json.dumps(payload), retain=True)
            print(f"[publisher] {datetime.datetime.now().strftime('%H:%M:%S')} → {payload}")
        except Exception as e:
            print(f"[publisher] error: {e}")
        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
