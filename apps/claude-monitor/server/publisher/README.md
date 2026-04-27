# Claude Usage Publisher

Baca token usage dari `~/.claude/projects/**/*.jsonl` dan publish ke MQTT broker tiap N detik.

## Install & Start

```bash
# Install deps + register launchd (auto-start saat login)
MQTT_BROKER=192.168.1.xxx ./install.sh

# Opsional: ubah interval (default 300 detik)
MQTT_BROKER=192.168.1.xxx INTERVAL_SEC=120 ./install.sh
```

## Stop

```bash
launchctl unload ~/Library/LaunchAgents/com.3dpb.claude-publisher.plist
```

## Start (setelah stop)

```bash
launchctl load -w ~/Library/LaunchAgents/com.3dpb.claude-publisher.plist
```

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.3dpb.claude-publisher.plist
rm ~/Library/LaunchAgents/com.3dpb.claude-publisher.plist
```

## Logs

```bash
tail -f ~/Library/Logs/claude-publisher/publisher.log
tail -f ~/Library/Logs/claude-publisher/publisher.err
```

## Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `MQTT_BROKER` | `192.168.1.xxx` | IP broker Mosquitto |
| `MQTT_PORT` | `1883` | Port broker |
| `MQTT_TOPIC` | `claude/usage/total` | Topic MQTT |
| `INTERVAL_SEC` | `300` | Interval polling (detik) |
| `CLAUDE_DIR` | `~/.claude` | Path folder Claude Code |
