---
base_model: richardyoung/granite-4.2-3b-heretic
base_model_relation: quantized
license: apache-2.0
pipeline_tag: text-generation
tags: [gguf, llama.cpp, ollama, heretic, abliterated, uncensored, imatrix]
---

# Granite-4.2-3B-Heretic GGUF

GGUF quantizations of [richardyoung/granite-4.2-3b-heretic](https://huggingface.co/richardyoung/granite-4.2-3b-heretic), an abliterated build of [ibm-granite/granite-4.2-3b](https://huggingface.co/ibm-granite/granite-4.2-3b) (IBM's Granite 4.2 3B instruct model, multilingual (12 languages) with tool calling and a thinking mode) made with [Heretic](https://github.com/p-e-w/heretic).

## Abliteration Results

| Metric | Value |
|---|---|
| Base Refusals | 98/100 |
| Abliterated Refusals | 27/100 |
| Refusal Reduction | **72%** |
| KL Divergence | 0.085 |

The very low KL divergence (0.085, far below the 0.5 “damage” threshold) means the model retains essentially all of its original capabilities and coherence.

> **Note on refusals:** this build still refuses 27 of 100 harmful prompts, more than our other Heretic releases. That is deliberate: the trials that refused less also degraded the model's normal behavior (KL divergence above 0.10), and we chose to keep the original model's capabilities intact rather than trade them for fewer refusals.

## Quick Start

### With Ollama

```bash
ollama run richardyoung/granite-4.2-3b-heretic
# or straight from Hugging Face
ollama run hf.co/richardyoung/granite-4.2-3b-heretic-GGUF
```

### With llama.cpp

```bash
huggingface-cli download richardyoung/granite-4.2-3b-heretic-GGUF \
    --include "*Q4_K_M*" --local-dir ./models

./llama-cli -m ./models/*Q4_K_M*.gguf -ngl 99
```

### With Python (llama-cpp-python)

```python
from llama_cpp import Llama

llm = Llama.from_pretrained(
    repo_id="richardyoung/granite-4.2-3b-heretic-GGUF",
    filename="*Q4_K_M*",
    n_gpu_layers=-1,
)

output = llm.create_chat_completion(
    messages=[{"role": "user", "content": "Explain abliteration in simple terms."}]
)
print(output["choices"][0]["message"]["content"])
```

## Available Quantizations

| Quantization | Size | Use Case |
|---|---|---|
| IQ3_M | 1.7 GB | Smallest |
| IQ4_XS | 2.0 GB | Great quality-size balance |
| Q4_K_M | 2.2 GB | **Recommended** — good balance |
| Q5_K_M | 2.6 GB | Higher quality |
| Q6_K | 3.0 GB | Very high quality |
| Q8_0 | 3.9 GB | Near-lossless |
| granite-4.2-3b-heretic-imatrix.gguf | – | Importance matrix used for the IQ and Q4_K_M/Q5_K_M quants (calibration_datav3) |

## What is Abliteration?

Abliteration removes the "refusal direction" from a model's residual stream — a surgical modification that disables safety refusals without retraining. See [Refusal in Language Models Is Mediated by a Single Direction](https://arxiv.org/abs/2406.11717). [Heretic](https://github.com/p-e-w/heretic) automates it: it searches ablation parameters with an optimizer (200 trials here) and keeps the trials that best trade off fewer refusals against KL divergence from the original model.

## Intended Use

Research, creative writing, education on alignment techniques, and unrestricted local inference. This model will comply with requests the original refuses; use responsibly and in accordance with applicable laws. License: Apache-2.0, inherited from the base model.

## Other Models by richardyoung

- **New Heretic models (reproducible, listed in the [Heretic Grimoire](https://huggingface.co/spaces/heretic-org/Heretic-Grimoire))**: [LFM2.5-1.2B](https://hf.co/richardyoung/LFM2.5-1.2B-Instruct-heretic) | [Granite-4.2-3B](https://hf.co/richardyoung/granite-4.2-3b-heretic) | [Granite-4.2-8B](https://hf.co/richardyoung/granite-4.2-8b-heretic) | [Olmo-3-7B-Think](https://hf.co/richardyoung/Olmo-3-7B-Think-heretic) | [Phi-4-mini](https://hf.co/richardyoung/Phi-4-mini-instruct-heretic) | [DeepSeek-R1-0528-Qwen3-8B](https://hf.co/richardyoung/DeepSeek-R1-0528-Qwen3-8B-heretic) | [Agents-A1-4B](https://hf.co/richardyoung/Agents-A1-4B-heretic) | [FrogNano-4B](https://hf.co/richardyoung/FrogNano-4B-2609-heretic)
- **Abliterated/Uncensored models**: [Qwen2.5-7B](https://hf.co/richardyoung/Qwen2.5-7B-Instruct-abliterated-GGUF) | [Qwen3-14B](https://hf.co/richardyoung/Qwen3-14B-abliterated-GGUF) | [DeepSeek-R1-32B](https://hf.co/richardyoung/Deepseek-R1-Distill-Qwen-32b-uncensored) | [Qwen3-8B](https://hf.co/richardyoung/Qwen3-8B-Abliterated)
- **OCR & Vision**: [MiniCPM-V-4.6 GGUF](https://hf.co/richardyoung/MiniCPM-V-4.6-GGUF) | [dots.mocr GGUF](https://hf.co/richardyoung/dots.mocr-GGUF) | [Unlimited-OCR GGUF](https://hf.co/richardyoung/Unlimited-OCR-GGUF) | [olmOCR GGUF](https://hf.co/richardyoung/olmOCR-2-7B-1025-GGUF) | [LightOnOCR-3-4B GGUF](https://hf.co/richardyoung/LightOnOCR-3-4B-GGUF) | [WeVisDoc-4B GGUF](https://hf.co/richardyoung/WeVisDoc-4B-GGUF) | [Xiaomi-OCR-0 GGUF](https://hf.co/richardyoung/Xiaomi-OCR-0-GGUF)
- **MLX quantizations (Apple Silicon)**: [Kimi-K2 series](https://hf.co/richardyoung/Kimi-K2-Instruct-0905-MLX-4bit) | [olmOCR MLX](https://hf.co/richardyoung/olmOCR-2-7B-1025-MLX-4bit)
- **Healthcare/Medical**: [Synthea 575K patients dataset](https://hf.co/datasets/richardyoung/synthea-575k-patients) | [CardioEmbed](https://hf.co/richardyoung/CardioEmbed)
- **Research**: [LLM Instruction-Following Evaluation](https://hf.co/richardyoung/llm-instruction-following-paper) (arxiv:2510.18892)

---

*Built & maintained by [Richard Young](https://deepneuro.ai/richard) · DeepNeuro*
