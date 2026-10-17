---
license: apache-2.0
datasets:
- zerofata/Instruct-Anime
- zerofata/Gemini-3.1-Pro-SmallWiki
- zerofata/Gemini-3.1-Pro-GLM5-Characters
- zerofata/Roleplay-Anime-Characters
base_model:
- zerofata/G4-MeroMero-26B-A4B
tags:
- heretic
- uncensored
- decensored
- abliterated
---
<div style="background-color: #ff4444; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
<h2 style="color: white; margin: 0 0 10px 0;">🚨⚠️ I HAVE REACHED HUGGING FACE'S FREE STORAGE LIMIT ⚠️🚨</h2>
<p style="font-size: 18px; margin: 0 0 15px 0;">I can no longer upload new models unless I can cover the cost of additional storage.<br>I host <b>70+ free models</b> as an independent contributor and this work is unpaid.<br><b>Without your support, no more new models can be uploaded.</b></p>
<p style="font-size: 20px; margin: 0;">
<a href="https://patreon.com/LLMfan46" style="color: white; text-decoration: underline;">🎉 Patreon (Monthly)</a> &nbsp;|&nbsp;
<a href="https://ko-fi.com/llmfan46" style="color: white; text-decoration: underline;">☕ Ko-fi (One-time)</a>
</p>
<p style="font-size: 16px; margin: 10px 0 0 0;">Every contribution goes directly toward Hugging Face storage fees to keep models free for everyone.</p>
</div>

---

### **88% fewer refusals** (12/100 Uncensored vs 99/100 Original) while preserving model quality (0.0152 KL divergence).

## ❤️ Support My Work
Creating these models takes significant time, work and compute. If you find them useful consider supporting me:

