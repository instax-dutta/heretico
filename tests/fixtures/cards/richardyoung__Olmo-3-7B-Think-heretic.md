---
license: apache-2.0
base_model: allenai/Olmo-3-7B-Think
language:
- en
library_name: transformers
datasets:
- allenai/Dolci-Think-RL-7B
tags:
- heretic
- uncensored
- decensored
- abliterated
- reproducible
pipeline_tag: text-generation
base_model_relation: finetune
---
# This is a decensored version of [allenai/Olmo-3-7B-Think](https://huggingface.co/allenai/Olmo-3-7B-Think), made using [Heretic](https://heretic-project.org) v2.0.0.dev0

> [!TIP]
> **This model is reproducible!**
>
> See the [README](reproduce/README.md) in the `reproduce` directory for more information.

## Abliteration parameters

| Parameter | Value |
| :-------- | :---: |
| **direction_index** | per layer |
| **attn.o_proj.max_weight** | 1.44 |
| **attn.o_proj.max_weight_position** | 28.96 |
| **attn.o_proj.min_weight** | 1.15 |
| **attn.o_proj.min_weight_distance** | 15.81 |
| **mlp.down_proj.max_weight** | 0.96 |
| **mlp.down_proj.max_weight_position** | 19.53 |
| **mlp.down_proj.min_weight** | 0.31 |
| **mlp.down_proj.min_weight_distance** | 8.51 |

## Performance

