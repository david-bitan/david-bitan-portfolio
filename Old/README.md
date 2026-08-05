# Old / archived components

Kept as safety net in case David wants to revert layout choices.
Do NOT import from here — files carry a `.bak` extension so Astro's
file-based router and the TS compiler ignore them.

## Files

- `work-slug.astro.bak` — snapshot of `src/pages/work/[slug].astro` right
  before switching the project page gallery from a 2-col to a 4-col grid
  (Phase B follow-up, 2026-08-05).
- `Lightbox.astro.bak` — snapshot of `src/components/Lightbox.astro` at
  the same moment (before the Behance-style unified lightbox lands in
  Phase E). Restored the same way if the Behance approach turns out to be
  the wrong bet.

## Restoring one file

Overwrite the live file with the backup:

```powershell
copy Old\work-slug.astro.bak src\pages\work\[slug].astro
copy Old\Lightbox.astro.bak src\components\Lightbox.astro
```

Then commit.
