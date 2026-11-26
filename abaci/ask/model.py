"""Run the Ask Abaci model locally with Apple MLX. Apple Silicon only; nothing leaves the laptop."""

from __future__ import annotations

import os
import threading
from functools import lru_cache
from pathlib import Path

from abaci.ask.prompt import system_prompt
from abaci.paths import ROOT

BASE_MODEL = os.environ.get("ABACI_ASK_MODEL", "mlx-community/Qwen2.5-Coder-3B-Instruct-4bit")
ADAPTER_PATH = Path(os.environ.get("ABACI_ASK_ADAPTER", ROOT / "ask" / "adapters"))
_lock = threading.Lock()  # one generation at a time: MLX shares the GPU


def available() -> tuple[bool, str]:
    try:
        import mlx_lm  # noqa: F401
    except ImportError:
        return False, "mlx-lm is not installed. On an Apple Silicon Mac: make ask-setup"
    return True, "ok"


@lru_cache(maxsize=2)
def _load(use_adapter: bool):
    from mlx_lm import load

    adapter = str(ADAPTER_PATH) if use_adapter and (ADAPTER_PATH / "adapters.safetensors").exists() else None
    model, tokenizer = load(BASE_MODEL, adapter_path=adapter)
    return model, tokenizer, adapter is not None


def adapter_loaded() -> bool:
    return (ADAPTER_PATH / "adapters.safetensors").exists()


def generate_spec_text(question: str, use_adapter: bool = True, few_shot: list[tuple[str, str]] | None = None, max_tokens: int = 200) -> str:
    """The model's raw reply: a JSON query spec (or an unsupported note)."""
    from mlx_lm import generate
    from mlx_lm.sample_utils import make_sampler

    model, tokenizer, _ = _load(use_adapter)
    messages = [{"role": "system", "content": system_prompt()}]
    for q, a in few_shot or []:
        messages += [{"role": "user", "content": q}, {"role": "assistant", "content": a}]
    messages.append({"role": "user", "content": question.strip()[:500]})
    prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    with _lock:
        return generate(model, tokenizer, prompt=prompt, max_tokens=max_tokens, sampler=make_sampler(temp=0.0), verbose=False)
