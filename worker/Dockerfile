FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip python3-venv git wget curl ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.10 /usr/bin/python

WORKDIR /workspace

# ComfyUI
RUN git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git
RUN pip install --upgrade pip && \
    pip install torch==2.3.1 torchvision==0.18.1 --index-url https://download.pytorch.org/whl/cu121 && \
    pip install -r ComfyUI/requirements.txt

# Custom nodes
WORKDIR /workspace/ComfyUI/custom_nodes
RUN git clone --depth 1 https://github.com/ltdrdata/ComfyUI-Manager.git && \
    git clone --depth 1 https://github.com/Fannovel16/comfyui_controlnet_aux.git && \
    git clone --depth 1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git && \
    git clone --depth 1 https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git && \
    git clone --depth 1 https://github.com/kijai/ComfyUI-MimicMotionWrapper.git

# Worker
WORKDIR /worker
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY *.py ./
COPY comfy_workflows ./comfy_workflows
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV COMFY_URL=http://127.0.0.1:8188 \
    COMFY_MODELS_DIR=/workspace/ComfyUI/models \
    COMFY_INPUT_DIR=/workspace/ComfyUI/input

CMD ["/start.sh"]
