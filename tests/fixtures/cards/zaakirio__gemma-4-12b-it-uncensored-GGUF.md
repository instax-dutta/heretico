---
base_model: zaakirio/gemma-4-12b-it-uncensored
license: gemma
pipeline_tag: image-text-to-text
tags:
  - gguf
  - llama.cpp
  - gemma
  - gemma4
  - heretic
  - abliterated
  - uncensored
  - decensored
  - conversational
  - multimodal
  - audio
---

# gemma-4-12b-it-uncensored — GGUF

GGUF quantizations of [`zaakirio/gemma-4-12b-it-uncensored`](https://huggingface.co/zaakirio/gemma-4-12b-it-uncensored), a decensored ([Heretic](https://github.com/p-e-w/heretic)-abliterated) version of [`google/gemma-4-12B-it`](https://huggingface.co/google/gemma-4-12B-it).

These files run with **[llama.cpp](https://github.com/ggml-org/llama.cpp)**.

Gemma 4 12B (the "Unified" release, June 2026) is an **encoder-free unified multimodal** model: text, image, audio, and video all project straight into a single decoder-only transformer, with a context window of up to **256K tokens**. Abliteration touches only the language weights, so those capabilities carry over unchanged.

## Files

Filenames follow `gemma-4-12b-it-uncensored-<QUANT>.gguf`.

| Quant | Size | Notes |
|---|---|---|
| Q2_K | 4.50 GB | Smallest; lowest quality. Very tight memory only. |
| Q3_K_M | 5.67 GB | Small; usable on low RAM. |
| Q4_K_S | 6.54 GB | Compact 4-bit. |
| **Q4_K_M** | **6.87 GB** | **Recommended — best size/quality balance.** |
| Q5_K_M | 7.96 GB | Higher quality, slightly larger. |
| Q6_K | 9.11 GB | Near-lossless. |
| Q8_0 | 11.80 GB | Effectively lossless vs the BF16 source. |
| f16 | 22.20 GB | Full precision; reference / re-quantizing. |

Not sure which to pick? **Start with Q4_K_M.** Go up to Q5/Q6/Q8 if you have the memory and want maximum fidelity; drop to Q3/Q2 only if you're memory-constrained.

**Multimodal projector** (for image/audio input — see [Multimodal](#multimodal)):

| File | Size | Notes |
|---|---|---|
| `mmproj-gemma-4-12B-it-bf16.gguf` | 0.16 GB | Multimodal projector — pair with **any** quant above. |
| `mtp-gemma-4-12b-it-uncensored.gguf` | 0.47 GB | Optional MTP speculative-decoding drafter — faster generation on GPUs. See [Faster generation with MTP](#faster-generation-with-mtp-speculative-decoding). |

## Usage

**llama.cpp** (auto-downloads the chosen quant from this repo):

```bash
# Interactive chat
llama-cli -hf zaakirio/gemma-4-12b-it-uncensored-GGUF:Q4_K_M --jinja

# OpenAI-compatible server with web UI
llama-server -hf zaakirio/gemma-4-12b-it-uncensored-GGUF:Q4_K_M --jinja -c 4096
```

`-c` sets the context window. Gemma 4 12B supports up to **256K tokens** (`-c 262144`); raise it for long chats/documents as memory allows — `4096` is just a light default.

Or with a file you've already downloaded:

```bash
llama-cli -m gemma-4-12b-it-uncensored-Q4_K_M.gguf --jinja -p "Hello, who are you?"
```

**Download a single file:**

```bash
pip install -U "huggingface_hub[cli]"
hf download zaakirio/gemma-4-12b-it-uncensored-GGUF \
  --include "gemma-4-12b-it-uncensored-Q4_K_M.gguf" --local-dir ./
```

## Prompt format & settings

The chat template is embedded in the GGUF — chat-aware tools apply it automatically (always pass `--jinja` with llama.cpp). For reference, Gemma 4 introduced **new turn tokens** — `<|turn>` / `<turn|>`, replacing Gemma 3's `<start_of_turn>` / `<end_of_turn>` — and now supports a dedicated `system` role:

```
<|turn>system
{system instructions — optional}<turn|>
<|turn>user
{prompt}<turn|>
<|turn>model
```

Image and audio inputs use the `<|image|>` and `<|audio|>` placeholder tokens, which the multimodal pipeline fills in for you (see [Multimodal](#multimodal)).

**Recommended sampling** (Google defaults): `--temp 1.0 --top-p 0.95 --top-k 64`.

**Thinking mode:** Gemma 4 has a reasoning channel. To disable it, pass `--chat-template-kwargs '{"enable_thinking":false}'` to `llama-server`.

## Multimodal

In llama.cpp, multimodal input ships via a **separate projector file**; the language `.gguf` alone is text-only and will reject media. This repo includes `mmproj-gemma-4-12B-it-bf16.gguf`, which carries **both** a vision and an audio encoder (`clip.has_vision_encoder` and `clip.has_audio_encoder`).

> **In practice:** **image and audio input both work.** Verified with `llama-mtmd-cli`: it accepts `.wav`/`.mp3` directly and produced an accurate multilingual transcription of real speech. llama.cpp flags audio as **experimental** ("audio input is in experimental stage and may have reduced quality"), so treat ASR quality as best-effort. Video is handled as sampled frames (plus audio) and depends on your client doing the frame extraction.

When you load via `-hf`, llama.cpp **auto-downloads the projector from this repo** — images just work:

```bash
llama-server -hf zaakirio/gemma-4-12b-it-uncensored-GGUF:Q4_K_M --jinja
```

With local files, pass it explicitly with `--mmproj`:

```bash
llama-server -m gemma-4-12b-it-uncensored-Q4_K_M.gguf \
  --mmproj mmproj-gemma-4-12B-it-bf16.gguf --jinja

# download both files
hf download zaakirio/gemma-4-12b-it-uncensored-GGUF \
  --include "gemma-4-12b-it-uncensored-Q4_K_M.gguf" "mmproj-gemma-4-12B-it-bf16.gguf" --local-dir ./
```

One-shot image or audio from the CLI with `llama-mtmd-cli`:

```bash
# Image
llama-mtmd-cli -m gemma-4-12b-it-uncensored-Q4_K_M.gguf \
  --mmproj mmproj-gemma-4-12B-it-bf16.gguf --jinja \
  --image photo.png -p "What's in this image?"

# Audio (experimental in llama.cpp; 16 kHz WAV)
llama-mtmd-cli -m gemma-4-12b-it-uncensored-Q4_K_M.gguf \
  --mmproj mmproj-gemma-4-12B-it-bf16.gguf --jinja \
  --audio clip.wav -p "Transcribe this audio."
```

The projector is the unmodified Gemma 4 one (abliteration leaves it untouched). bf16 is preferred — it's small enough that quantizing it buys nothing.

## Faster generation with MTP (speculative decoding)

Gemma 4 ships a small (~0.4 B) **multi-token-prediction (MTP) drafter** ([`google/gemma-4-12B-it-assistant`](https://huggingface.co/google/gemma-4-12B-it-assistant)) that speeds up generation through self-speculative decoding: the drafter proposes several tokens at once and the full model verifies them in a single forward pass. **Output is identical to normal decoding** — speculative decoding is mathematically exact, so it changes *speed only*, never quality, and the model stays exactly as uncensored: the main model verifies and decides every emitted token; the drafter merely proposes. (Google state the same — MTP "guarantee[s] the exact same quality as standard autoregressive generation" — and the implementation PR confirmed it by reproducing Gemma's published AIME-26 score.)

For that same reason the drafter does **not** need to be abliterated: this repo ships Google's **unmodified** upstream Gemma 4 drafter (the file is renamed `mtp-gemma-4-12b-it-uncensored.gguf` only so it sits beside the trunk — the weights are upstream), and your decensored trunk verifies every token. It's alignment-independent, exactly like the multimodal projector above.

MTP for Gemma 4 landed in llama.cpp [PR #23398](https://github.com/ggml-org/llama.cpp/pull/23398) (merged 2026-06-07; see also support discussion [#22735](https://github.com/ggml-org/llama.cpp/discussions/22735)), so it needs a llama.cpp build from that date or later.

```bash
# Grab the trunk + the MTP drafter
hf download zaakirio/gemma-4-12b-it-uncensored-GGUF \
  --include "gemma-4-12b-it-uncensored-Q4_K_M.gguf" "mtp-gemma-4-12b-it-uncensored.gguf" --local-dir ./

# Serve with MTP enabled
llama-server -m gemma-4-12b-it-uncensored-Q4_K_M.gguf \
  --model-draft mtp-gemma-4-12b-it-uncensored.gguf \
  --spec-type draft-mtp --spec-draft-n-max 4 \
  -ngl 99 --flash-attn auto --jinja
```

### ⚠️ MTP helps on GPUs but is *slower* on Apple Silicon

The benefit depends entirely on the backend.

**On a GPU it's a win.** The implementation PR measured **>2× throughput** on the dense Gemma 4 (31B) model — NVIDIA DGX Spark, ~0.59 mean draft acceptance at `--spec-draft-n-max 4` — and Unsloth report **1.5–2.2×** for Gemma 4 with MTP. ([PR #23398](https://github.com/ggml-org/llama.cpp/pull/23398), [Unsloth MTP guide](https://unsloth.ai/docs/models/mtp).)

**On Apple Silicon (Metal) it's a regression.** Measured here on *this* model — Q4_K_M, Apple M4 Pro, Gemma's default sampling (`--temp 1.0 --top-p 0.95 --top-k 64`), through `llama-server`:

| M4 Pro / Metal · Q4_K_M | Generation | Draft acceptance |
|---|---|---|
| MTP **off** (baseline) | **~27 tok/s** | — |
| MTP **on** (`--spec-draft-n-max 4`) | **~12 tok/s** (≈2× slower) | ~0.45 |

The drafts *are* accepted (~45%), but on Metal the draft-evaluation overhead outweighs the decode steps it saves. This isn't specific to this model: an independent report ([#23752](https://github.com/ggml-org/llama.cpp/issues/23752) — Qwen3.5-9B on an M1 Max) found MTP slower at *every* setting, even at 100% acceptance, so no sampling tweak rescues it on Metal.

**Recommendation:** enable MTP when serving on an NVIDIA (CUDA) GPU; leave it **off** on a Mac. On a GPU, greedy / low-temperature sampling raises acceptance and widens the speedup.

## About the base model

A decensored derivative produced with [Heretic](https://github.com/p-e-w/heretic) (automatic directional ablation). Compared with the original:

| Metric | Decensored | Original |
|---|---|---|
| Refusals (/100 harmful prompts) | 23 | 99 |
| KL divergence (harmless prompts) | 0.043 | 0 *(by definition)* |

> The refusal count is Heretic's keyword heuristic, which is known to over-count (it flags disclaimer-wrapped compliance as a refusal; ~11% precision per [arXiv:2512.13655](https://arxiv.org/abs/2512.13655)). We report only the measured marker figure and did not run a classifier-based eval on this model, so real compliance is likely higher. See the [source model card](https://huggingface.co/zaakirio/gemma-4-12b-it-uncensored) for parameters and details.

## Intended use & disclaimer

This model has had its refusal behaviour substantially removed and will comply with requests the original would have declined. Provided for research and unrestricted local use. You are responsible for how you use it and for complying with applicable law and the base model's [Gemma license](https://ai.google.dev/gemma/terms), which carries over to this derivative. Not for all audiences.

## Provenance

- Quantized from [`zaakirio/gemma-4-12b-it-uncensored`](https://huggingface.co/zaakirio/gemma-4-12b-it-uncensored) (BF16) using llama.cpp `convert_hf_to_gguf.py` + `llama-quantize`.
- Base model: [`google/gemma-4-12B-it`](https://huggingface.co/google/gemma-4-12B-it)
- Decensoring tool: [Heretic](https://github.com/p-e-w/heretic) by p-e-w · technique: [Arditi et al. (2024)](https://arxiv.org/abs/2406.11717)
- MTP drafter (`mtp-gemma-4-12b-it-uncensored.gguf`): the **unmodified** upstream [`google/gemma-4-12B-it-assistant`](https://huggingface.co/google/gemma-4-12B-it-assistant) (~0.4 B), Q8_0 GGUF via [`unsloth/gemma-4-12b-it-GGUF`](https://huggingface.co/unsloth/gemma-4-12b-it-GGUF). Not abliterated — it only proposes tokens; the decensored trunk verifies every one, so output is identical to running this model alone.
