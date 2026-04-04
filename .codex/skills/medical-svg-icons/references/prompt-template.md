# Prompt Template

Use or adapt this prompt when generating one icon or a batch:

```text
Generate [N] SVG icons for a medical imaging / DICOM viewer.

Requirements:
- first benchmark at least 3 mainstream medical imaging viewers from official sources
- redraw fresh geometry in the target icon system instead of pasting vendor SVGs directly
- unified style across the full set
- 24x24 viewBox
- serious clinical workstation feel
- larger perceived size than a typical thin outline icon set
- strong semantic readability at toolbar size
- allow restrained two-tone color if it improves meaning
- primary stroke=currentColor
- stroke-width around 2
- round linecap and linejoin
- tight but balanced optical padding
- readable at 18px
- avoid unnecessary tiny details
- prefer one dominant metaphor per icon
- accent color, if used, should mark semantic planes rather than decorate

Icons needed:
- [icon name]: [meaning]
- [icon name]: [meaning]

Output:
- one SVG per icon
- brief benchmark summary describing which viewer patterns were borrowed
- brief explanation of the metaphor for each icon
- keep geometry consistent across the set
- mention whether each icon uses mono or two-tone
```

For this repo, you can tighten it further:

```text
Benchmark OHIF, Weasis, and RadiAnt first. Match a serious medical workstation icon family in a Next.js DICOM viewer. Prefer stronger, more literal radiology-tool metaphors over generic app icons, redraw the geometry yourself, and do not let icons feel optically small.
```
