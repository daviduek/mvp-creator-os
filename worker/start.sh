#!/bin/bash
# IMPORTANT: do not block on ComfyUI here.
# RunPod marks workers unhealthy if the handler doesn't register fast.
# ComfyUI takes 30-60s to boot — we start it in background and let the
# handler's wait_until_ready() block on the FIRST request instead of at boot.

echo "[start] Booting ComfyUI in background..."
cd /workspace/ComfyUI

# Pipe ComfyUI output through `tee` so we see it in the RunPod dashboard
# in addition to the file. Send to /dev/stdout so it lands in the main log stream.
python -u main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch 2>&1 \
  | tee /tmp/comfy.log \
  | sed -u 's/^/[comfy] /' &
COMFY_PID=$!
echo "[start] ComfyUI PID=$COMFY_PID"

echo "[start] Launching RunPod handler immediately..."
cd /worker
exec python -u handler.py