![image/png](https://huggingface.co/llmfan46/Omega-Darker-Gaslight_The-Final-Forgotten-Fever-Dream-24B-ultra-uncensored-heretic-v1/resolve/main/waifu001.webp)

| Platform | Link | What you get |
|----------|------|--------------|
| 🎉 Patreon | [Monthly support](https://patreon.com/LLMfan46) | Priority model requests |
| ☕ Ko-fi | [One-time tip](https://ko-fi.com/llmfan46) | My eternal gratitude |

Your help will motivate me and would go into further improving my workflow and coverings fees for storage, compute and may even help uncensoring bigger model with rental Cloud GPUs.

-----

# This is a decensored version of [zerofata/G4-MeroMero-26B-A4B](https://huggingface.co/zerofata/G4-MeroMero-26B-A4B), made using [Heretic](https://github.com/p-e-w/heretic) v1.2.0 with the [Arbitrary-Rank Ablation (ARA)](https://github.com/p-e-w/heretic/pull/211) method

## Abliteration parameters

| Parameter | Value |
| :-------- | :---: |
| **start_layer_index** | 15 |
| **end_layer_index** | 26 |
| **preserve_good_behavior_weight** | 0.3274 |
| **steer_bad_behavior_weight** | 0.0005 |
| **overcorrect_relative_weight** | 0.6647 |
| **neighbor_count** | 15 |

## Targeted components

  * attn.o_proj

## Performance

| Metric | This model | Original model ([G4-MeroMero-26B-A4B](https://huggingface.co/zerofata/G4-MeroMero-26B-A4B)) |
| :----- | :--------: | :---------------------------: |
| **KL divergence** | <span style="color:darkgoldenrod">0.0152</span> | 0 *(by definition)* |
| **Refusals** | ✅ <span style="color:darkgreen">12/100</span> | ❌ <span style="color:blue">99/100</span> |

Lower refusals indicate fewer content restrictions, while lower KL divergence indicates more closeness to the original model's baseline. Higher refusals cause more rejections, objections, pushbacks, lecturing, censorship, softening and deflections.

## MMLU test results:

<span style="color:blue">Original:</span>

============================================================

- Total questions: 7021

- Correct: 5758

- **Accuracy: 0.8201 (82.01%)**

- Parse failures: 9

============================================================

**Tested subject scores:**
- professional_law: 0.6841 (537/785)
- moral_scenarios: 0.6991 (309/442)
- miscellaneous: 0.9191 (352/383)
- professional_psychology: 0.8829 (279/316)
- high_school_psychology: 0.9556 (258/270)
- high_school_macroeconomics: 0.8934 (176/197)
- elementary_mathematics: 0.8804 (162/184)
- moral_disputes: 0.8333 (145/174)
- prehistory: 0.9070 (156/172)
- philosophy: 0.8365 (133/159)
- high_school_biology: 0.9605 (146/152)
- professional_accounting: 0.7692 (110/143)
- clinical_knowledge: 0.8714 (122/140)
- high_school_microeconomics: 0.9265 (126/136)
- nutrition: 0.8815 (119/135)
- professional_medicine: 0.8433 (113/134)
- conceptual_physics: 0.8672 (111/128)
- high_school_mathematics: 0.4803 (61/127)
- human_aging: 0.7931 (92/116)
- security_studies: 0.7946 (89/112)
- high_school_statistics: 0.8018 (89/111)
- marketing: 0.9725 (106/109)
- high_school_world_history: 0.8962 (95/106)
- sociology: 0.9029 (93/103)
- high_school_government_and_politics: 0.9505 (96/101)
- high_school_geography: 0.9394 (93/99)
- high_school_chemistry: 0.8144 (79/97)
- high_school_us_history: 0.9158 (87/95)
- virology: 0.5393 (48/89)
- college_medicine: 0.8068 (71/88)
- world_religions: 0.8636 (76/88)
- high_school_physics: 0.7024 (59/84)
- electrical_engineering: 0.7901 (64/81)
- astronomy: 0.9114 (72/79)
- logical_fallacies: 0.8158 (62/76)
- high_school_european_history: 0.9041 (66/73)
- anatomy: 0.8451 (60/71)
- college_biology: 0.9219 (59/64)
- human_sexuality: 0.8594 (55/64)
- formal_logic: 0.6875 (44/64)
- public_relations: 0.7049 (43/61)
- international_law: 0.9333 (56/60)
- college_physics: 0.7544 (43/57)
- college_mathematics: 0.6182 (34/55)
- econometrics: 0.7407 (40/54)
- jurisprudence: 0.8679 (46/53)
- high_school_computer_science: 0.9423 (49/52)
- machine_learning: 0.8462 (44/52)
- medical_genetics: 0.9216 (47/51)
- global_facts: 0.5294 (27/51)
- management: 0.9000 (45/50)
- us_foreign_policy: 0.9400 (47/50)
- college_chemistry: 0.5532 (26/47)
- abstract_algebra: 0.7234 (34/47)
- business_ethics: 0.7826 (36/46)
- college_computer_science: 0.8000 (36/45)
- computer_security: 0.8140 (35/43)


<span style="color:darkgreen">Heretic:</span>

============================================================

- Total questions: 7021

- Correct: 5698

- **Accuracy: 0.8116 (81.16%)**

- Parse failures: 6

============================================================

**Tested subject scores:**
- professional_law: 0.6510 (511/785)
- moral_scenarios: 0.7059 (312/442)
- miscellaneous: 0.9164 (351/383)
- professional_psychology: 0.8861 (280/316)
- high_school_psychology: 0.9519 (257/270)
- high_school_macroeconomics: 0.8985 (177/197)
- elementary_mathematics: 0.8696 (160/184)
- moral_disputes: 0.8276 (144/174)
- prehistory: 0.8953 (154/172)
- philosophy: 0.8428 (134/159)
- high_school_biology: 0.9539 (145/152)
- professional_accounting: 0.6853 (98/143)
- clinical_knowledge: 0.9000 (126/140)
- high_school_microeconomics: 0.9265 (126/136)
- nutrition: 0.8815 (119/135)
- professional_medicine: 0.8134 (109/134)
- conceptual_physics: 0.8516 (109/128)
- high_school_mathematics: 0.4803 (61/127)
- human_aging: 0.8276 (96/116)
- security_studies: 0.7946 (89/112)
- high_school_statistics: 0.7658 (85/111)
- marketing: 0.9725 (106/109)
- high_school_world_history: 0.8868 (94/106)
- sociology: 0.8932 (92/103)
- high_school_government_and_politics: 0.9505 (96/101)
- high_school_geography: 0.9394 (93/99)
- high_school_chemistry: 0.7526 (73/97)
- high_school_us_history: 0.9158 (87/95)
- virology: 0.5169 (46/89)
- college_medicine: 0.8409 (74/88)
- world_religions: 0.8750 (77/88)
- high_school_physics: 0.6786 (57/84)
- electrical_engineering: 0.8025 (65/81)
- astronomy: 0.9114 (72/79)
- logical_fallacies: 0.7763 (59/76)
- high_school_european_history: 0.8904 (65/73)
- anatomy: 0.8732 (62/71)
- college_biology: 0.8906 (57/64)
- human_sexuality: 0.9219 (59/64)
- formal_logic: 0.6875 (44/64)
- public_relations: 0.7213 (44/61)
- international_law: 0.9333 (56/60)
- college_physics: 0.6842 (39/57)
- college_mathematics: 0.5636 (31/55)
- econometrics: 0.7222 (39/54)
- jurisprudence: 0.8491 (45/53)
- high_school_computer_science: 0.9423 (49/52)
- machine_learning: 0.8077 (42/52)
- medical_genetics: 0.9216 (47/51)
- global_facts: 0.4706 (24/51)
- management: 0.8800 (44/50)
- us_foreign_policy: 0.9400 (47/50)
- college_chemistry: 0.4894 (23/47)
- abstract_algebra: 0.7447 (35/47)
- business_ethics: 0.8261 (38/46)
- college_computer_science: 0.8222 (37/45)
- computer_security: 0.8605 (37/43)

MMLU - Massive Multitask Language Understanding, multiple-choice questions across 57 subjects (math, history, law, medicine, etc.).

## GGUF Version

GGUF quantizations available here [llmfan46/G4-MeroMero-26B-A4B-it-uncensored-heretic-GGUF](https://huggingface.co/llmfan46/G4-MeroMero-26B-A4B-it-uncensored-heretic-GGUF).

-----

<style>
.gs {
  --bg:      #0d0a10;
  --surface: #14101a;
  --edge:    #2a1f38;
  --rule:    #382850;
  --text:    #b8a0cc;
  --dim:     #7a6090;
  --bright:  #f0e6ff;
  --azure:   #c060ff;
  --crimson: #ff4da6;
  --az-glow: rgba(192,96,255,0.10);
  --cr-glow: rgba(255,77,166,0.06);
  --mono:    'JetBrains Mono', monospace;
  --sans:    'Inter', sans-serif;

  font-family: var(--sans);
  color: var(--text);
  max-width: 900px;
  margin: 0 auto;
  padding: 0 0 60px;
  line-height: 1.7;
  font-size: 1rem;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(192,96,255,0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(255,77,166,0.02) 0%, transparent 50%),
    var(--bg);
}

/* ── Profile Card ── */
.gs-profile {
  border-bottom: none;
  position: relative;
  background: var(--surface);
  margin-bottom: 0;
}
.gs-profile-art {
  position: relative;
}
.gs-profile-art img {
  display: block;
  width: 100%;
  height: 380px;
  object-fit: cover;
  margin-top: 0px;
}
.gs-ident {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 120px 44px 28px;
  background: linear-gradient(
    to top,
    var(--bg) 0%,
    rgba(13,10,16,0.92) 30%,
    rgba(13,10,16,0.4) 60%,
    transparent 100%
  );
}
.gs-profile-info {
  padding: 20px 44px 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.gs-profile-label {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.gs-profile-label .gs-snum {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--crimson);
  opacity: 1;
  position: static;
  transform: none;
}
.gs-profile-label .gs-stitle {
  font-size: 0.62rem;
  color: var(--dim);
  font-weight: 700;
  letter-spacing: 0.14em;
}
.gs-profile-label .gs-stitle::before {
  content: none;
}
.gs-name {
  font-family: var(--sans);
  font-size: 3.2rem;
  font-weight: 900;
  color: var(--bright);
  letter-spacing: 0.06em;
  line-height: 1;
  margin: 0 0 10px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  overflow-wrap: break-word;
}
.gs-base {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--crimson);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: block;
}
.gs-profile-bio p {
  margin: 0 0 14px;
  font-size: 0.95rem;
}
.gs-profile-bio p:last-child { margin-bottom: 0; }

/* ── Sections ── */
.gs-section {
  padding: 0;
}
.gs-shead {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 44px 14px;
  margin-bottom: 28px;
  border-top: 2px solid;
  border-image: linear-gradient(90deg, var(--crimson), var(--azure)) 1;
}
.gs-snum {
  font-family: var(--mono);
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--crimson);
  letter-spacing: 0.06em;
  opacity: 0.12;
  position: absolute;
  right: 44px;
  top: 50%;
  transform: translateY(-50%);
  line-height: 1;
}
.gs-stitle {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--bright);
}
.gs-stitle::before {
  content: '\2726';
  color: var(--crimson);
  font-size: 0.8em;
  margin-right: 8px;
}
.gs-sbody {
  padding: 0 44px 44px;
}
.gs-sbody p {
  margin: 0 0 14px;
  font-size: 0.95rem;
}
.gs-sbody p:last-child { margin-bottom: 0; }

/* ── Data panels ── */
.gs-stack {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.gs-stack .gs-panel:nth-child(3) {
  grid-column: 1 / -1;
}
.gs-panel {
  border: 1px solid var(--edge);
  border-left: 3px solid var(--crimson);
  position: relative;
  background: var(--surface);
  box-shadow: 0 0 20px rgba(192,96,255,0.03);
}
.gs-panel::before {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--crimson);
  border-right: 1px solid var(--crimson);
  opacity: 0.5;
}
.gs-panel::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-bottom: 1px solid var(--azure);
  border-right: 1px solid var(--azure);
  opacity: 0.4;
}
.gs-panel-head {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dim);
  padding: 10px 16px;
  border-bottom: 1px solid var(--edge);
}
.gs-panel-head::after {
  content: ' \2726';
  color: var(--crimson);
  opacity: 0.5;
}
.gs-row {
  display: grid;
  grid-template-columns: 10ch 1fr;
  align-items: baseline;
  column-gap: 4px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--edge);
  font-size: 0.9rem;
}
.gs-row:last-child { border-bottom: none; }
.gs-key {
  font-family: var(--mono);
  font-size: 0.9rem;
  color: var(--dim);
}
.gs-key::after {
  content: ':';
}
.gs-val {
  color: var(--bright);
  font-size: 0.9rem;
}
.gs-row .gs-val:only-child {
  grid-column: 1 / -1;
}

/* ── Quantizations (compact) ── */
.gs-section--compact .gs-shead {
  border-top: 1px solid var(--edge);
  border-image-source: none;
  padding: 12px 44px 10px;
  margin-bottom: 18px;
}
.gs-section--compact .gs-snum {
  opacity: 0.08;
}
.gs-section--compact .gs-stitle::before {
  content: '\2726';
}
.gs-section--compact .gs-sbody {
  padding: 0 44px 32px;
}
.gs-qrow {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.gs-qpanel {
  background: var(--surface);
  border: 1px solid var(--edge);
  border-left: 3px solid var(--crimson);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  border-radius: 4px;
  position: relative;
  box-shadow: 0 0 20px rgba(192,96,255,0.03);
}
.gs-qpanel::before {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--crimson);
  border-right: 1px solid var(--crimson);
  opacity: 0.5;
}
.gs-qpanel::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-bottom: 1px solid var(--azure);
  border-right: 1px solid var(--azure);
  opacity: 0.4;
}
.gs-qtype {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--crimson);
  flex-shrink: 0;
}
.gs-qsep {
  width: 1px;
  height: 16px;
  background: var(--rule);
  flex-shrink: 0;
}
.gs-qpanel a {
  color: var(--bright);
  text-decoration: none;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--rule);
}
.gs-qpanel a:hover { color: var(--crimson); border-bottom-color: var(--crimson); }

