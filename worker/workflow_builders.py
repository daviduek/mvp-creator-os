"""Translate our high-level workflow JSON into a real ComfyUI graph.

Each builder loads a base template from comfy_workflows/<type>.json
and patches in the parameters (prompts, urls, weights, etc.).
"""
import json
import os
import time
from copy import deepcopy
from pathlib import Path

import requests

TEMPLATES_DIR = Path(__file__).parent / "comfy_workflows"
COMFY_INPUT_DIR = os.environ.get("COMFY_INPUT_DIR", "/workspace/ComfyUI/input")


def _load(name: str) -> dict:
    with open(TEMPLATES_DIR / f"{name}.json") as f:
        return json.load(f)


def _download_to_input(url: str) -> str:
    """Download an http(s) URL into ComfyUI's input/ folder and return the filename."""
    if not url.startswith("http"):
        return url
    Path(COMFY_INPUT_DIR).mkdir(parents=True, exist_ok=True)
    ext = url.split("?")[0].split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "mp4", "mov", "webm"):
        ext = "bin"
    name = f"in_{int(time.time()*1000)}.{ext}"
    target = Path(COMFY_INPUT_DIR) / name
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(target, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    return name


def build_workflow(wf: dict, lora_name: str) -> dict:
    t = wf["type"]
    if t == "t2i":
        return build_t2i(wf, lora_name)
    if t == "i2v":
        return build_i2v(wf)
    if t == "t2v":
        return build_t2v(wf, lora_name)
    if t == "motion":
        return build_motion(wf)
    if t == "pose":
        return build_pose(wf, lora_name)
    raise ValueError(f"Tipo no soportado: {t}")


def build_t2i(wf: dict, lora_name: str) -> dict:
    g = _load("t2i")
    g["6"]["inputs"]["text"] = wf["prompt"]
    g["7"]["inputs"]["text"] = wf.get("negative_prompt", "")
    g["3"]["inputs"]["seed"] = wf.get("seed", -1)
    g["3"]["inputs"]["steps"] = wf.get("steps", 30)
    g["3"]["inputs"]["cfg"] = wf.get("cfg", 7)
    g["3"]["inputs"]["sampler_name"] = wf.get("sampler", "dpmpp_2m_sde")
    g["3"]["inputs"]["scheduler"] = wf.get("scheduler", "karras")
    g["5"]["inputs"]["width"] = wf.get("width", 1024)
    g["5"]["inputs"]["height"] = wf.get("height", 1024)
    g["10"]["inputs"]["lora_name"] = lora_name
    g["10"]["inputs"]["strength_model"] = wf["lora"]["weight"]
    g["10"]["inputs"]["strength_clip"] = wf["lora"]["weight"]
    return g


def build_i2v(wf: dict) -> dict:
    g = _load("i2v")
    local = _download_to_input(wf["image_url"])
    g["1"]["inputs"]["image"] = local
    g["6"]["inputs"]["text"] = wf.get("prompt", "")
    g["3"]["inputs"]["steps"] = wf.get("steps", 25)
    g["3"]["inputs"]["cfg"] = wf.get("cfg", 6)
    g["12"]["inputs"]["frame_rate"] = wf.get("fps", 16)
    g["8"]["inputs"]["length"] = wf.get("frames", 80)
    res = wf.get("resolution", "480p")
    h = 480 if res == "480p" else 720
    g["8"]["inputs"]["height"] = h
    g["8"]["inputs"]["width"] = int(h * 16 / 9)
    return g


def build_t2v(wf: dict, lora_name: str) -> dict:
    g = _load("t2v")
    g["6"]["inputs"]["text"] = wf["prompt"]
    g["3"]["inputs"]["steps"] = wf.get("steps", 30)
    g["3"]["inputs"]["cfg"] = wf.get("cfg", 7)
    g["8"]["inputs"]["length"] = wf.get("frames", 80)
    g["8"]["inputs"]["width"] = wf.get("width", 768)
    g["8"]["inputs"]["height"] = wf.get("height", 1344)
    g["12"]["inputs"]["frame_rate"] = wf.get("fps", 16)
    g["10"]["inputs"]["lora_name"] = lora_name
    g["10"]["inputs"]["strength_model"] = wf["lora"]["weight"]
    return g


def build_motion(wf: dict) -> dict:
    g = _load("motion")
    sasha_local = _download_to_input(wf["reference_image_url"])
    g["1"]["inputs"]["image"] = sasha_local
    src = wf["motion_source"]
    if src["type"] == "local":
        motion_path = src["path"]
        motion_name = Path(motion_path).name
        target = Path(COMFY_INPUT_DIR) / motion_name
        if str(target) != motion_path:
            import shutil
            shutil.copy(motion_path, target)
        g["2"]["inputs"]["video"] = motion_name
    else:
        local = _download_to_input(src["url"])
        g["2"]["inputs"]["video"] = local
    g["3"]["inputs"]["steps"] = wf.get("steps", 25)
    g["12"]["inputs"]["frame_rate"] = wf.get("fps", 16)
    return g


def build_pose(wf: dict, lora_name: str) -> dict:
    g = _load("pose")
    pose_local = _download_to_input(wf["controlnet"]["image_url"])
    g["20"]["inputs"]["image"] = pose_local
    g["6"]["inputs"]["text"] = wf["prompt"]
    g["7"]["inputs"]["text"] = wf.get("negative_prompt", "")
    g["3"]["inputs"]["steps"] = wf.get("steps", 30)
    g["3"]["inputs"]["cfg"] = wf.get("cfg", 7)
    g["5"]["inputs"]["width"] = wf.get("width", 1024)
    g["5"]["inputs"]["height"] = wf.get("height", 1024)
    g["10"]["inputs"]["lora_name"] = lora_name
    g["10"]["inputs"]["strength_model"] = wf["lora"]["weight"]
    g["22"]["inputs"]["strength"] = wf["controlnet"].get("weight", 0.9)
    return g
