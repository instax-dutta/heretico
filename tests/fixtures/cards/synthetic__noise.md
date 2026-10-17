---
base_model: some-org/Base-7B
tags:
  - heretic
  - gguf
---

# Base-7B Heretic GGUF

GGUF quantizations of [some-org/Base-7B-heretic](https://huggingface.co/some-org/Base-7B-heretic), a model decensored with [Heretic](https://github.com/p-e-w/heretic).

## Quantization loss

UkisAI report these KL divergences against BF16 for their own files at the same
tiers: IQ3_S 0.051, IQ3_XXS 0.098, IQ2_S 0.135. The abliteration's own 0.082
comes on top of that.

## Search log

```
[Trial  80] Refusals:  0/100, KL divergence: 0.6098
[Trial  66] Refusals:  2/100, KL divergence: 0.2087
[Trial  75] Refusals:  3/100, KL divergence: 0.1378
```