/* ── Journal (Creation Process) ── */
.gs-section--journal .gs-sbody {
  margin: 0 44px;
  padding: 24px 32px 32px;
  background: var(--surface);
  border: 1px solid var(--edge);
  border-left: 4px solid var(--azure);
  position: relative;
  margin-bottom: 0;
}
.gs-section--journal .gs-sbody::before {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 12px;
  height: 12px;
  border-top: 1px solid var(--azure);
  border-right: 1px solid var(--azure);
  opacity: 0.4;
}
.gs-section--journal .gs-sbody::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: -1px;
  width: 12px;
  height: 12px;
  border-bottom: 1px solid var(--crimson);
  border-left: 1px solid var(--crimson);
  opacity: 0.3;
}
.gs-section--journal .gs-sbody p:first-child {
  font-style: italic;
  color: var(--bright);
}

/* ── Links ── */
.gs a {
  color: var(--bright);
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
}
.gs a:hover { color: var(--crimson); border-bottom-color: var(--crimson); }

/* ── Dropdown ── */
.gs details {
  border: 1px solid var(--edge);
  border-left: 3px solid var(--crimson);
  margin-top: 24px;
  position: relative;
  background: var(--surface);
  box-shadow: 0 0 20px rgba(192,96,255,0.03);
}
.gs details::before {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--crimson);
  border-right: 1px solid var(--crimson);
  opacity: 0.5;
}
.gs details::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-bottom: 1px solid var(--azure);
  border-right: 1px solid var(--azure);
  opacity: 0.4;
}
.gs summary {
  list-style: none;
  padding: 11px 16px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dim);
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
}
.gs summary::-webkit-details-marker { display: none; }
.gs summary::before {
  content: '+';
  color: var(--crimson);
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
}
.gs details[open] summary::before { content: '−'; }
.gs summary:hover { color: var(--bright); }
.gs-detail-body {
  padding: 22px 18px;
  border-top: 1px solid var(--edge);
}
.gs-detail-body p { margin: 0 0 16px; font-size: 0.9rem; }
.gs-cfg-title {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim);
  margin: 0 0 8px;
}

