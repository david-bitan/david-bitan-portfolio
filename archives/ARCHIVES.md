# Archives — snapshots avant modifs

Journal des versions locales. Chaque entrée = snapshot du/des fichier(s) **AVANT modification** (ou juste après si point de repère stable). Sert au rollback rapide sans passer par git.

## Convention

- Dossier : `vNNN_YYYY-MM-DD_slug-court/`
- Nom fichier snapshot : chemin d'origine avec `/` remplacé par `__`
  - Ex : `src/pages/work/[slug].astro` → `src__pages__work__slug.astro`
- Ce fichier `ARCHIVES.md` = manifest à jour à chaque nouvelle version

## Comment rollback

1. Repérer la version voulue ci-dessous
2. Copier le fichier depuis `archives/vNNN_.../` vers son chemin d'origine
3. Vérifier localement, commit si OK

---

## v001 — 2026-08-06 — fix contraste mobile cards (light mode)

- **Commit git associé** : `e46ae0c`
- **Type** : point de repère stable (état APRÈS fix, avant push)
- **Fichiers** :
  - `src/pages/work/[slug].astro`
- **Changement** :
  - Ajout `border border-ink/10 shadow-md` sur wrapper card mobile
  - Ajout `ring-1 ring-ink/10 rounded-md` sur `<img>`
- **Pourquoi** : mockups blancs (Sonary Website light reviews) invisibles dans `bg-card` blanc sur `bg` gris ultra-clair. Card + image doivent avoir leur propre contour.
- **Rollback** : `cp archives/v001_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v002 — 2026-08-06 — état AVANT Phase F (PhoneMockup)

- **Commit git associé** : point de départ avant Phase F (post `e46ae0c`)
- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` (état v001)
- **Fichiers créés en Phase F (n'existent pas dans v002)** :
  - `src/components/PhoneMockup.astro` — rollback = supprimer
  - `src/lib/projectColors.ts` — rollback = supprimer
- **Rollback complet vers v002** :
  1. `cp archives/v002_.../src__pages__work__slug.astro src/pages/work/[slug].astro`
  2. `rm src/components/PhoneMockup.astro src/lib/projectColors.ts`

---

## v003 — 2026-08-06 — Phase F PhoneMockup intégré

- **Commit git associé** : `1771238`
- **Type** : point de repère stable (état APRÈS intégration Phase F)
- **Fichiers créés** :
  - `src/components/PhoneMockup.astro` — composant bezel iPhone-like (frame CSS, pas de SVG détaillé)
  - `src/lib/projectColors.ts` — palette bg par slug (11 projets, `DEFAULT_MOCKUP_BG` fallback)
- **Fichiers modifiés** :
  - `src/pages/work/[slug].astro` — imports + remplacement branche mobile de la loop zones (les 2 col grid de PhoneMockup remplace la card blanche)
- **Palette bg** :
  - sonary-dashboard #0f172a · sonary-website #1e3a8a · sonary-mailer #0e7490
  - playright #4c1d95 · top5 #065f46
  - ryze-hub #7f1d1d · ryze-brand #7f1d1d
  - casino-work #78350f · sport-betting #0c4a6e
  - branding-old #374151 · ui-ux-vintage #1f2937
- **Design PhoneMockup** :
  - Bloc bg couleur `rounded-2xl px-6 py-14 sm:px-10 sm:py-20`
  - Bezel noir `p-[10px] rounded-[2.5rem]` + `shadow-2xl` + `ring-1 ring-white/10`
  - Image screenshot 375px native, `rounded-[2rem]` clipped via wrapper `overflow-hidden`
- **Rollback vers v002** : voir instructions v002 ci-dessus

---

## v004 — 2026-08-06 — état AVANT fixes Phase F (long clips, align, Other)

- **Commit git associé** : `1771238` (post Phase F initial)
- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` (état v003)
  - `src/components/PhoneMockup.astro` (état v003)
- **Rollback** :
  - `cp archives/v004_.../src__pages__work__slug.astro src/pages/work/[slug].astro`
  - `cp archives/v004_.../src__components__PhoneMockup.astro src/components/PhoneMockup.astro`

---

## v005 — 2026-08-06 — fixes Phase F (clip long shots + align top + Other safe)

- **Commit git associé** : à remplir après push
- **Type** : point de repère stable
- **Problèmes visuels remontés par David sur Cloudflare preview** :
  - Screenshots mobiles longs (Sonary Website review 375x16000) étirés sur toute la hauteur dans le bezel → phones absurdement grands
  - Grid `sm:grid-cols-2` : phone court centré verticalement dans un row auto-stretched par un phone long voisin → grand vide au-dessus
  - Zone "Other" (images sans device dans l'URL, ex: sonary-website article-hub) rendues en full-width desktop 1200px → screenshots mobiles gigantesques
- **Fichiers modifiés** :
  - `src/components/PhoneMockup.astro` — `max-h-[820px] overflow-hidden` sur le wrapper image + fade bottom `bg-gradient-to-t from-black/60` pour indiquer scroll continue. Wrapper flex passe de `items-center` à `items-start`.
  - `src/pages/work/[slug].astro` — grid mobile passe `items-start` + nouvelle branche dédiée `zone.label === 'Other'` : grille 2 cols, images `object-contain max-h-[720px]` dans card `bg-card`, plus jamais full-width stretch.
- **Rollback vers v004** : voir v004 ci-dessus

---

## v006 — 2026-08-06 — ROLLBACK Phase F (David n'aime pas le design bleu + bezel)

- **Commit git associé** : à remplir après push
- **Type** : rollback — retour à l'état v002 (avant Phase F)
- **Raison** : après review Cloudflare, David n'aime pas le design PhoneMockup (bloc de couleur + bezel noir). Préfère l'ancien rendu (cards blanches avec border/shadow/ring du fix contraste v001).
- **Actions faites côté Cowork** :
  - `src/pages/work/[slug].astro` restauré depuis `archives/v002_.../` (identique à v001)
- **Actions à faire côté David (sandbox ne peut pas rm sur mount Windows)** :
  - `Remove-Item src\components\PhoneMockup.astro`
  - `Remove-Item src\lib\projectColors.ts`
- **v005 abandonnée** (fixes qui n'ont jamais été commités)

---

## v007 — 2026-08-06 — état AVANT Craft random + Load More

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/CraftSection.astro` (état actuel — grid 4-col, tous items visibles d'un coup)
- **Rollback** : `cp archives/v007_.../src__components__CraftSection.astro src/components/CraftSection.astro`

---

## v008 — 2026-08-06 — Craft random 12 + Load More button

- **Commit git associé** : à remplir après push
- **Type** : point de repère stable
- **Fichiers modifiés** :
  - `src/components/CraftSection.astro` — SSR rend TOUS les items (SEO-friendly). Client-side script shuffle Fisher-Yates via CSS `order`, cache tous les items au-delà du 12ème. Bouton "Load more" centré avec flèche ↓ (SVG inline, animate-y-0.5 au hover) qui reveal tout au clic.
- **Comportement** :
  - Page load : 30 items rendus, 12 visibles dans un ordre random (mix 3D + Digital Painting)
  - Click "Load more" : révèle les 18 restants, cache le bouton
  - Refresh : nouveau shuffle random
  - No-JS fallback : tous les items visibles (dégradation gracieuse)
- **Note tech** : `<script is:inline>` pour éviter le bundling Astro. Utilise CSS `order` plutôt que DOM reorder pour garder l'ordre source stable (accessibilité)
- **Rollback vers v007** : voir v007 ci-dessus
