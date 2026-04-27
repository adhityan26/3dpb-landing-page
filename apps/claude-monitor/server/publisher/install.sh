#!/bin/bash
set -e

PLIST_LABEL="com.3dpb.claude-publisher"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_LABEL.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLISHER="$SCRIPT_DIR/publisher.py"
PYTHON="$(which python3)"
LOG_DIR="$HOME/Library/Logs/claude-publisher"

# ── Config ────────────────────────────────────────────────────
MQTT_BROKER="${MQTT_BROKER:-192.168.1.xxx}"
MQTT_PORT="${MQTT_PORT:-1883}"
MQTT_TOPIC="${MQTT_TOPIC:-claude/usage/total}"
INTERVAL_SEC="${INTERVAL_SEC:-300}"

echo "Python   : $PYTHON"
echo "Script   : $PUBLISHER"
echo "Broker   : $MQTT_BROKER:$MQTT_PORT"
echo "Interval : ${INTERVAL_SEC}s"
echo ""

# ── Install deps ──────────────────────────────────────────────
pip3 install -q -r "$SCRIPT_DIR/requirements.txt"

# ── Create log dir ────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Write plist ───────────────────────────────────────────────
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON</string>
    <string>-u</string>
    <string>$PUBLISHER</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>MQTT_BROKER</key>   <string>$MQTT_BROKER</string>
    <key>MQTT_PORT</key>     <string>$MQTT_PORT</string>
    <key>MQTT_TOPIC</key>    <string>$MQTT_TOPIC</string>
    <key>INTERVAL_SEC</key>  <string>$INTERVAL_SEC</string>
  </dict>

  <key>RunAtLoad</key>   <true/>
  <key>KeepAlive</key>   <true/>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/publisher.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/publisher.err</string>
</dict>
</plist>
EOF

# ── Load ──────────────────────────────────────────────────────
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load -w "$PLIST_PATH"

echo "✓ Installed and started."
echo "  Logs : $LOG_DIR/publisher.log"
echo "  Stop : launchctl unload $PLIST_PATH"
