#!/bin/sh
# Start a virtual X display so Chrome can run in "headed" mode on Railway.
# Google detects --headless=new; Xvfb is invisible but not flagged.
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Give Xvfb a moment to initialise
sleep 2

echo "[start.sh] Xvfb started (PID $XVFB_PID) on DISPLAY=:99"
echo "[start.sh] Starting uvicorn on port ${PORT:-8001}"

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8001}"
