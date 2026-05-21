#!/bin/sh
# Start a virtual X display so Chrome can run in "headed" mode on Railway.
# Google detects --headless=new; Xvfb is invisible but not flagged.

# Remove stale lock from a previous crashed run — Railway restarts the container
# process but the /tmp filesystem persists, so Xvfb :99 fails with "already active".
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Give Xvfb a moment to initialise
sleep 2

echo "[start.sh] Xvfb started (PID $XVFB_PID) on DISPLAY=:99"
echo "[start.sh] Starting uvicorn on port ${PORT:-8001}"

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8001}"
