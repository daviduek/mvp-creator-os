#!/bin/bash
# Aggressive diagnostic version.

# Use stderr too (RunPod usually captures both)
echo "=== [start.sh] BEGIN ===" 1>&2
echo "=== [start.sh] BEGIN ==="
date
echo "[start.sh] PWD=$(pwd)"
echo "[start.sh] which python: $(which python)"
echo "[start.sh] python version: $(python --version 2>&1)"
echo "[start.sh] ls /worker:"
ls -la /worker
echo "[start.sh] ls /workspace:"
ls -la /workspace || echo "  /workspace MISSING"
echo "[start.sh] ls /workspace/ComfyUI (first 10):"
ls -la /workspace/ComfyUI 2>&1 | head -10 || echo "  /workspace/ComfyUI MISSING — volume mount might be overlaying!"

echo "[start.sh] env vars (filtered):"
env | grep -E '^(R2_|SASHA_|COMFY_|RUNPOD_|PYTHON)' | sed 's/SECRET[^=]*=.*/SECRET=***REDACTED***/' | sed 's/ACCESS_KEY[^=]*=.*/ACCESS_KEY=***REDACTED***/'

echo "[start.sh] Booting ComfyUI in background (logs → /tmp/comfy.log)..."
if [ -d /workspace/ComfyUI ]; then
  cd /workspace/ComfyUI
  python -u main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch > /tmp/comfy.log 2>&1 &
  COMFY_PID=$!
  echo "[start.sh] ComfyUI PID=$COMFY_PID"
else
  echo "[start.sh] WARNING: /workspace/ComfyUI not present at runtime. Handler will block on wait_until_ready."
fi

echo "[start.sh] Launching handler.py with full unbuffered I/O..."
cd /worker
exec python -u handler.py 2>&1