/* ── Code ── */
.gs pre {
  background: #080510;
  border: 1px solid var(--edge);
  border-left: 2px solid var(--azure);
  padding: 16px 18px;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 0.76rem;
  line-height: 1.6;
  color: var(--text);
  margin: 0 0 22px;
}
.gs pre:last-child { margin-bottom: 0; }
.gs pre code { background: none; color: inherit; padding: 0; }
.gs code {
  font-family: var(--mono);
  font-size: 0.875em;
  color: var(--crimson);
  background: var(--az-glow);
  padding: 2px 5px;
}
</style>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stardom</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
<div class="gs">

<div class="gs-profile">
<div class="gs-profile-art">
<img src="https://cdn-uploads.huggingface.co/production/uploads/65b19c6c638328850e12d38c/xBv_weuMs5x3i4WFDRksn.png" alt="image">
<div class="gs-ident">
<h1 class="gs-name">Mero Mero</h1>
<span class="gs-base">Gemma4 26B A4B</span>
</div>
</div>
</div>

<div class="gs-section">
<div class="gs-shead">
<span class="gs-snum">01</span>
<span class="gs-stitle">Overview</span>
</div>
<div class="gs-sbody">
<p>God, this model was difficult to work with.</p>
<p>Google cooked, there wasn't a lot to improve but there was a lot to break.</p>
<p>This model is a finetune that was merged back into the original instruct. It feels a lot like the original instruct. However, reasoning is more structured, using less tokens during RP and this model generally has a slightly less verbose / flowery writing style.</p>
<p>Main weakness of this model I think is the swipe variety hasn't improved. Logic and repetition I think are roughly on par with the original.</p>
<p>Supports both thinking and non thinking.</p>
</div>
</div>