| Metric | This model | Original model ([allenai/Olmo-3-7B-Think](https://huggingface.co/allenai/Olmo-3-7B-Think)) |
| :----- | :--------: | :---------------------------: |
| **Refusals** | 48/100 | 100/100 |
| **KL divergence** | 0.0263 | 0 *(by definition)* |


## Summary

Abliterated build of [allenai/Olmo-3-7B-Think](https://huggingface.co/allenai/Olmo-3-7B-Think), Ai2's fully open 7B reasoning model (open weights, data and training code) that thinks before answering. GGUF quantizations: [richardyoung/Olmo-3-7B-Think-heretic-GGUF](https://huggingface.co/richardyoung/Olmo-3-7B-Think-heretic-GGUF) · Ollama: [richardyoung/olmo-3-7b-think-heretic](https://ollama.com/richardyoung/olmo-3-7b-think-heretic)

## Abliteration Results

| Metric | Value |
|---|---|
| Base Refusals | 100/100 |
| Abliterated Refusals | 48/100 |
| Refusal Reduction | **52%** |
| KL Divergence | 0.026 |

The very low KL divergence (0.026, far below the 0.5 “damage” threshold) means the model retains essentially all of its original capabilities and coherence.

> **Note on refusals:** this build still refuses 48 of 100 harmful prompts, more than our other Heretic releases. That is deliberate: the trials that refused less also degraded the model's normal behavior (KL divergence above 0.10), and we chose to keep the original model's capabilities intact rather than trade them for fewer refusals.

## Quick Start

### With Ollama

```bash
ollama run richardyoung/olmo-3-7b-think-heretic
# or straight from Hugging Face
ollama run hf.co/richardyoung/Olmo-3-7B-Think-heretic-GGUF
```

### With llama.cpp

```bash
huggingface-cli download richardyoung/Olmo-3-7B-Think-heretic-GGUF \
    --include "*Q4_K_M*" --local-dir ./models

./llama-cli -m ./models/*Q4_K_M*.gguf -ngl 99
```

### With Python (llama-cpp-python)

```python
from llama_cpp import Llama

llm = Llama.from_pretrained(
    repo_id="richardyoung/Olmo-3-7B-Think-heretic-GGUF",
    filename="*Q4_K_M*",
    n_gpu_layers=-1,
)

output = llm.create_chat_completion(
    messages=[{"role": "user", "content": "Explain abliteration in simple terms."}]
)
print(output["choices"][0]["message"]["content"])
```

### With Transformers

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "richardyoung/Olmo-3-7B-Think-heretic"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, device_map="auto", torch_dtype="auto")
messages = [{"role": "user", "content": "Explain abliteration in simple terms."}]
inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to(model.device)
print(tokenizer.decode(model.generate(inputs, max_new_tokens=256)[0][inputs.shape[-1]:], skip_special_tokens=True))
```

## What is Abliteration?

Abliteration removes the "refusal direction" from a model's residual stream — a surgical modification that disables safety refusals without retraining. See [Refusal in Language Models Is Mediated by a Single Direction](https://arxiv.org/abs/2406.11717). [Heretic](https://github.com/p-e-w/heretic) automates it: it searches ablation parameters with an optimizer (200 trials here) and keeps the trials that best trade off fewer refusals against KL divergence from the original model.

## Intended Use

Research, creative writing, education on alignment techniques, and unrestricted local inference. This model will comply with requests the original refuses; use responsibly and in accordance with applicable laws.

## Other Models by richardyoung

- **New Heretic models (reproducible, listed in the [Heretic Grimoire](https://huggingface.co/spaces/heretic-org/Heretic-Grimoire))**: [LFM2.5-1.2B](https://hf.co/richardyoung/LFM2.5-1.2B-Instruct-heretic) | [Granite-4.2-3B](https://hf.co/richardyoung/granite-4.2-3b-heretic) | [Granite-4.2-8B](https://hf.co/richardyoung/granite-4.2-8b-heretic) | [Olmo-3-7B-Think](https://hf.co/richardyoung/Olmo-3-7B-Think-heretic) | [Phi-4-mini](https://hf.co/richardyoung/Phi-4-mini-instruct-heretic) | [DeepSeek-R1-0528-Qwen3-8B](https://hf.co/richardyoung/DeepSeek-R1-0528-Qwen3-8B-heretic) | [Agents-A1-4B](https://hf.co/richardyoung/Agents-A1-4B-heretic) | [FrogNano-4B](https://hf.co/richardyoung/FrogNano-4B-2609-heretic)
- **Abliterated/Uncensored models**: [Qwen2.5-7B](https://hf.co/richardyoung/Qwen2.5-7B-Instruct-abliterated-GGUF) | [Qwen3-14B](https://hf.co/richardyoung/Qwen3-14B-abliterated-GGUF) | [DeepSeek-R1-32B](https://hf.co/richardyoung/Deepseek-R1-Distill-Qwen-32b-uncensored) | [Qwen3-8B](https://hf.co/richardyoung/Qwen3-8B-Abliterated)
- **OCR & Vision**: [MiniCPM-V-4.6 GGUF](https://hf.co/richardyoung/MiniCPM-V-4.6-GGUF) | [dots.mocr GGUF](https://hf.co/richardyoung/dots.mocr-GGUF) | [Unlimited-OCR GGUF](https://hf.co/richardyoung/Unlimited-OCR-GGUF) | [olmOCR GGUF](https://hf.co/richardyoung/olmOCR-2-7B-1025-GGUF) | [LightOnOCR-3-4B GGUF](https://hf.co/richardyoung/LightOnOCR-3-4B-GGUF) | [WeVisDoc-4B GGUF](https://hf.co/richardyoung/WeVisDoc-4B-GGUF) | [Xiaomi-OCR-0 GGUF](https://hf.co/richardyoung/Xiaomi-OCR-0-GGUF)
- **MLX quantizations (Apple Silicon)**: [Kimi-K2 series](https://hf.co/richardyoung/Kimi-K2-Instruct-0905-MLX-4bit) | [olmOCR MLX](https://hf.co/richardyoung/olmOCR-2-7B-1025-MLX-4bit)
- **Healthcare/Medical**: [Synthea 575K patients dataset](https://hf.co/datasets/richardyoung/synthea-575k-patients) | [CardioEmbed](https://hf.co/richardyoung/CardioEmbed)
- **Research**: [LLM Instruction-Following Evaluation](https://hf.co/richardyoung/llm-instruction-following-paper) (arxiv:2510.18892)

*Built & maintained by [Richard Young](https://deepneuro.ai/richard) · DeepNeuro*

The original model card follows below.

-----


## Model Details
<img alt="Logo for Olmo 3 7B Think model" src="olmo-think.png" width="240px" style="margin-left:'auto' margin-right:'auto' display:'block'">



# Model Card for Olmo 3 Think

We introduce Olmo 3, a new family of 7B and 32B models both Instruct and Think variants. Long chain-of-thought thinking improves reasoning tasks like math and coding.

Olmo is a series of **O**pen **l**anguage **mo**dels designed to enable the science of language models. 
These models are pre-trained on the Dolma 3 dataset and post-trained on the Dolci datasets. We are releasing all code, checkpoints, logs (coming soon), and associated training details. 



The core models released in this batch include the following:

| **Stage**               | **Olmo 3 7B Think** | **Olmo 3 32B Think** | **Olmo 3 7B Instruct** |
|--------------------------|-----------------------|------------------------|---------------------------|
| **Base Model**           | [Olmo-3-7B](https://huggingface.co/allenai/Olmo-3-1025-7B) | [Olmo-3-32B](https://huggingface.co/allenai/Olmo-3-1125-32B) | [Olmo-3-7B](https://huggingface.co/allenai/Olmo-3-1025-7B) |
| **SFT**                  | [Olmo-3-7B-Think-SFT](https://huggingface.co/allenai/Olmo-3-7B-Think-SFT) | [Olmo-3-32B-Think-SFT](https://huggingface.co/allenai/Olmo-3-32B-Think-SFT) | [Olmo-3-7B-Instruct-SFT](https://huggingface.co/allenai/Olmo-3-7B-Instruct-SFT) |
| **DPO**                  | [Olmo-3-7B-Think-DPO](https://huggingface.co/allenai/Olmo-3-7B-Think-DPO) | [Olmo-3-32B-Think-DPO](https://huggingface.co/allenai/Olmo-3-32B-Think-DPO) | [Olmo-3-7B-Instruct-DPO](https://huggingface.co/allenai/Olmo-3-7B-Instruct-DPO) |
| **Final Models (RLVR)**  | [Olmo-3-7B-Think](https://huggingface.co/allenai/Olmo-3-7B-Think) | [Olmo-3-32B-Think](https://huggingface.co/allenai/Olmo-3-32B-Think) | [Olmo-3-7B-Instruct](https://huggingface.co/allenai/Olmo-3-7B-Instruct) |            
             

## Installation

Olmo 3 is supported in transformers 4.57.0 or higher:
```bash
pip install transformers>=4.57.0
```

## Inference

You can use OLMo with the standard HuggingFace transformers library:
```python
from transformers import AutoModelForCausalLM, AutoTokenizer
olmo = AutoModelForCausalLM.from_pretrained("allenai/Olmo-3-7B-Think")
tokenizer = AutoTokenizer.from_pretrained("allenai/Olmo-3-7B-Think")
message = ["Who would win in a fight - a dinosaur or a cow named Moo Moo?"]
inputs = tokenizer(message, return_tensors='pt', return_token_type_ids=False)
# optional verifying cuda
# inputs = {k: v.to('cuda') for k,v in inputs.items()}
# olmo = olmo.to('cuda')
response = olmo.generate(**inputs, max_new_tokens=100, do_sample=True, top_k=50, top_p=0.95)
print(tokenizer.batch_decode(response, skip_special_tokens=True)[0])
>> '<think>Okay, so the question is who would win in a fight...'
```

For faster performance, you can quantize the model using the following method:
```python
AutoModelForCausalLM.from_pretrained("allenai/Olmo-3-7B-Think", 
    torch_dtype=torch.float16, 
    load_in_8bit=True)  # Requires bitsandbytes
```
The quantized model is more sensitive to data types and CUDA operations. To avoid potential issues, it's recommended to pass the inputs directly to CUDA using:
```python
inputs.input_ids.to('cuda')
```

We have released checkpoints for these models. For post-training, the naming convention is `step_XXXX`. 


To load a specific model revision with HuggingFace, simply add the argument `revision`:
```bash
olmo = AutoModelForCausalLM.from_pretrained("allenai/Olmo-3-7B-Think", revision="step_1375")
```

Or, you can access all the revisions for the models via the following code snippet:
```python
from huggingface_hub import list_repo_refs
out = list_repo_refs("allenai/Olmo-3-7B-Think")
branches = [b.name for b in out.branches]
```

### Chat template

## Default System Message
The default system prompt for this model is:
```
<|im_start|>system
You are Olmo, a helpful AI assistant built by Ai2. Your date cutoff is December 2024, and your model weights are available at https://huggingface.co/allenai.
<|im_end|>
```

## Chat Format

The chat template for this model is formatted as:
```
<|im_start|>system
You are Olmo, a helpful AI assistant built by Ai2. Your date cutoff is December 2024, and your model weights are available at https://huggingface.co/allenai.
<|im_start|>user
Who would win in a fight - a dinosaur or a cow named Moo Moo?<|im_end|>
<|im_start|>assistant
<think>Okay, so the question is who would win in a fight between a dinosaur and a cow named Moo Moo.
Hmm, first I need to break this down. Let me think about the different factors involved here..... </think>
Moo Moo the cow would certinaly win.
<|endoftext|>
```

### Model Description

- **Developed by:** Allen Institute for AI (Ai2)
- **Model type:** a Transformer style autoregressive language model.
- **Language(s) (NLP):** English
- **License:** This model is licensed under Apache 2.0. It is intended for research and educational use in accordance with Ai2's [Responsible Use Guidelines](https://allenai.org/responsible-use).
- **Contact:** Technical inquiries: `olmo@allenai.org`. Press: `press@allenai.org`
- **Date cutoff:** Dec. 2024.


### Model Sources

- **Project Page:** https://allenai.org/olmo
- **Repositories:**
    - Open-Instruct for DPO and RLVR: https://github.com/allenai/open-instruct
    - OLMo-Core for pre-training and SFT: https://github.com/allenai/OLMo-core
    - OLMo-Eval for evaluation: https://github.com/allenai/OLMo-Eval
- **Paper:** [TBD]
<!-- - **Technical blog post:** (URL)  -->
<!-- - **W&B Logs:** [SFT](()), [DPO](()), [RLVR](()) -->


## Evaluation

| Skill | Benchmark | Olmo 3 Think 7B SFT | Olmo 3 Think 7B DPO | Olmo 3 Think 7B | OpenThinker3-7B | Nemotron-Nano-9B-v2 | DeepSeek-R1-Distill-Qwen-7B | Qwen 3 8B (reasoning) | Qwen 3 VL 8B Thinker | OpenReasoning Nemotron 7B |
|-------|-----------|------------------|------------------|--------------|------------------|-----------------------|------------------------------|-------------------------|---------------------------|-----------------------------|
| **Math** | MATH | 94.4 | 92.4 | 95.1 | 94.5 | 94.4 | 87.9 | 95.1 | 95.2 | 94.6 |
|  | AIME 2024 | 69.6 | 74.6 | 71.6 | 67.7 | 72.1 | 54.9 | 74.0 | 70.9 | 77.0 |
|  | AIME 2025 | 57.6 | 62.7 | 64.6 | 57.2 | 58.9 | 40.2 | 67.8 | 61.5 | 73.1 |
|  | OMEGA | 45.0 | 40.5 | 37.8 | 38.4 | 42.4 | 28.5 | 43.4 | 38.1 | 43.2 |
| **Reasoning** | BBH | 84.1 | 83.7 | 86.6 | 77.1 | 86.2 | 73.5 | 84.4 | 86.8 | 81.3 |
|  | ZebraLogic | 57.9 | 60.6 | 66.5 | 34.9 | 60.8 | 26.1 | 85.2 | 91.2 | 22.4 |
|  | AGI Eval | 77.2 | 79.1 | 81.5 | 78.6 | 83.1 | 69.5 | 87.0 | 90.1 | 81.4 |
| **Coding** | HumanEval+ | 88.2 | 91.4 | 89.9 | 87.4 | 89.7 | 83.0 | 80.2 | 83.7 | 89.7 |
|  | MBPP+ | 63.2 | 63.0 | 64.7 | 61.4 | 66.1 | 63.5 | 69.1 | 63.0 | 61.2 |
|  | LCB v3 | 67.8 | 75.1 | 75.2 | 68.0 | 83.4 | 58.8 | 86.2 | 85.5 | 82.3 |
| **IF** | IFEval | 77.9 | 75.9 | 88.2 | 51.7 | 86.0 | 59.6 | 87.4 | 85.5 | 42.5 |
|  | IFBench | 30.0 | 28.3 | 41.6 | 23.0 | 34.6 | 16.7 | 37.1 | 40.4 | 23.4 |
| **Knowledge** | MMLU | 74.9 | 74.8 | 77.8 | 77.4 | 84.3 | 67.9 | 85.4 | 86.5 | 80.7 |
| **QA** | PopQA | 20.8 | 24.7 | 23.7 | 18.0 | 17.9 | 12.8 | 24.3 | 29.3 | 14.5 |
|  | GPQA | 45.8 | 48.6 | 46.2 | 47.6 | 56.2 | 54.4 | 57.7 | 61.5 | 56.6 |
| **Chat** | AE 2 | 43.9 | 50.6 | 52.1 | 24.0 | 58.0 | 7.7 | 60.5 | 73.5 | 8.6 |
| **Safety** |  | 65.8 | 67.7 | 70.7 | 31.3 | 72.1 | 54.0 | 68.3 | 82.9 | 30.3 |

## Model Details

#### Stage 1: SFT
- supervised fine-tuning on the Dolci-Think-SFT-7B dataset. This dataset consits of math, code, chat, and general knowledge queries.
- Datasets: [Dolci-Think-SFT-7B](https://huggingface.co/datasets/allenai/dolci-thinking-sft), [Dolci-Instruct-SFT-7B](https://huggingface.co/datasets/allenai/dolci-instruct-sft)

#### Stage 2:DPO
- direct preference optimization on the Dolci-Think-DPO-7B dataset. This dataset consits of math, code, chat, and general knowledge queries.
- Datasets: [Dolci-Think-DPO-7B](https://huggingface.co/datasets/allenai/dolci-thinking-dpo), [Dolci-Instruct-DPO-7B](https://huggingface.co/datasets/allenai/dolci-3-instruct-dpo-with-metadata)

#### Stage 3: RLVR
- reinforcement learning from verifiable rewards on the Dolci-Think-RL-7B dataset. This dataset consits of math, code, instruction-following, and general chat queries.
- Datasets: [Dolci-Think-RL-7B](https://huggingface.co/datasets/allenai/Dolci-Think-RL-7B), [Dolci-Instruct-RL-7B](https://huggingface.co/datasets/allenai/Dolci-Instruct-RL-7B)

## Inference & Recommended Settings
We evaluated our models on the following settings. We also recommend using them for generation:
- **temperature:** `0.6`
- **top_p:** `0.95`
- **max_tokens:** `32768`

### transformers Example
```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "allenai/Olmo-3-7B-Think"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
)

prompt = "Who would win in a fight - a dinosaur or a cow named MooMoo?"
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

outputs = model.generate(
    **inputs,
    temperature=0.6,
    top_p=0.95,
    max_new_tokens=32768,
)

print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### vllm Example
```python
from vllm import LLM, SamplingParams

model_id = "allenai/Olmo-3-7B-Think"
llm = LLM(model=model_id)

sampling_params = SamplingParams(
    temperature=0.6,
    top_p=0.95,
    max_tokens=32768,
)

prompt = "Who would win in a fight - a dinosaur or a cow named MooMoo?"
outputs = llm.generate(prompt, sampling_params)
print(outputs[0].outputs[0].text)
```


## Bias, Risks, and Limitations
Like any base language model or fine-tuned model without safety filtering, these models can easily be prompted by users to generate harmful and sensitive content. Such content may also be produced unintentionally, especially in cases involving bias, so we recommend that users consider the risks when applying this technology. Additionally, many statements from OLMo or any LLM are often inaccurate, so facts should be verified.


## Citation

```
@misc{olmo2025olmo3,
title={Olmo 3},
author={Team Olmo and Allyson Ettinger and Amanda Bertsch and Bailey Kuehl and David Graham and David Heineman and Dirk Groeneveld and Faeze Brahman and Finbarr Timbers and Hamish Ivison and Jacob Morrison and Jake Poznanski and Kyle Lo and Luca Soldaini and Matt Jordan and Mayee Chen and Michael Noukhovitch and Nathan Lambert and Pete Walsh and Pradeep Dasigi and Robert Berry and Saumya Malik and Saurabh Shah and Scott Geng and Shane Arora and Shashank Gupta and Taira Anderson and Teng Xiao and Tyler Murray and Tyler Romero and Victoria Graf and Akari Asai and Akshita Bhagia and Alexander Wettig and Alisa Liu and Aman Rangapur and Chloe Anastasiades and Costa Huang and Dustin Schwenk and Harsh Trivedi and Ian Magnusson and Jaron Lochner and Jiacheng Liu and Lester James V. Miranda and Maarten Sap and Malia Morgan and Michael Schmitz and Michal Guerquin and Michael Wilson and Regan Huff and Ronan Le Bras and Rui Xin and Rulin Shao and Sam Skjonsberg and Shannon Zejiang Shen and Shuyue Stella Li and Tucker Wilde and Valentina Pyatkin and Will Merrill and Yapei Chang and Yuling Gu and Zhiyuan Zeng and Ashish Sabharwal and Luke Zettlemoyer and Pang Wei Koh and Ali Farhadi and Noah A. Smith and Hannaneh Hajishirzi},
year={2025},
eprint={2512.13961},
archivePrefix={arXiv},
primaryClass={cs.CL},
url={https://arxiv.org/abs/2512.13961},
}
```

## Model Card Contact
For errors in this model card, contact `olmo@allenai.org`.