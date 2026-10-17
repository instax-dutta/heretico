# Card fixtures

Real Hugging Face model cards, copied verbatim (only their filenames changed)
so the parser is tested against the formats authors actually publish:

- canonical Heretic tables (`p-e-w/*`)
- metric-row tables with reversed column order (`froggeric/*`)
- bold bullet lists with a trial log in a code fence (`DreamFast/*`)
- inline `Refusals: 12/100, KL divergence: 0.09` (`DavidAU/*`)
- transposed choice tables (`pottokao/*`)
- quant cards that repeat their parent's numbers (`richardyoung/*`, `zaakirio/*`)
- quant cards with no metrics at all (`mradermacher/*`)

Do not "clean up" these files. Their mess is the test.