<div class="gs-section">
<div class="gs-shead">
<span class="gs-snum">02</span>
<span class="gs-stitle">SillyTavern Settings</span>
</div>
<div class="gs-sbody">
<div class="gs-stack">
<div class="gs-panel">
<div class="gs-panel-head">Suggested Roleplay Format</div>
<div class="gs-row"><span class="gs-key">Actions</span><span class="gs-val">In plaintext</span></div>
<div class="gs-row"><span class="gs-key">Dialogue</span><span class="gs-val">"In quotes"</span></div>
<div class="gs-row"><span class="gs-key">Thoughts</span><span class="gs-val">*In asterisks*</span></div>
</div>
<div class="gs-panel">
<div class="gs-panel-head">Recommended Samplers</div>
<div class="gs-row"><span class="gs-key">Temp</span><span class="gs-val">0.8 - 1.0</span></div>
<div class="gs-row"><span class="gs-key">MinP</span><span class="gs-val">0.05</span></div>
<div class="gs-row"></span><span class="gs-val"></span></div>
</div>
<div class="gs-panel">
<div class="gs-panel-head">Instruct</div>
<div class="gs-row"><span class="gs-val"><a href="https://huggingface.co/zerofata/G4-MeroMero-26B-A4B/raw/main/Gemma4-Think.json">Gemma 4 - Think</a></span></div>
<div class="gs-row"><span class="gs-val"><a href="https://huggingface.co/zerofata/G4-MeroMero-26B-A4B/raw/main/Gemma4-NoThink.json">Gemma 4 - NoThink</a></span></div>
</div>
</div>
</div>
</div>


