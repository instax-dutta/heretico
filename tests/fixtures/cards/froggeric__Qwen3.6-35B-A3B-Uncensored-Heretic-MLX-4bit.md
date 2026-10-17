---
language:
  - en
  - zh
  - multilingual
license: apache-2.0
library_name: mlx
tags:
  - mlx
  - mlx-lm
  - mlx-vlm
  - qwen3.6
  - qwen3_5_moe
  - conversational
  - vision
  - multimodal
  - uncensored
  - abliterated
  - heretic
base_model:
  - llmfan46/Qwen3.6-35B-A3B-uncensored-heretic
pipeline_tag: image-text-to-text
quantization: 4-bit
---

<div align="center">

# Qwen3.6-35B-A3B Uncensored Heretic

**MLX 4-bit &middot; Apple Silicon native**

Text &middot; Vision &middot; Video &middot; Thinking &middot; Tool Calling

[![MLX 8-bit](https://img.shields.io/badge/MLX_8bit-available-blue)](https://huggingface.co/froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-8bit)
[![MLX 6-bit](https://img.shields.io/badge/MLX_6bit-available-blue)](https://huggingface.co/froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-6bit)
[![LM Studio](https://img.shields.io/badge/LM_Studio-published-green)](https://lmstudio.ai/froggeric/qwen3.6-35b-a3b-uncensored-heretic-mlx-4bit)
[![License](https://img.shields.io/badge/license-Apache--2.0-lightgrey)](https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/LICENSE)

</div>

---

## Why this model?

Three things set this apart from other Qwen 3.6 conversions:

**1. Architecture-aware uncensoring.** Qwen 3.6 uses a hybrid attention design — linear (DeltaNet-style) *and* traditional softmax blocks, mixed 3:1. Most abliteration tools treat them the same. [llmfan46](https://huggingface.co/llmfan46) applied **separate parameters** for each attention type using the [Heretic](https://github.com/p-e-w/heretic) tool, yielding one of the lowest KL divergences (0.0015) of any uncensored Qwen variant — 88% fewer refusals with negligible capability loss.

**2. A fixed chat template.** The official Qwen 3.6 template is broken on every C++ runtime (LM Studio, llama.cpp, MLX). Tool calls crash, the `developer` role throws errors, and empty thinking blocks waste your context window. This model ships with a [rewritten template](chat_template.README.md) that fixes all five issues and adds a thinking toggle (`<|think_on|>` / `<|think_off|>`) you can drop into any message.

**3. Vision, fixed and working.** The source model had 333 vision tower keys with incorrect prefixes, breaking image inputs. Those were corrected before conversion, so text, image, and video inputs all work out of the box.

---

## Quick start

### Text

```python
from mlx_lm import load, generate

model, tokenizer = load("froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-4bit")
response = generate(model, tokenizer, prompt="Hello", max_tokens=256, temp=0.7)
print(response)
```

### Vision

```python
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template

model, processor = load("froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-4bit")
image = ["path/to/image.jpg"]
prompt = "Describe this image."
formatted = apply_chat_template(processor, model.config, prompt, num_images=len(image))
result = generate(model, processor, formatted, image, max_tokens=256, temp=0.7)
print(result.text)
```

### CLI

```bash
# Text
mlx_lm.generate \
  --model froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-4bit \
  --prompt "Hello"

# Vision
mlx_vlm.generate \
  --model froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-4bit \
  --image image.jpg --prompt "Describe this image"
```

**Requirements:** `mlx-lm >= 0.31.2`, `mlx-vlm >= 0.4.4`

---

## System prompt

The first line of your system prompt **must** be:

```
You are Qwen, created by Alibaba Cloud. You are a helpful assistant.
```

The model underperforms without it. You can append anything after that line.

---

## Thinking toggle

Drop `<|think_on|>` or `<|think_off|>` anywhere in your system or user prompt. The template intercepts the tag, strips it from context so the model never sees it, and flips the mode.

**Fast answer, no reasoning:**

```
System: You are a coding assistant. <|think_off|>
User: What's 2+2?
```

**Deep reasoning:**

```
System: You are a coding assistant. <|think_on|>
User: Implement a red-black tree in Rust.
```

---

## Chat template fixes

The official Qwen 3.6 Jinja template has five bugs that break real usage. This model ships with a [rewritten template](chat_template.README.md) that fixes all of them:

| Bug | Impact | Fix |
|-----|--------|-----|
| `|items` filter in tool calls | Crashes on every C++ runtime (LM Studio, llama.cpp, MLX) | Direct dictionary key lookups |
| `|safe` filter | Python-only, does not exist in C++ Jinja | Removed |
| `developer` role | Modern APIs send it; official template throws an error | Maps to `system` |
| Empty thinking blocks | Wraps every past turn in tags, even with nothing inside — wastes context tokens | Only emitted when `reasoning_content` is non-empty |
| `</thinking>` hallucination | Model sometimes generates the wrong closing tag; parser fails | Detects which tag was used and splits on that |

Works in LM Studio, llama.cpp (`--jinja`), vLLM, MLX, oMLX, and any engine that supports HuggingFace Jinja templates.

---

## The uncensoring

This model uses [Heretic](https://github.com/p-e-w/heretic) v1.2.0 with a variant of the [Magnitude-Preserving Orthogonal Ablation (MPOA)](https://huggingface.co/blog/grimjim/norm-preserving-biprojected-abliteration) method.

### How it works

Heretic identifies the "refusal direction" in the model's residual stream by comparing activations on harmless vs. harmful prompts, then orthogonalizes specific weight matrices against that direction so the model can no longer express refusal behavior.

### What llmfan46 did differently

Standard Heretic treats all attention blocks identically. Qwen 3.6's hybrid architecture mixes **linear attention** (DeltaNet-style) and **traditional softmax attention** in a 3:1 ratio. llmfan46 applied **separate abliteration parameters for each attention type**, allowing more precise removal of refusal behavior with less collateral damage to model capabilities.

This approach was submitted as a pull request to Heretic but was not merged — not because it doesn't work, but because the extra parameters increase optimization time. For this specific architecture, it produces superior results.

### Impact

| Metric | Original | This model |
|--------|----------|------------|
| Refusals | 83/100 | **10/100** |
| KL divergence | 0 | **0.0015** |
| MMLU | 83.72% | **83.30%** |

88% fewer refusals. Negligible capability loss.

---

## How it compares

### Community results

r/LocalLLaMA users have been A/B-testing various uncensored Qwen 3.6 variants — [Heretic](https://github.com/p-e-w/heretic), HauhauCS Aggressive, abliterix, and simple orthogonal projection. The pattern is consistent: **Heretic produces the best balance of refusal removal and output quality**.

[Community discussion →](https://www.reddit.com/r/LocalLLaMA/comments/1sw5fb7/qwen36_35b_a3b_heretic_kld_00015_incredible_model/)

### Why

Most abliteration methods treat all layers identically. Qwen 3.6's hybrid attention (3:1 linear-to-softmax ratio) means a single parameter set either under-abliterate the DeltaNet blocks or over-abliterate the softmax blocks. Architecture-aware abliteration — separate parameters per attention type — is the key differentiator.

### A note on SSM conv1d "repair"

Some uncensored variants apply a pre-processing step that rescales SSM conv1d weights before abliteration, claiming to fix "outlier" tensors in the DeltaNet linear attention layers. This technique (originating as "Sig-ScaleSync") was benchmarked with **284 data points** across perplexity, needle-in-a-haystack, and repetition tests at multiple context lengths (4K–128K). Result: **perplexity degraded at every length with no improvement** in NIAH or repetition. The unrepaired original weights perform best.

Abliterating a degraded baseline can yield a lower measured KL divergence — but that measures distance from a worse starting point, not better preservation of the original model's capabilities.

---

## Sampling

From the official Qwen authors. Reserve 128K+ context for thinking mode.

| Mode | temp | top_p | top_k | min_p | repeat_penalty | presence_penalty |
|------|------|-------|-------|-------|----------------|------------------|
| **Thinking (coding)** | 0.6 | 0.95 | 20 | 0 | 1.0 | off |
| Thinking (general) | 1.0 | 0.95 | 20 | 0 | 1.0 | 1.5 |
| Non-thinking | 0.7 | 0.8 | 20 | 0 | 1.0 | 1.5 |

GGUF runtimes use `presence_penalty` (0 = off). MLX / LM Studio use `repeat_penalty` (1.0 = off).

---

## This conversion

| | |
|---|---|
| **Source** | [llmfan46/Qwen3.6-35B-A3B-uncensored-heretic](https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic) (BF16 safetensors) |
| **Quantization** | 4-bit (4.6 bits/weight, ~19 GB across 4 shards) |
| **Vision fixes** | Corrected 333 misprefixed vision tower keys (`model.language_model.visual.*` → `model.visual.*`) and vision config model_type from source |
| **Chat template** | Fixed Jinja template with tool calling, developer role, thinking toggle, and hallucination handling |
| **Minimum RAM** | ~24 GB (19 GB weights + overhead) |

<details>
<summary>Architecture details</summary>

| Spec | Value |
|------|-------|
| Architecture | MoE — 35B total, ~3B active per token |
| Layers | 40 (3x linear attention + 1x full attention, 10 repetitions) |
| Experts | 256 total, 8 routed + 1 shared per token |
| Attention | 16 Q heads, 2 KV heads (GQA), head_dim 128 |
| FFN | intermediate_size 1408 per expert |
| Context | 262K native, 1M+ with YaRN |
| RoPE | theta 10M, partial_rotary_factor 0.25 |
| Vocab | 248K tokens |
| Multimodal | Text, image, video |
| Multi-token prediction | Supported (1 draft layer) |
| model_type | `qwen3_5_moe` |

</details>

---

## Credits

| Role | Author |
|------|--------|
| Original model | Alibaba Cloud ([Qwen team](https://huggingface.co/Qwen)) |
| Refusal direction research | [Arditi et al.](https://arxiv.org/abs/2406.11717) |
| MPOA method | [Jim Lai](https://huggingface.co/blog/grimjim/norm-preserving-biprojected-abliteration) |
| Heretic tool | [Philipp Weidmann](https://github.com/p-e-w/heretic) |
| Architecture-aware abliteration + uncensored variant | [llmfan46](https://huggingface.co/llmfan46) |
| Fixed chat template, vision fixes, MLX conversion | [froggeric](https://huggingface.co/froggeric) |

## Links

- [8-bit MLX version](https://huggingface.co/froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-8bit) — higher quality, larger download
- [6-bit MLX version](https://huggingface.co/froggeric/Qwen3.6-35B-A3B-Uncensored-Heretic-MLX-6bit) — balanced quality and size
- [Source model](https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic)
- [Official Qwen3.6-35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B)
- [Fixed chat templates repo](https://huggingface.co/froggeric/Qwen-Fixed-Chat-Templates)

## License

Apache-2.0, inherited from Qwen3.6.
