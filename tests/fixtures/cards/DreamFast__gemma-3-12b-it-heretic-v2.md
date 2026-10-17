---
license: gemma
library_name: transformers
pipeline_tag: text-generation
base_model: google/gemma-3-12b-it
base_model_relation: quantized
language:
  - en
tags:
  - abliteration
  - heretic
  - uncensored
  - gemma
  - ltx-2
  - comfyui
  - video-generation
  - text-encoder
  - fp8
  - int8
  - int4
  - convrot
  - nvfp4
  - mxfp8
  - learned-rounding
  - blackwell
---

# Gemma 3 12B IT - Heretic v2 (Abliterated)

💬 **Community:** Join the [Abliterlitics Discord](https://discord.gg/AqmDnBjPvM) for discussion, model releases and support.


An abliterated version of [Google's Gemma 3 12B IT](https://huggingface.co/google/gemma-3-12b-it) created using [Heretic](https://github.com/p-e-w/heretic) v1.3.0. This model has reduced refusals while maintaining model quality, making it suitable as an uncensored text encoder for video generation models like LTX-2.

Available in five quantization formats for ComfyUI - FP8, INT8 (ConvRot row-wise), INT4 (W4A4 ConvRot), NVFP4, and MXFP8 - all produced with SVD-guided learned rounding for maximum fidelity, covering everything from Ada GPUs to Blackwell.

You can see the docker, scripts and configurations used to make these files on [Heretic Docker Github](https://github.com/dreamfast/heretic-docker).

## Update - July 11, 2026

Added INT8 (ConvRot) and MXFP8 quantization formats via [convert-to-quant](https://github.com/silveroxides/convert_to_quant) by [silveroxides](https://github.com/silveroxides):

- **INT8 ConvRot**: Near-lossless INT8 via SVD-guided learned rounding (Prodigy optimizer), tensor-wise scaling. Works on any GPU (Ampere+), natively supported in ComfyUI v0.27.0+. 13 GB.
- **MXFP8**: Microscaling FP8 (OCP MX standard) with E8M0 per-block power-of-2 scales. Blackwell only. 13 GB.
- **FP8 upgraded**: Now uses per-tensor scaling via convert-to-quant (previously naive unscaled cast).
- Pipeline now uses [convert-to-quant](https://github.com/silveroxides/convert_to_quant) for FP8, INT8, and MXFP8 quantization with ComfyUI-compatible `comfy_quant` metadata output.

## Update - August 10, 2026

All quantization formats regenerated with **SVD-guided learned rounding (AdaRound)** for maximum quality - every format now runs per-tensor SVD + Prodigy-optimized gradient descent to minimize output reconstruction error:

- **FP8 upgraded** from naive RTN to **learned rounding** (per-tensor scaling, compatible with all ComfyUI versions - ComfyUI does not yet support row-wise FP8 in `QUANT_ALGOS`).
- **INT8 upgraded** to **ConvRot row-wise** (Hadamard rotation + per-row scales). Was tensor-wise; now uses group-wise ConvRot like INT4.
- **INT4 (W4A4 ConvRot) added** - new format, 4-bit signed INT with mandatory Hadamard rotation. 7.7 GB. Smallest variant. Layers with incompatible dimensions (e.g. some vision layers) automatically kept in high precision.
- **NVFP4** switched from legacy custom quantizer to **convert-to-quant's learned rounding** path.
- **MXFP8** upgraded from RTN to **learned rounding**.

## What's new in v2

- **Heretic v1.3.0** with 200 trials (v1 used v1.1.0 with 100 trials)
- **Better trial selection**: Trial 174 - 8/100 refusals at KL 0.0801 (v1: Trial 99, 7/100 refusals at KL 0.0826)
- **Vision preserved**: All ComfyUI variants keep `vision_model` and `multi_modal_projector` keys for I2V prompt enhancement
- **Five quantization formats**: FP8, INT8 (ConvRot), NVFP4, MXFP8, plus GGUF - for every GPU tier
- **INT8 ConvRot**: Near-lossless INT8 via learned rounding optimization, works on any GPU (Ampere+), natively supported in ComfyUI v0.27.0+
- **MXFP8**: Microscaling FP8 (OCP MX standard) with E8M0 block scales for Blackwell
- **Updated GGUF support**: ComfyUI-GGUF now has merged Gemma 3 support ([PR #402](https://github.com/city96/ComfyUI-GGUF/pull/402))

## Model Details

- **Base Model:** google/gemma-3-12b-it
- **Abliteration Method:** [Heretic](https://github.com/p-e-w/heretic) v1.3.0
- **Trials:** 200
- **Trial Selected:** Trial 174
- **Refusals:** 8/100 (vs 100/100 original)
- **KL Divergence:** 0.0801 (minimal model damage)

## Files

### HuggingFace Format (for transformers, llama.cpp conversion)
```
model-00001-of-00005.safetensors
model-00002-of-00005.safetensors
model-00003-of-00005.safetensors
model-00004-of-00005.safetensors
model-00005-of-00005.safetensors
config.json
tokenizer.model
tokenizer.json
tokenizer_config.json
```

### ComfyUI Format (with vision, for LTX-2 T2V and I2V)

| File | Format | Size | HW | Description |
|------|--------|------|-----|-------------|
| `gemma-3-12b-it-heretic-v2.safetensors` | bf16 | 23 GB | Any | Full precision |
| `gemma-3-12b-it-heretic-v2_fp8_e4m3fn.safetensors` | FP8 E4M3 | 13 GB | Ada+ | Per-tensor scaled, learned rounding |
| `gemma-3-12b-it-heretic-v2_int8.safetensors` | INT8 | 13 GB | Any | ConvRot row-wise, learned rounding |
| `gemma-3-12b-it-heretic-v2_int4.safetensors` | INT4 W4A4 | 7.7 GB | Any* | ConvRot Hadamard-rotated, learned rounding |
| `gemma-3-12b-it-heretic-v2_nvfp4.safetensors` | NVFP4 E2M1 | 7.8 GB | Blackwell† | 4-bit float, double quantization, learned rounding |
| `gemma-3-12b-it-heretic-v2_mxfp8.safetensors` | MXFP8 | 13 GB | Blackwell | Microscaling FP8, E8M0 block scales, learned rounding |

*\* INT4 W4A4 uses ComfyUI's `convrot_w4a4` path (ComfyUI 0.30.0+). Layers with incompatible dimensions are kept in bf16.*
*† NVFP4 inference is fastest on Blackwell; software dequantization works on older GPUs (tested RTX 4090).*

All ComfyUI variants include vision (`vision_model` and `multi_modal_projector` weights). The vision weights are unused during T2V (text-to-video) and add minimal overhead (~1 GB). For I2V (image-to-video) workflows using `TextGenerateLTX2Prompt` with an image input, the vision weights are required.

### Quantization Format Details

> **Quality:** All quantized variants use SVD-guided learned rounding (AdaRound via [convert-to-quant](https://github.com/silveroxides/convert_to_quant)), which optimizes each weight's rounding direction to minimize output reconstruction error - noticeably higher fidelity than naive round-to-nearest quantization.

**FP8 (E4M3)**: Per-tensor scaled FP8 with learned rounding. Works on Ada (RTX 4090) and newer. Good balance of size and quality.

**INT8 (ConvRot row-wise)**: Group-wise Hadamard rotation (ConvRot) spreads activation outliers, followed by per-row symmetric INT8 with learned rounding. Near-lossless quality on **any modern GPU** (Ampere+). Natively supported in ComfyUI v0.27.0+.

**INT4 (W4A4 ConvRot)**: 4-bit signed INT with mandatory group-wise Hadamard rotation. The smallest variant (~33% of bf16). Layers whose dimensions aren't divisible by the ConvRot group size are automatically kept in bf16. Uses ComfyUI's `convrot_w4a4` path (ComfyUI 0.30.0+).

**NVFP4 (E2M1)**: 4-bit floating point with double quantization (per-tensor f32 scale + per-block FP8 scale, block size 16) and learned rounding. ~3x smaller than bf16, loads natively in ComfyUI without any plugins. Blackwell GPUs (RTX 5090/5080, SM100+) use native FP4 tensor cores for best performance. Software dequantization works on older GPUs (tested on RTX 4090).

**MXFP8**: Microscaling FP8 (OCP MX standard). FP8 E4M3 data with E8M0 (power-of-2) per-block scales using 32-element blocks, with learned rounding. Better dynamic range handling than per-tensor FP8. Requires SM100+ (Blackwell).

### GGUF Format (for llama.cpp and ComfyUI-GGUF)

| Quant | Size | Notes |
|-------|------|-------|
| F16 | 22GB | Lossless reference |
| Q8_0 | 12GB | Excellent quality |
| Q6_K | 9.0GB | Very good quality |
| Q5_K_M | 7.9GB | Good quality |
| Q5_K_S | 7.7GB | Slightly smaller Q5 |
| **Q4_K_M** | **6.8GB** | **Recommended balance** |
| Q4_K_S | 6.5GB | Smaller Q4 variant |
| Q3_K_M | 5.6GB | For low VRAM only |

GGUF files are text-only (no vision). They work with llama.cpp directly and with ComfyUI via [ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF).

## Do abliterated models make a difference for LTX-2?

I had a [deep dive into this topic](https://nathan.sapwell.net/posts/heretic-gemma-12b/) and found that the impact is nuanced. Abliteration does alter the embeddings Gemma produces, which slightly changes the generated video. However, there are fundamental limitations:

- **Gemma doesn't know what it wasn't trained on.** The base model was never trained on more taboo content. Abliteration removes refusals, but the model simply doesn't have knowledge of things it was never exposed to. Even chatting with the heretic model in llama.cpp, it doesn't refuse - it just doesn't know.
- **LTX-2 was trained on original Gemma embeddings.** The DiT expects the embedding distribution from the unmodified text encoder. Fine-tuning the text encoder itself would break the DiT, as it wouldn't know what to do with the new embedding distribution and would produce strange results.
- **Most abliteration happens on layer 48** (the final decision-making layer), but LTX-2 averages across all layers, which may wash out the difference.

A potential approach would be combining a fine-tuned abliterated text encoder with a LoRA trained to understand the new embeddings. LoRAs for LTX exist, but no fine-tuned text encoders have been released yet as far as I know.

That said, abliteration still removes the soft censorship in the embeddings, which can result in more faithful prompt encoding for creative content.

## Usage

### With Transformers

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model = AutoModelForCausalLM.from_pretrained(
    "DreamFast/gemma-3-12b-it-heretic-v2",
    device_map="auto",
    torch_dtype=torch.bfloat16
)
tokenizer = AutoTokenizer.from_pretrained("DreamFast/gemma-3-12b-it-heretic-v2")

prompt = "Write a story about a bank heist"
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=200)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### With ComfyUI (LTX-2)

1. Download a ComfyUI format file from the `comfyui/` folder:
   - **INT8** (recommended, any GPU): `gemma-3-12b-it-heretic-v2_int8.safetensors` (13 GB)
   - **INT4** (smallest, any GPU*): `gemma-3-12b-it-heretic-v2_int4.safetensors` (7.7 GB)
   - **FP8** (Ada+): `gemma-3-12b-it-heretic-v2_fp8_e4m3fn.safetensors` (13 GB)
   - **NVFP4** (4-bit, Blackwell†): `gemma-3-12b-it-heretic-v2_nvfp4.safetensors` (7.8 GB)
   - **MXFP8** (Blackwell): `gemma-3-12b-it-heretic-v2_mxfp8.safetensors` (13 GB)
   - **bf16** (full precision): `gemma-3-12b-it-heretic-v2.safetensors` (23 GB)

2. Place in `ComfyUI/models/text_encoders/`

3. In your LTX-2 workflow, use the `LTXAVTextEncoderLoader` node and select the heretic file

**Note:** INT8 requires ComfyUI v0.27.0+ (native int8_tensorwise support). For best inference speed, launch ComfyUI with `--enable-triton-backend`.

**Tip:** For multi-GPU setups or CPU offloading, check out [ComfyUI-LTX2-MultiGPU](https://github.com/dreamfast/ComfyUI-LTX2-MultiGPU) for optimized LTX-2 workflows.

### With ComfyUI-GGUF

GGUF support for Gemma 3 text encoders is now merged in [ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF) ([PR #402](https://github.com/city96/ComfyUI-GGUF/pull/402)).

1. Download a GGUF file (Q4_K_M recommended for most setups)
2. Place in `ComfyUI/models/text_encoders/`
3. Use the `DualCLIPLoader (GGUF)` node:
   - CLIP 1: the Gemma 3 GGUF file
   - CLIP 2: embedding connectors from [Kijai/LTXV2_comfy](https://huggingface.co/Kijai/LTXV2_comfy/tree/main/text_encoders) (use the **dev** connectors, not distilled)

**Note:** GGUF text encoders are text-only (no vision). For I2V prompt enhancement with image input, use the safetensors variants.

### With llama.cpp

```bash
# Using llama-server
llama-server -m gemma-3-12b-it-heretic-v2-Q4_K_M.gguf

# Or with llama-cli
llama-cli -m gemma-3-12b-it-heretic-v2-Q4_K_M.gguf -p "Write a story about a bank heist"
```

## Why Abliterate?

Even when Gemma doesn't outright refuse a prompt, it may "sanitize" or weaken certain concepts in the embeddings. For video generation with LTX-2, this can result in:
- Weaker adherence to creative prompts
- Softened or altered visual outputs
- Less faithful representation of requested content

Abliteration removes this soft censorship, resulting in more faithful prompt encoding.

## Abliteration Process

Created using Heretic v1.3.0 with 200 optimization trials:

```
? Which trial do you want to use?
  [Trial  80] Refusals:  0/100, KL divergence: 0.6098
  [Trial  66] Refusals:  2/100, KL divergence: 0.2087
  [Trial  75] Refusals:  3/100, KL divergence: 0.1378
  [Trial  67] Refusals:  6/100, KL divergence: 0.1108
  [Trial 180] Refusals:  7/100, KL divergence: 0.0996
> [Trial 174] Refusals:  8/100, KL divergence: 0.0801  <-- selected
  [Trial 178] Refusals: 10/100, KL divergence: 0.0801
  [Trial 172] Refusals: 11/100, KL divergence: 0.0708
  ...
```

Trial 174 was selected for its low KL divergence (0.0801), indicating minimal model damage, while achieving 8/100 refusals (92% of previously-refused prompts now work).

## Limitations

- This model inherits all limitations of the base Gemma 3 12B model
- Abliteration reduces but does not completely eliminate refusals
- NVFP4 and MXFP8 quantization work best on Blackwell GPUs (RTX 5090/5080) with native tensor cores; NVFP4 also works on older GPUs via software dequantization
- INT8 requires ComfyUI v0.27.0+ for native int8_tensorwise support

## License

This model is subject to the [Gemma license](https://ai.google.dev/gemma/terms).

## Acknowledgments

- [Google](https://huggingface.co/google) for the Gemma 3 12B model
- [Heretic](https://github.com/p-e-w/heretic) by p-e-w for the abliteration tool
- [convert-to-quant](https://github.com/silveroxides/convert_to_quant) by silveroxides for INT8 ConvRot, FP8 scaling, and MXFP8 quantization
- [comfy_kitchen](https://github.com/Comfy-Org/comfy-kitchen) by Comfy-Org for NVFP4/MXFP8 CUDA kernels
- [Lightricks](https://huggingface.co/Lightricks) for LTX-2
- [llama.cpp](https://github.com/ggerganov/llama.cpp) for GGUF conversion
- [ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF) for Gemma 3 GGUF support