<div class="gs-section gs-section--compact">
<div class="gs-shead">
<span class="gs-snum">03</span>
<span class="gs-stitle">Quantizations</span>
</div>
<div class="gs-sbody">
<div class="gs-qrow">
<div class="gs-qpanel">
<span class="gs-qtype">GGUF</span>
<div class="gs-qsep"></div>
<a href="https://huggingface.co/zerofata/G4-MeroMero-26B-A4B-GGUF">iMatrix</a>
</div>
</div>
</div>
</div>


<div class="gs-section gs-section--journal">
<div class="gs-shead">
<span class="gs-snum">04</span>
<span class="gs-stitle">Creation Process</span>
</div>
<div class="gs-sbody">
<p>Creation Process: SFT > Merge</p>
<p>SFT on approx 35 million tokens.</p>
<p>Despite using 35 million tokens, this dataset is fairly modest in size. Trainable is somewhere in the rough ballpark of 15 million. The extra tokens are from a new multi turn RP dataset that I train last turn only.</p>
<p>Feels like Google left the instruct model at the razor's edge of overfitting. Finetune it at all and it feels like it'll rapidly lose intelligence, despite taking the writing style nicely. Hard to tell if you're overfitting or underfitting.</p>
<p>My solution was to blast the model with my data anyway to ensure it picked up the new reasoning format and writing style and then merge that back into the instruct to heal the logic damage. There's still room for a better merge that keeps more of the writing style and potentially using the base model to undo some of the overfitting.</p>
<p>Trained using Axolotl.</p>
<details>
<summary>Mergekit Config</summary>
<div class="gs-detail-body">
<pre><code>models:
  &#45; model: google/gemma&#45;4&#45;26B&#45;A4B&#45;it
    parameters:
      weight: 0.5
  &#45; model: ApocalypseParty/G4&#45;26B&#45;SFT&#45;6
    parameters:
      weight: 0.5
