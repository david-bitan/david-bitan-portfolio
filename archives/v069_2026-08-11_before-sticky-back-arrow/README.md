# v069 — 2026-08-11 — before sticky back-arrow on filters

Snapshot AVANT modif ZoneFilters/CraftFilters (ajout back-arrow qui apparaît uniquement quand la barre devient sticky, avec anim fade + translate + padding-left shift sur le contenu).

## Fichiers
- src/components/ZoneFilters.astro
- src/components/CraftFilters.astro
- src/components/HomeFilters.astro (unchanged, not sticky — see note in commit)

## Rollback
cp archives/v069_.../src__components__ZoneFilters.astro src/components/ZoneFilters.astro
cp archives/v069_.../src__components__CraftFilters.astro src/components/CraftFilters.astro
