# syntax=docker/dockerfile:1.7
# CyberRealistic Pony + Sasha LoRA + IP-Adapter FaceID Plus v2 + Face Detailer
# Identity-locked image generation.
FROM runpod/worker-comfyui:5.5.0-base

# --- LoRA personaje (entrenado sobre Pony V6 XL) ---
RUN mkdir -p /comfyui/models/loras \
 && wget -q -O /comfyui/models/loras/sashavan_pony.safetensors \
    "https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan_pony.safetensors"

# --- Checkpoint base ---
RUN --mount=type=secret,id=civitai_token \
    mkdir -p /comfyui/models/checkpoints \
 && TOKEN="$(cat /run/secrets/civitai_token)" \
 && wget --tries=3 --timeout=60 \
    -O /comfyui/models/checkpoints/cyberrealisticPony.safetensors \
    "https://civitai.com/api/download/models/2884631?token=${TOKEN}" \
 && test $(stat -c %s /comfyui/models/checkpoints/cyberrealisticPony.safetensors) -gt 5000000000

# --- Lustify SDXL (premium photoreal NSFW) — for high-quality explicit bodies ---
RUN --mount=type=secret,id=civitai_token \
    TOKEN="$(cat /run/secrets/civitai_token)" \
 && wget --tries=3 --timeout=120 \
    -O /comfyui/models/checkpoints/lustifySDXL.safetensors \
    "https://civitai.com/api/download/models/2808677?token=${TOKEN}" \
 && test $(stat -c %s /comfyui/models/checkpoints/lustifySDXL.safetensors) -gt 5000000000

# --- SDXL VAE ---
RUN mkdir -p /comfyui/models/vae \
 && wget -q -O /comfyui/models/vae/sdxl_vae.safetensors \
    "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors"

# --- IP-Adapter FaceID Plus v2 SDXL ---
# Main adapter weights + the helper LoRA it requires.
RUN mkdir -p /comfyui/models/ipadapter \
 && wget -q -O /comfyui/models/ipadapter/ip-adapter-faceid-plusv2_sdxl.bin \
    "https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid-plusv2_sdxl.bin" \
 && wget -q -O /comfyui/models/loras/ip-adapter-faceid-plusv2_sdxl_lora.safetensors \
    "https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid-plusv2_sdxl_lora.safetensors"

# --- CLIP Vision for IP-Adapter image encoding ---
RUN mkdir -p /comfyui/models/clip_vision \
 && wget -q -O /comfyui/models/clip_vision/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors \
    "https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors"

# --- InsightFace antelopev2 (face detection + embedding for IP-Adapter FaceID) ---
RUN mkdir -p /comfyui/models/insightface/models/antelopev2 \
 && cd /comfyui/models/insightface/models/antelopev2 \
 && wget -q -O 1k3d68.onnx "https://huggingface.co/MonsterMMORPG/tools/resolve/main/1k3d68.onnx" \
 && wget -q -O 2d106det.onnx "https://huggingface.co/MonsterMMORPG/tools/resolve/main/2d106det.onnx" \
 && wget -q -O genderage.onnx "https://huggingface.co/MonsterMMORPG/tools/resolve/main/genderage.onnx" \
 && wget -q -O glintr100.onnx "https://huggingface.co/MonsterMMORPG/tools/resolve/main/glintr100.onnx" \
 && wget -q -O scrfd_10g_bnkps.onnx "https://huggingface.co/MonsterMMORPG/tools/resolve/main/scrfd_10g_bnkps.onnx"

# --- YOLO face detector (for Face Detailer second pass) ---
RUN mkdir -p /comfyui/models/ultralytics/bbox \
 && wget -q -O /comfyui/models/ultralytics/bbox/face_yolov8m.pt \
    "https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt"

# --- ComfyUI custom nodes: IP-Adapter Plus + Impact Pack + Impact Subpack ---
# Impact Subpack provides UltralyticsDetectorProvider (the YOLO loader for FaceDetailer).
# It must live as a SIBLING of Impact Pack under custom_nodes, not nested inside.
RUN cd /comfyui/custom_nodes \
 && git clone --depth=1 https://github.com/cubiq/ComfyUI_IPAdapter_plus.git \
 && git clone --depth=1 https://github.com/ltdrdata/ComfyUI-Impact-Pack.git \
 && git clone --depth=1 https://github.com/ltdrdata/ComfyUI-Impact-Subpack.git \
 && git clone --depth=1 https://github.com/Gourieff/ComfyUI-ReActor.git

# --- ReActor face-swap model (inswapper) + buffalo_l for exact Sasha identity ---
RUN mkdir -p /comfyui/models/insightface \
 && wget -q -O /comfyui/models/insightface/inswapper_128.onnx \
    "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/inswapper_128.onnx" \
 && test $(stat -c %s /comfyui/models/insightface/inswapper_128.onnx) -gt 200000000
RUN mkdir -p /root/.insightface/models && cd /root/.insightface/models \
 && wget -q -O buffalo_l.zip "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip" \
 && python -c "import zipfile; zipfile.ZipFile('buffalo_l.zip').extractall('buffalo_l')" \
 && rm buffalo_l.zip

# --- Python deps for IP-Adapter FaceID + Impact Pack ---
# insightface compiles native code → need build tools first.
# Pin Cython + numpy < 2 because newer numpy breaks insightface 0.7.3.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential g++ python3-dev python3.12-dev \
 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir "Cython>=0.29" "numpy<2" \
 && pip install --no-cache-dir \
    insightface==0.7.3 \
    onnxruntime-gpu==1.18.1 \
    ultralytics \
 && pip install --no-cache-dir -r /comfyui/custom_nodes/ComfyUI-Impact-Pack/requirements.txt \
 && pip install --no-cache-dir -r /comfyui/custom_nodes/ComfyUI-Impact-Subpack/requirements.txt \
 && (pip install --no-cache-dir -r /comfyui/custom_nodes/ComfyUI-ReActor/requirements.txt || true)

# --- Canon face references (5 imágenes de Sasha en /comfyui/input/) ---
RUN mkdir -p /comfyui/input/face_refs \
 && for i in 01 02 03 04 05; do \
      wget -q -O /comfyui/input/face_refs/sasha_canon_${i}.png \
        "https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/face_refs/sasha_canon_${i}.png" ; \
    done \
 && ls -la /comfyui/input/face_refs/