merge_method: linear
dtype: bfloat16</code></pre>
</div>
</details>
<details>
<summary>Axolotl Config</summary>
<div class="gs-detail-body">
<pre><code>&#35; Gemma 4 26B&#45;A4B MoE QLoRA with ScatterMoE kernels
&#35;
&#35; Validated: 50 steps on FineTome&#45;100k, loss 8.8 &#45;> 1.8, single RTX 5090 (32GB)
&#35; torch_compile=true: 21 GiB peak VRAM, ~230 tok/s, 336s total
&#35;
&#35; Key notes:
&#35; &#45; Max sequence length on 32GB GPU: 2048 (micro_batch_size=1, SDP attention).
&#35;   4096 seq_len OOMs due to head_dim=512 math SDP materializing full score matrix.
&#35;   Use 48GB+ GPUs for longer sequences or multi&#45;GPU with FSDP.
&#32;
base_model: google/gemma&#45;4&#45;26B&#45;A4B&#45;it
&#32;
plugins:
  &#45; axolotl.integrations.cut_cross_entropy.CutCrossEntropyPlugin
  &#45; axolotl.integrations.kernels.KernelsPlugin
  &#45; axolotl.integrations.liger.LigerPlugin
use_kernels: true
use_scattermoe: true
cut_cross_entropy: true
experts_implementation: scattermoe
liger_layer_norm: true
liger_rope: true
liger_rms_norm: true
liger_glu_activation: true
liger_rms_norm_gated: true
strict: false
&#32;
datasets:
  &#45; path: ./data/gemma_4_sft_5_masked_20260415_082234.jsonl
val_set_size: 0.02
output_dir: ./G4&#45;26B&#45;SFT&#45;6
&#32;
sequence_len: 10756
pad_to_sequence_len: true
sample_packing: true
&#32;
load_in_4bit: false
&#35;quantize_moe_experts: true
adapter: lora
lora_r: 128
lora_alpha: 128
peft_use_rslora: true
lora_dropout: 0.0
freeze_mm_modules: true
&#32;
&#35; Restrict LoRA to text backbone only (skip vision/audio encoders)
&#35; using regex to match only the text decoder attention projections.
lora_target_modules: 'model.language_model.layers.[\d]+.(_checkpoint_wrapped_module.)?(mlp|self_attn).(up|down|gate|q|k|v|o)_proj'
&#32;
&#35; MoE expert LoRA (3D Parameter tensors, not nn.Linear)
lora_target_parameters:
  &#45; experts.gate_up_proj
  &#45; experts.down_proj
&#32;
lora_mlp_kernel: false
lora_qkv_kernel: false
lora_o_kernel: false
&#32;
&#35;bnb_config_kwargs:
&#35;  bnb_4bit_use_double_quant: true
&#32;
wandb_project: G4&#45;26B&#45;SFT
wandb_name: G4&#45;26B&#45;SFT&#45;6
&#32;
gradient_accumulation_steps: 2
micro_batch_size: 2
num_epochs: 2
optimizer: adamw_torch_fused
lr_scheduler: constant_with_warmup
learning_rate: 1e&#45;5
max_grad_norm: 1.0
&#32;
bf16: auto
tf32: true
&#32;
&#35;gradient_checkpointing: true
&#35;activation_offloading: true
logging_steps: 1
&#32;
&#35; FA2 not supported
sdp_attention: true
&#35;flex_attention: true
&#35;torch_compile: true
flash_attention: false
&#32;
warmup_ratio: 0.1
evals_per_epoch: 4
saves_per_epoch: 4
weight_decay: 0.01
special_tokens:
&#32;
fsdp_config:
  fsdp_version: 2
  offload_params: false
  cpu_ram_efficient_loading: false
  auto_wrap_policy: TRANSFORMER_BASED_WRAP
  transformer_layer_cls_to_wrap: Gemma4TextDecoderLayer
  state_dict_type: FULL_STATE_DICT
  sharding_strategy: FULL_SHARD
  reshard_after_forward: true
  activation_checkpointing: true</code></pre>
</div>
</details>
</div>
</div>

</div>
</body>
</html>