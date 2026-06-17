#!/bin/bash
set -e

echo "[start] Lanzando ComfyUI en background..."
cd /workspace/ComfyUI
python main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch &

echo "[start] Esperando ComfyUI..."
for i in $(seq 1 60); do
  if curl -fs http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then
    echo "[start] ComfyUI listo."
    break
  fi
  sleep 2
done

echo "[start] Arrancando handler de RunPod..."
cd /worker
exec python handler.py
