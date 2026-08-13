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

---

## v009 — 2026-08-06 — état AVANT création page /craft

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/CraftSection.astro` (état v008 — random+load more, hrefs vers image directe target=_blank)
- **Rollback** : `cp archives/v009_.../src__components__CraftSection.astro src/components/CraftSection.astro` + `rm src/pages/craft.astro src/components/CraftFilters.astro`

---

## v010 — 2026-08-06 — Page /craft interne + filtres pill sticky

- **Commit git associé** : à remplir après push
- **Type** : point de repère stable
- **Problème résolu** : clic sur thumbnail Craft home ouvrait l'image full en nouvel onglet → user forcé de fermer le tab manuellement, mauvaise UX
- **Fichiers créés** :
  - `src/pages/craft.astro` — page interne dédiée : hero "Personal work" + `<CraftFilters>` sticky + stack full-width toutes les images (chaque `<figure>` a `id={slug}` pour anchor scroll + `data-category` pour filtre)
  - `src/components/CraftFilters.astro` — barre pill sticky `top-[68px]` avec bouton "All" + un pill par catégorie distincte (extraite dynamiquement depuis `craftItems`). Actif = `bg-accent text-accent-ink`. Filtrage client-side toggle `.hidden` sur les figures
- **Fichiers modifiés** :
  - `src/components/CraftSection.astro` (home) — retire `target="_blank"` + `rel`, change href de `item.image` vers `/craft#${item.slug}`. Click thumbnail = navigation interne + scroll auto sur l'image cliquée
- **Extensibilité** : ajouter une nouvelle catégorie dans `craftItems.ts` (Drawings, Icons, etc.) crée automatiquement un nouveau pill filtre
- **Rollback vers v009** : voir v009 ci-dessus

---

## v011 — 2026-08-06 — état AVANT restyle Load More (orange + arrow externe animée)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/CraftSection.astro` (état v010 — bouton pill outlined, flèche interne petite)
- **Rollback** : `cp archives/v011_.../src__components__CraftSection.astro src/components/CraftSection.astro`

---

## v012 — 2026-08-06 — Load More restyle : bouton orange + flèche externe bounce

- **Commit git associé** : à remplir après push
- **Type** : polish visuel Load More
- **Fichier modifié** :
  - `src/components/CraftSection.astro`
- **Design** :
  - Bouton pill `bg-accent` (orange) `text-white`, `px-8 py-3`, ombre légère, hover `bg-accent/90`
  - Flèche externe SVG chevron ↓ `h-7 w-7 text-accent` (orange), sous le pill (gap-4), pas dans le fond du pill
  - Animation `craft-arrow-bounce` : `translateY 0 → 8px → 0` en 1.6s `ease-in-out` infinite, opacity 0.85 → 1 pour effet doux
  - Toute la zone `<button>` reste clickable (pill + flèche déclenchent tous deux le reveal)
  - `@media prefers-reduced-motion` désactive l'animation (accessibilité)
- **Rollback vers v011** : voir v011 ci-dessus

---

## v013 — 2026-08-06 — état AVANT retrait 3d-10 (thumbnail buggée)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/data/craftItems.ts` (contient encore l'entrée `3d-10`)
- **Rollback** : `cp archives/v013_.../src__data__craftItems.ts src/data/craftItems.ts`

---

## v014 — 2026-08-06 — Retrait item Craft 3d-10 (buggé)

- **Commit git associé** : à remplir après push
- **Type** : nettoyage data
- **Fichier modifié** : `src/data/craftItems.ts` — entrée `3d-10` supprimée (image buggée signalée par David)
- **Impact** : liste Craft passe de 30 à 29 items. Aucun autre code à modifier (mapping dynamique).
- **Rollback vers v013** : voir v013 ci-dessus

---

## v015 — 2026-08-06 — état AVANT animation reveal thumbnails Load More

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/CraftSection.astro` (état pushé, sans animation reveal)
- **Rollback** : `cp archives/v015_.../src__components__CraftSection.astro src/components/CraftSection.astro`

---

## v016 — 2026-08-06 — Animation reveal staggered fade-up thumbnails Load More

- **Commit git associé** : à remplir après push
- **Type** : polish visuel Load More
- **Fichier modifié** : `src/components/CraftSection.astro`
- **Changement** :
  - Nouvelle keyframe CSS `craft-reveal` : `opacity 0→1 + translateY 16px→0`, `0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both` (courbe out-quart, sensation fluide et douce)
  - Nouvelle classe `.craft-revealing` appliquée aux items révélés au click Load More
  - Script Load More : itère les items cachés, remove `hidden`, applique `animation-delay: min(index * 60ms, 800ms)` en inline style + add `craft-revealing` → effet cascade staggered
  - `@media prefers-reduced-motion` désactive aussi la reveal animation (accessibilité)
- **Rollback vers v015** : voir v015 ci-dessus

---

## v017 — 2026-08-06 — état AVANT border images desktop light mode

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` (branche desktop sans border/shadow)
- **Rollback** : `cp archives/v017_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v018 — 2026-08-06 — Border + shadow sur images desktop (fix fusion light mode)

- **Commit git associé** : à remplir après push
- **Type** : fix visuel (feedback David)
- **Problème** : sur pages Work (`/work/[slug]`), certains mockups desktop light mode utilisent des gris très clairs (Sonary Website Review hub, Booster light dashboards) qui se fondent dans le body `bg = #F3F4F6` → contours invisibles, image collée au fond
- **Fichier modifié** : `src/pages/work/[slug].astro`
- **Changement** : sur le wrapper `<div class="w-full">` de chaque image desktop, ajout de `border border-ink/10 shadow-sm`. Sans rounded (respecte le commentaire précédent : rounded clip les coins natifs des mockups). Border droit + shadow léger = image détachée du fond, visible même quand son contenu interne est presque blanc
- **Rollback vers v017** : voir v017 ci-dessus

---

## v019 — 2026-08-06 — état AVANT batch polish (rounded/grid/order/back-to-top/Other)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
  - `src/lib/zones.ts`
  - `src/components/ZoneFilters.astro`
  - `src/components/ProjectCard.astro`
  - `src/components/CraftSection.astro`
  - `src/pages/craft.astro`
- **Rollback** : `cp archives/v019_.../* ` vers chaque path correspondant

---

## v020 — 2026-08-06 — Batch polish (feedback David)

- **Commit git associé** : à remplir après push
- **Type** : polish visuel batch
- **5 changements** :
  1. **Border radius plus prononcé** — `rounded-md` / `rounded-lg` → `rounded-2xl` (16px) sur : ProjectCard home, CraftSection thumbnails home, craft.astro figures, mobile cards `[slug].astro`, Other cards `[slug].astro`. Images desktop wrapper restent plates (border+shadow sans radius, préserve les coins natifs des mockups).
  2. **Ordre zones Sonary Dashboard** (`src/lib/zones.ts`) — 4-zone mode passe de Desktop·Light→Desktop·Dark→Mobile·Light→Mobile·Dark à **Desktop·Dark → Desktop·Light → Mobile·Dark → Mobile·Light**. Dark first dans chaque paire.
  3. **Grid mobile 3 cols** (`[slug].astro` branche mobile) — passe `sm:grid-cols-2` à `sm:grid-cols-2 lg:grid-cols-3`. Padding cards réduit `p-6 → p-5` pour compenser la place plus serrée.
  4. **Back-to-top dans sticky ZoneFilters** — nouveau `<button data-back-to-top>` icône chevron ↑ à gauche des filter groups, `rounded-full h-8 w-8` outline hover accent. Handler JS `window.scrollTo({top:0, behavior:'smooth'})`. En plus du BackToTop bottom-right existant.
  5. **Fallback "Other" safe** (`[slug].astro`) — nouvelle branche `zone.label === 'Other'` : grid 2 cols, images `object-contain max-h-[720px]` dans card `bg-card rounded-2xl border shadow-sm`. Résout le problème signalé David : image mobile classifée "Other" étirée en full-width desktop.
- **Rollback vers v019** : voir v019 ci-dessus

---

## v021 — 2026-08-06 — état AVANT fix gap Other + réordonner Sonary Dashboard

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
  - `src/data/allProjects.ts`
- **Rollback** : `cp archives/v021_.../* ` vers chaque path

---

## v022 — 2026-08-06 — Fix gap Other cards + reorder Sonary Dashboard gallery

- **Commit git associé** : à remplir après push
- **Type** : fixes visuels + polish contenu
- **2 changements** :
  1. **Gap image/bordure Other cards** — signalé David : sur `[slug].astro` branche `zone.label === 'Other'`, le wrapper `bg-card border shadow` créait un gap blanc autour des images `object-contain` plus petites que la card. Nouveau rendu : image seule, `rounded-2xl ring-1 ring-ink/10 shadow-sm` directement sur `<img>`, plus de wrapper visuel. Pas de gap, la border épouse l'image.
  2. **Ordre gallery Sonary Dashboard** — 2 URLs déplacées en tête de gallery pour être les premières dans leurs zones :
     - `07---dashboard/desktop/dark-mode/dashboard.webp` → premier dans Desktop·Dark (le hero avec 4 stat cards colorées)
     - `05---user-setting/desktop/light-mode/team-member-board.webp` → premier dans Desktop·Light (vue Team Members reconnaissable)
- **Rollback vers v021** : voir v021 ci-dessus

---

## v023 — 2026-08-06 — état AVANT batch fixes 4

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
  - `src/components/ZoneFilters.astro`
  - `src/components/Footer.astro`
- **Rollback** : `cp archives/v023_.../* ` vers chaque path

---

## v024 — 2026-08-06 — 4 fixes feedback David

- **Commit git associé** : à remplir après push
- **Type** : batch fixes visuels
- **4 changements** :
  1. **Back-to-projects** — le bouton sticky bar (icône chevron) devient un `<a href="/#work">` avec icône chevron LEFT ←. Retour à la homepage section Projects, plus scroll top de la page projet. Handler JS `scrollTo` retiré.
  2. **Séparateur Device/Theme** — ajout `<div class="hidden h-6 w-px bg-ink/15 sm:block">` entre les 2 groupes, uniquement quand les 2 sont présents et sur ≥sm. Gap serré `sm:gap-6` (vs 8 avant).
  3. **Border light-only** — nouveau `isDarkZone = /dark/i.test(zone.label)` calculé par zone. Appliqué :
     - Desktop Dark : wrapper `w-full` nu, plus de border+shadow
     - Desktop Light/other : wrapper `w-full border border-ink/10 shadow-sm` (comme avant)
     - Mobile Dark : image directe rendue sans card (`<img>` seule avec `rounded-xl`)
     - Mobile Light/other : card complète (bg-card + border + shadow + image ring, comme avant)
     - Loop refactor : `zones.map((zone) => (...))` → `zones.map((zone) => { const isDark = ...; return (...); })`
  4. **Footer mobile 2 lignes** — email / phone / location empilés verticalement sur mobile (`flex flex-col gap-y-2`), séparateurs `·` masqués. Sur ≥sm : layout inline single-line comme avant.
- **Rollback vers v023** : voir v023 ci-dessus

---

## v025 — 2026-08-06 — état AVANT squircle corners

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/styles/global.css`
- **Rollback** : `cp archives/v025_.../src__styles__global.css src/styles/global.css`

---

## v026 — 2026-08-06 — Squircle corners (iOS-style) via corner-shape

- **Commit git associé** : à remplir après push
- **Type** : polish visuel — coins arrondis en superellipse
- **Fichier modifié** : `src/styles/global.css`
- **Changement** :
  - Ajout d'un bloc `@supports (corner-shape: superellipse(3))` qui hijack toutes les utility Tailwind rounded (md, lg, xl, 2xl, 3xl, full, pill) et leur applique `corner-shape: superellipse(3)`
  - Résultat : coins style icônes iOS (courbe plus lisse, tangente continue) au lieu du quart de cercle classique
  - Browsers sans support : fallback naturel vers border-radius quart de cercle. Pas de break.
  - Support : Chrome 139+, Safari 26+
- **Rollback vers v025** : voir v025 ci-dessus

---

## v027 — 2026-08-06 — état AVANT scope-fix squircle (exclure pills/full)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/styles/global.css`
- **Rollback** : `cp archives/v027_.../src__styles__global.css src/styles/global.css`

---

## v028 — 2026-08-06 — Squircle : exclure rounded-full / rounded-pill

- **Commit git associé** : à remplir après push
- **Type** : fix scope squircle
- **Raison** : sur les pills (`rounded-pill`) et boutons ronds (`rounded-full`), le `corner-shape: superellipse(3)` aplatit bizarrement les côtés parce que la hauteur est très faible → look moche. Les pills doivent rester parfaitement ronds.
- **Fichier modifié** : `src/styles/global.css` — retiré `.rounded-full` et `.rounded-pill` du bloc `@supports (corner-shape: ...)`. Ne restent hijackées que : `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` (containers avec radius significatif).
- **Rollback vers v027** : voir v027 ci-dessus

---

## v029 — 2026-08-06 — état AVANT thumbnail hover zoom fluide

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/ProjectCard.astro`
  - `src/components/CraftSection.astro`
- **Rollback** : `cp archives/v029_.../* ` vers chaque path

---

## v030 — 2026-08-06 — Thumbnail hover zoom fluide

- **Commit git associé** : à remplir après push
- **Type** : polish visuel — animation hover thumbnails
- **Raison** : le hover-scale sur les thumbnails Work/Craft home était trop rapide (500ms) et le scale trop discret (1.03), donnait un effet "immédiat"
- **Fichiers modifiés** :
  - `src/components/ProjectCard.astro`
  - `src/components/CraftSection.astro`
- **Changement** : sur les `<img>` thumbnails, remplace `transition-transform duration-500 group-hover:scale-[1.03]` par `transition-transform duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.06]`. Courbe out-quart, 900ms, scale 6% (au lieu de 3%). Sensation fluide, filmée.
- **Rollback vers v029** : voir v029 ci-dessus

---

## v031 — 2026-08-06 — état AVANT reformulation Cactus awards

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/Metrics.astro`
  - `src/components/Hero.astro`
  - `src/pages/about.astro`
- **Rollback** : `cp archives/v031_.../* ` vers chaque path

---

## v032 — 2026-08-06 — Reformulation Cactus awards (honesty pass, team-explicit)

- **Commit git associé** : à remplir après push
- **Type** : correction contenu — accuracy + honnêteté
- **Raison** : David signale que "3× Cactus" est doublement faux — nombre inexact (12+ en réalité sur 5 ans) et attribution personnelle abusive (un Cactus se gagne en équipe, pas en solo)
- **Fichiers modifiés** :
  - `src/components/Metrics.astro` — stat passe de `3× Cactus awards` à `12+ · Cactus awards in 5 years` + sous-ligne `Publicis Group · team contributor`. Support ajouté pour un champ optionnel `sub` sur les Metric items.
  - `src/components/Hero.astro` — bandeau trophée : `Awarded 3× Cactus at Publicis Group` → `12+ Cactus awards in 5 years · Publicis Group team contributor`
  - `src/pages/about.astro` — Timeline highlight passé de `Cactus d'Or/Argent/Bronze awards won yearly` à `Team contributor on 12+ Cactus-awarded campaigns (Or, Argent, Bronze)`. Awards section : ajout "Team contributor on 12+ Cactus wins over 5 years".
- **Rollback vers v031** : voir v031 ci-dessus

---

## v033 — 2026-08-06 — état AVANT reformulation AI-native

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/Hero.astro`
  - `src/pages/about.astro`
- **Rollback** : `cp archives/v033_.../* ` vers chaque path

---

## v034 — 2026-08-06 — Reformulation H1 : AI-native (accuracy + positionnement 2026)

- **Commit git associé** : à remplir après push
- **Type** : correction contenu — accuracy + positionnement
- **Raison** : la phrase "20 years of craft, augmented by AI" suggérait faussement une continuité 20 ans + AI (alors que David utilise l'IA depuis ~2023 avec ChatGPT/Midjourney). En 2026, "AI-augmented since 2023" est aussi devenu banal. Terme "AI-native" = vocabulaire 2026 signalant intégration profonde, sans excuse temporelle.
- **Fichiers modifiés** :
  - `src/components/Hero.astro` — H1 : `Designing products with 20 years of craft, augmented by AI.` → `20 years of product design craft, now AI-native.` (AI-native en accent orange)
  - `src/pages/about.astro` — H1 : `20 years of craft, now AI-augmented.` → `20 years of product design craft, now AI-native.` (cohérent avec Hero)
- **Rollback vers v033** : voir v033 ci-dessus

---

## v035 — 2026-08-06 — état AVANT swap "100+ Shipped features" → "3 → 1 Designers"

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/components/Metrics.astro`
- **Rollback** : `cp archives/v035_.../src__components__Metrics.astro src/components/Metrics.astro`

---

## v036 — 2026-08-06 — Metrics: swap placeholder "100+" par "3 → 1 Designers"

- **Commit git associé** : à remplir après push
- **Type** : correction contenu — accuracy + positionnement 2026
- **Raison** : "100+ Shipped features" était un placeholder sans source vérifiable. Remplacé par "3 → 1 Designers consolidated (AI-augmented workflow)" — matérialise concrètement le positionnement AI-native, prouve le H1 au lieu de juste l'affirmer
- **Fichier modifié** : `src/components/Metrics.astro` — 4ème stat passe de `{ value: '100+', label: 'Shipped features' }` à `{ value: '3 → 1', label: 'Designers consolidated', sub: 'AI-augmented workflow' }`
- **Rollback vers v035** : voir v035 ci-dessus

---

## v037 — 2026-08-06 — état AVANT renforcement border/shadow light

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/work/[slug].astro`
- **Rollback** : `cp archives/v037_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v038 — 2026-08-06 — Border/shadow renforcés sur zones Light (mockups blancs)

- **Commit git associé** : à remplir après push
- **Type** : fix visuel — renforcement contraste bordure
- **Raison** : David signale qu'après le batch précédent, le pb persiste sur mockups light (Sonary Software Stack, etc.). Cause : `border-ink/10 shadow-sm` était trop pâle pour se distinguer sur bg gris clair face à du contenu image majoritairement blanc.
- **Fichier modifié** : `src/pages/work/[slug].astro`
- **Changement** :
  - Wrappers desktop light : `border-ink/10 shadow-sm` → `border-ink/15 shadow-md`
  - Cards mobile light : `border-ink/10` → `border-ink/15` (shadow-md déjà là)
  - Mobile image ring : `ring-ink/10` → `ring-ink/15`
  - Other card image : `ring-ink/10 shadow-sm` → `ring-ink/15 shadow-md`
- **Rollback vers v037** : voir v037 ci-dessus

---

## v039 — 2026-08-06 — état AVANT fix CraftFilters (broken script + no hover)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/components/CraftFilters.astro`
- **Rollback** : `cp archives/v039_.../src__components__CraftFilters.astro src/components/CraftFilters.astro`

---

## v040 — 2026-08-06 — Fix CraftFilters : click handler + hover visible

- **Commit git associé** : à remplir après push
- **Type** : bug fix
- **Bug 1 signalé** : cliquer sur un pill filter (`3D`, `Digital Painting`) ne faisait rien
- **Cause racine** : `<script is:inline>` était placé DANS CraftFilters.astro qui se rend en tête du HTML, AVANT les `<figure class="craft-figure">` de craft.astro qui viennent plus bas. Au moment de l'exécution du script inline, `document.querySelectorAll('.craft-figure')` renvoyait 0 → early return → click handlers jamais wire.
- **Bug 2 signalé** : pas de hover effect visible sur les pills
- **Cause racine** : `hover:border-ink/30` sur `border-ink/10` = différentiel trop subtil, presque invisible
- **Fix** : `src/components/CraftFilters.astro`
  - Retire `is:inline` du script → Astro le compile en module ES6 automatiquement deferred → exécute après DOM prêt
  - Ajoute types TS (`HTMLButtonElement`, `HTMLElement`) pour cohérence
  - `cursor-pointer` explicite sur les boutons
  - Hover renforcé : `hover:border-accent hover:text-accent` (au lieu de `hover:border-ink/30`) → hover clair et visible
  - Border par défaut passe `border-ink/10` → `border-ink/15` pour meilleure visibilité
- **Rollback vers v039** : voir v039 ci-dessus

---

## v041 — 2026-08-06 — état AVANT retrait Ashkelon

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/contact.astro`
- **Rollback** : `cp archives/v041_.../src__pages__contact.astro src/pages/contact.astro`

---

## v042 — 2026-08-06 — Retrait Ashkelon + signal remote/Tel Aviv

- **Commit git associé** : à remplir après push
- **Type** : correction contenu — strategic positioning
- **Raison** : David signale que "Ashkelon" (sud d'Israël, loin de Tel Aviv) peut freiner des recruteurs qui cherchent des candidats disponibles sur Tel Aviv. Il a une proposition de télétravail — préciser l'ouverture au remote / Tel Aviv area résout le pb.
- **Fichier modifié** : `src/pages/contact.astro` — `const city = 'Ashkelon, Israel'` → `const city = 'Israel · Remote or Tel Aviv area'`
- **Note** : Footer déjà OK (juste "Israel" sans ville, par décision antérieure)
- **Rollback vers v041** : voir v041 ci-dessus

---

## v043 — 2026-08-06 — état AVANT 4 fixes (hover, radius revert, scroll anchor, retrait Remote/Tel Aviv)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/styles/global.css`
  - `src/components/ProjectCard.astro`
  - `src/components/CraftSection.astro`
  - `src/pages/craft.astro`
  - `src/pages/contact.astro`
  - `src/pages/work/[slug].astro`
- **Rollback** : `cp archives/v043_.../* ` vers chaque path

---

## v044 — 2026-08-06 — 4 fixes feedback David

- **Commit git associé** : à remplir après push
- **Type** : batch fixes visuels + revert
- **4 changements** :
  1. **Hover thumbnails ne fonctionnait pas** — l'arbitrary Tailwind value `ease-[cubic-bezier(0.22,0.61,0.36,1)]` avec virgules + espaces ne se compilait pas correctement, killait la transition. Nouveau : classe CSS custom `.thumb-hover-zoom` dans `global.css` avec transition 900ms cubic-bezier + `.group:hover .thumb-hover-zoom { transform: scale(1.06) }`. Appliqué sur ProjectCard + CraftSection img.
  2. **Radius revert** — David voulait squircle (forme) mais PAS augmenter la taille du radius. Revert : ProjectCard `rounded-2xl` → `rounded-md`, CraftSection thumb `rounded-2xl` → `rounded-md`, /craft figure img `rounded-2xl` → `rounded-md`, mobile card wrappers + Other card `rounded-2xl` → `rounded-lg` dans `[slug].astro`. Le squircle CSS reste actif (superellipse s'applique à toutes les rounded-* de md à 3xl).
  3. **Scroll anchor /craft coupé** — click thumbnail home arrivait au milieu de l'image (masquée par nav 68px + filter bar ~60px). `scroll-mt-32` (128px) insuffisant. Bumper à `scroll-mt-48` (192px) sur `.craft-figure`.
  4. **Retrait "Remote or Tel Aviv area"** — David change d'avis. `contact.astro` : `Israel · Remote or Tel Aviv area` → `Israel` tout court.
- **Rollback vers v043** : voir v043 ci-dessus

---

## v045 — 2026-08-07 — état AVANT filtres pill home (Selected Work + Craft)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/components/SelectedWork.astro`
  - `src/components/CraftSection.astro`
- **Rollback** : `cp archives/v045_.../src__components__SelectedWork.astro src/components/SelectedWork.astro` (idem CraftSection)

---

## v046 — 2026-08-07 — Filtres pill home Selected Work + Craft

- **Commit git associé** : à remplir après push
- **Type** : nouvelle fonctionnalité — filtres client-side
- **Contexte** : dernière phase visuelle de la refonte avant Phase 5 (AI showcase). Même pattern que `CraftFilters.astro` de la page `/craft`, mais rendu **inline** dans les sections home (pas sticky) + coordination fine avec Load More sur Craft home.
- **Nouveau composant** : `src/components/HomeFilters.astro`
  - Props : `id`, `categories: string[]`, `target: string` (CSS selector des items à filtrer, doivent avoir `[data-category]`)
  - Rendu : pill row `All` + un pill par catégorie. Actif = `bg-accent text-accent-ink`. Hover : `border-accent text-accent` (aligné CraftFilters v040+).
  - Script module (auto-deferred) : wire tous les `.home-filters` du DOM, toggle classe `.home-filter-hidden` sur les items non-matchants. Dispatch `CustomEvent('home-filter:change', { detail: { filter } })` sur son container à chaque changement.
  - Classe hide séparée (`.home-filter-hidden`, `!important`, `display: none`) — pas la Tailwind `.hidden`, pour éviter les collisions avec le Load More de Craft qui utilise déjà `.hidden`.
- **SelectedWork.astro** : ajout `<HomeFilters id="work-filters" categories={workCategories} target="#work-grid > [data-category]" />` sous le titre. Wrap le grid dans `id="work-grid"`. Catégories dérivées dynamiquement de `allProjects` (Set → Array, ordre = première occurrence).
- **CraftSection.astro** :
  - Ajout `<HomeFilters id="craft-home-filters" categories={craftCategories} target="#craft-grid > [data-category]" />` sous le paragraphe.
  - Script inline étendu : écoute `home-filter:change` sur le filter bar.
    - Filter ≠ `__all__` : retire `.hidden` de tous les items ayant flag `data-craft-hidden` (les items past-Load-More cap deviennent visibles) → toute la catégorie s'affiche. Cache le bouton Load More.
    - Filter = `__all__` : re-applique `.hidden` sur les items flag (retour aux 12 shuffled) SAUF si user a déjà cliqué Load More (`allRevealed` sticky). Réaffiche Load More si `overCap && !allRevealed`.
- **Interaction validée mentalement** :
  - Init : 12 shuffled + 17 hidden + Load More visible
  - Click "3D" : 24 items 3D visibles (dont ceux hidden par cap), 5 Digital Painting cachés, Load More caché
  - Click "All" (sans Load More cliqué) : retour 12 shuffled + Load More visible
  - Click Load More avant filtre : tout visible, `allRevealed=true` → filtres n'affectent plus Load More visibility
- **Vérif build sandbox** : impossible (native binding rolldown installé Windows-side, sandbox Linux). Astro syntax + logique JS relues manuellement. David lance `npm run build` en local avant push.
- **Rollback vers v045** : voir v045 ci-dessus


---

## v047 — 2026-08-07 — état AVANT multi-tags + fix Load More

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
  - `src/components/ProjectCard.astro`
  - `src/components/HomeFilters.astro`
  - `src/components/CraftSection.astro`
- **Rollback** : `cp archives/v047_.../* ` vers chaque path

---

## v048 — 2026-08-07 — Multi-tags par projet + fix Load More All

- **Commit git associé** : à remplir après push
- **Type** : fix bugs feedback David sur v046
- **Bug 1** : cliquer pill "UI/UX" ne montrait que `ui-ux-vintage` alors que David voulait aussi voir les SaaS (SaaS = UI/UX au sens large).
- **Bug 2** : cliquer "All" sur Craft ne réaffichait pas le bouton Load More après un filtre catégorie.
- **Fix Bug 1 — Multi-tags par projet** :
  - `FullProject` : ajout champ optionnel `categories?: string[]` (multi-tag pour filtrage). Le champ `category` (single) reste pour affichage page projet.
  - Les 5 SaaS projects (sonary-dashboard/website/mailer, playright, top5) ont `categories: ['SaaS', 'UI/UX']`.
  - `ProjectCard` : émet `data-categories={(categories ?? [category]).join(' ')}`.
  - `SelectedWork` : extraction pills via `flatMap(p => p.categories ?? [p.category])` + Set. Ordre first-occurrence : SaaS · UI/UX · Branding · Gaming.
  - `HomeFilters` script : lit `data-categories`, split whitespace, `includes(filter)`.
  - `CraftSection` : renommé `data-category` → `data-categories` par cohérence (une seule cat par craft item pour l'instant, mais API uniforme).
  - Selector target dans les 2 sections passe de `[data-category]` → `[data-categories]`.
- **Fix Bug 2 — Load More Craft** :
  - Retrait de `allRevealed` (sticky). Nouveau : `expanded` state boolean qui se reset à false quand user revient à "All".
  - Nouvelle logique : **All = toujours reset** (re-cache past-cap items + réaffiche Load More), même si user avait cliqué Load More auparavant. Prévisible.
  - Helper `pastCapItems()` + `setExpanded(val)` + `updateLoadMoreVisibility()` séparent responsabilités.
  - `currentFilter` state variable pour ne pas ré-passer le filter en param à chaque check.
- **Note trade-off** : perte du comportement "sticky Load More" (si user cliquait Load More puis filtrait puis All, tout restait visible). Nouveau comportement : All = retour aux 12 shuffled + bouton. Plus intuitif ("All" = état initial).
- **Rollback vers v047** : voir v047 ci-dessus


---

## v049 — 2026-08-07 — état AVANT fix separator + recat Ryze

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/data/allProjects.ts`, `src/components/ProjectCard.astro`, `src/components/HomeFilters.astro`, `src/components/CraftSection.astro`
- **Rollback** : `cp archives/v049_.../* ` vers chaque path

---

## v050 — 2026-08-07 — Fix separator pipe + recat Ryze Hub/Brand en UI/UX

- **Commit git associé** : à remplir après push
- **Type** : bug fix + recat contenu
- **Bug** : clic pill "Digital Painting" sur Craft home ne montrait rien.
- **Cause racine** : `HomeFilters` script splittait `data-categories` sur `\s+` (whitespace), donc "Digital Painting" devenait `["Digital", "Painting"]`. `cats.includes("Digital Painting")` → false. Même problème latent pour "UI/UX" (pas d'espace mais confirme choix séparateur unique).
- **Fix separator** :
  - `ProjectCard.astro` : `join(' ')` → `join('|')` pour émettre `data-categories="SaaS|UI/UX"`.
  - `HomeFilters.astro` script : `raw.split(/\s+/)` → `raw.split('|').map(s => s.trim())`. Le trim() gère les espaces autour du pipe si un jour ajouté.
  - `CraftSection` inchangé pour l'émission (un seul cat par item, pipe absent = split retourne `["Digital Painting"]`, includes match).
- **Recat Ryze** :
  - `ryze-hub` : category `'Branding'` → `'UI/UX'`
  - `ryze-brand` : category `'Branding'` → `'UI/UX'`
  - David signale que ces 2 projets ne sont pas du branding pur, plus proche d'UI/UX (hub company + brand elements = surface produit).
  - Conséquence : pill "Branding" ne matche plus que `branding-old`. Le pill reste utile (13 mockups Publicis awarded).
- **Rollback vers v049** : voir v049 ci-dessus


---

## v051 — 2026-08-07 — état AVANT Phase 5 (AI Collaboration Showcase)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/pages/about.astro`
  - `src/components/Footer.astro`
- **Rollback** : `cp archives/v051_.../* ` vers chaque path

---

## v052 — 2026-08-07 — Phase 5 AI Collaboration Showcase

- **Commit git associé** : à remplir après push
- **Type** : nouvelle fonctionnalité — page + section + footer mention
- **3 changements coordonnés** :
  1. **`/about` section AI** : nouveau bloc `bg-card` entre le hero et Experience. Ligne "How this site was built" en small caps orange + paragraphe 3 phrases grand public + lien "Read the full colophon →" vers `/colophon`.
  2. **Footer micro-mention** : nouvelle ligne discrète sous le copyright — "Designed and built with Astro, Tailwind CSS, and Claude · Colophon" (Colophon = lien).
  3. **Nouvelle page `/colophon`** (moyenne, 4 sections + hero + closing) :
     - Hero : "How this site was built." + intro 2 phrases
     - Section "The stack" : grid 2-col de 6 cards (Framework, Styling, Images, Hosting, Source, Editor) avec label + valeur + pourquoi
     - Section "Who did what" : 2 colonnes côte à côte (Claude did / I did), 5 items chacun. Ligne éditoriale : division of labor, pas magie.
     - Section "Build stats" : 4 chiffres (2 semaines, 46+ archives, 7 sessions Claude, 0→1 designer & dev)
     - Section "A note on honesty" : disclaimer — les projets sont conçus main en Figma sur 20 ans, ce qui change en 2025-2026 c'est *comment* je ship la surface autour (portfolio, filters, case studies), pas le design lui-même
- **Ton** : hybride validé par David. About = grand public court, Colophon = moyen technique-friendly mais accessible.
- **Rollback vers v051** : voir v051 ci-dessus


---

## v053 — 2026-08-07 — état AVANT passe audit textes

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
  - `src/components/Hero.astro`
  - `src/components/Metrics.astro`
  - `src/components/AboutPreview.astro`
  - `src/pages/about.astro`
  - `src/pages/colophon.astro`
- **Rollback** : `cp archives/v053_.../* ` vers chaque path

---

## v054 — 2026-08-07 — Passe audit textes complète (EN + honnêteté + impact recruteur)

- **Commit git associé** : à remplir après push
- **Type** : polish éditorial batch — traductions + reformulations + corrections factuelles
- **Contexte** : David demande une passe complète où recruteur qui lit dit "wow, c'est le mec qu'il me faut", sans exagérer ni mentir.
- **11 shortDesc traduits FR → EN + orientés bénéfice** (allProjects.ts) :
  - sonary-dashboard : "Sole-designed a SaaS to track software subscriptions — full dark/light design system, 96+ shipped frames, AI-powered flows."
  - sonary-website : "Marketing site with review hub, comparison pages and content architecture — designed for SEO scale from day one."
  - sonary-mailer : "Full email system — 4 mailer templates × responsive, dark-mode aware, on-brand across the funnel."
  - playright : "Homepage and product list for Playright — focused on conversion and product clarity."
  - top5 : "Editorial comparison system — article, comparison and lineup pages built for premium content at scale."
  - ryze-hub : "Company hub and portfolio landing — a single surface tying Ryze Beyond's product line together."
  - ryze-brand : "Visual identity system for Ryze Beyond — logo, palette, motion and web-facing brand elements."
  - casino-work : "20+ casino UI screens (2011–2017) — game lobbies, bonus systems, deposit funnels, mobile-first."
  - sport-betting : "Live sport-betting interfaces for 10Bet and Real Deal Bet — real-time odds tables, HTML5 animations."
  - branding-old : "13 brand identities from the Arc Interactive / Publicis years (2006–2011) — same period as the Cactus wins."
  - ui-ux-vintage : "20 selected UI/UX screens from earlier years — fintech, mobile apps, dashboards (Smart.bid, Wochat and others)."
- **Hero** : subline `UI/UX · AI-UX · Web · Mobile · Graphic · 3D` (liste sèche) → `Product interfaces across web, mobile and 3D — designed with an AI-native workflow.`
- **Metrics** :
  - `20+ Years experience` → `20+ Years designing products`
  - `6 Industries` (sec) → `6 Industries shipped in` + sub `SaaS · gaming · fintech · ads · mobile · 3D`
  - `3 → 1 Designers consolidated · AI-augmented workflow` → `3 → 1 Team consolidated · Sole designer through multi-year stretches` (matches new "2 stretches" narrative)
- **AboutPreview** : ambigu "Scaled Ryze Beyond design from 32 to 110 employees" → "Sole designer at Ryze Beyond through two multi-year stretches while the company grew from 32 to 110 people — held together by an AI-augmented workflow." (reflète le vécu exact : David seul designer 2× pendant 2 ans, entre-temps équipe de 2-3 embauchée puis dispersée)
- **/about page** :
  - Intro : "Currently pioneering AI-augmented..." (marketing) → "Sole designer at Ryze Beyond through two multi-year stretches — the AI-augmented workflow lets a single senior handle what used to take a full team."
  - Section AI : "in a few evenings" (minimise + imprécis) → "in about two weeks of evening sessions" (factuel + montre vitesse)
- **/colophon Build stats** :
  - `~2 weeks / From empty repo to live site` : ajout sub `Real elapsed time — capped by daily Claude session + token limits`
  - `46+ / Local archive snapshots for rollback` → `46+ / Iteration checkpoints tracked locally` (formulation positive)
  - `7 / Working sessions with Claude` (ambigu) → `17 / Pages designed + coded` (scope tangible)
  - `0 → 1 / Designer & developer` (cryptique) → `Solo / Designer + AI-assisted dev` (validé David)
  - Support `sub?: string` ajouté au type BuildStat
- **/colophon Honesty note** (correction factuelle importante) :
  - Ancienne version prétendait "designed by hand in Figma over the past 20 years" — **faux** (Figma sorti 2016).
  - Nouvelle version : "Figma today, Adobe XD before that, Photoshop and Illustrator in the earlier years — plus Cinema 4D, ZBrush, After Effects and Spline for motion and 3D."
  - Deuxième paragraphe séparé pour meilleure lecture.
- **À faire ensuite (validé David)** : image dans /colophon entre "Who did what" et "Build stats" (option B). David doit fournir un screenshot d'une conversation Cowork ou VS Code montrant le workflow. Je l'intègre au batch suivant.
- **Rollback vers v053** : voir v053 ci-dessus


---

## v055 — 2026-08-07 — état AVANT update skills (about + AboutPreview)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/about.astro`, `src/components/AboutPreview.astro`
- **Rollback** : `cp archives/v055_.../* ` vers chaque path

---

## v056 — 2026-08-07 — Update skills (Adobe AI, Cowork, Animate, JS/Python learning)

- **Commit git associé** : à remplir après push
- **Type** : update contenu skills
- **/about Skills** :
  - **AI tools** : ajout `Claude (Code, Artifacts, Skills, Cowork)` (Cowork nouveau), `Claude ↔ VS Code integration` (nouveau), `Adobe AI (Illustrator, Photoshop, After Effects)` (nouveau). Réordonné pour cohérence.
  - **Visual & motion** : ajout `Adobe Animate (formerly Flash)`
  - **Code** : retrait `Swift (learning)`, ajout `JavaScript (learning)` + `Python (learning)`
- **AboutPreview** (home) : ajout `Adobe AI` dans la ligne AI workflow
- **Rollback vers v055** : voir v055 ci-dessus


---

## v057 — 2026-08-07 — état AVANT skills v2 (Cursor learning, CapCut, Firefly, video AI)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/about.astro`, `src/components/AboutPreview.astro`
- **Note** : AboutPreview reconstruit manuellement pour refléter état v056 (avec Adobe AI, sans Firefly)
- **Rollback** : `cp archives/v057_.../* ` vers chaque path

---

## v058 — 2026-08-07 — Skills v2 : Cursor learning, CapCut, Firefly, Runway/Sora/Kling

- **Commit git associé** : à remplir après push
- **Type** : update skills follow-up feedback David
- **/about Skills** :
  - **AI tools** : ajout `Cursor (learning)`, `Adobe Firefly`, `Runway · Sora · Kling (video gen)` (David a mentionné les avoir déjà utilisés, puis switché sur Midjourney + Firefly)
  - **Visual & motion** : ajout `CapCut`
- **AboutPreview** : ajout `Firefly` dans la ligne AI workflow
- **Rollback vers v057** : voir v057 ci-dessus


---

## v059 — 2026-08-07 — état AVANT swap Cursor → v0.dev + Framer AI

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/about.astro`
- **Rollback** : `cp archives/v059_.../* ` vers chaque path

---

## v060 — 2026-08-07 — Swap Cursor → v0.dev + Framer AI (better fit for designer profile)

- **Commit git associé** : à remplir après push
- **Type** : correction skills après discussion CV
- **Contexte** : ma reco initiale "Cursor (learning)" était biaisée profil dev. Pour un profil designer AI-native, v0.dev (text-to-UI React components) et Framer AI (site gen visuel) sont plus pertinents. Cursor = paradigme "designer qui code chaque diff", moins aligné avec le workflow délégation Cowork de David.
- **/about Skills AI tools** :
  - Retrait : `Cursor (learning)`
  - Ajout : `v0.dev by Vercel (learning)`, `Framer AI (explored)` (David avait commencé Framer au tout début du projet, abandonné pour Astro + Cowork)
- **Rollback vers v059** : voir v059 ci-dessus


---

## v061 — 2026-08-07 — état AVANT réécriture fullDesc Sonary Dashboard (pilote case studies)

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/data/allProjects.ts`, `src/pages/work/[slug].astro`
- **Rollback** : `cp archives/v061_.../* ` vers chaque path

---

## v062 — 2026-08-07 — Sonary Dashboard fullDesc (pilote) + template sections + liveUrl

- **Commit git associé** : à remplir après push
- **Type** : nouvelle fonctionnalité + contenu case study #1/11
- **Contexte** : premier case study réécrit sur les 11 projets. Sonary Dashboard sert de pilote pour valider le format avec David.
- **Type FullProject** :
  - Ajout interface `Section { heading, body }`
  - Ajout champ optionnel `sections?: Section[]` (préféré à `fullDesc` quand présent)
  - Ajout champ optionnel `liveUrl?: string` (CTA "Visit live site" après le corps du case study)
  - `fullDesc` gardé comme fallback pour les 10 projets pas encore réécrits
- **Sonary Dashboard** :
  - `fullDesc` : court résumé fallback (utilisé pour SEO/meta)
  - `sections` : 6 sections structurées (Context, Role, Approach, Key challenge, Deliverables, What I took from it) — approx 400-450 mots au total
  - `liveUrl` : `https://sonary.com`
- **Template `/work/[slug].astro`** :
  - Si `sections` présent : render chaque section en `<h2>` + paragraphes (split sur blank lines)
  - Si `liveUrl` présent : CTA pill orange "Visit live site →" après les sections
  - Sinon fallback comportement legacy `<p whitespace-pre-line>{fullDesc}</p>`
- **Ton du case study** : factuel, orienté résultat, sans blâmer stakeholders sur le "key challenge" (David a insisté). Focus ownership + livraison.
- **Reste 10 case studies à écrire** : sonary-website, sonary-mailer, playright, top5, ryze-hub, ryze-brand, casino-work, sport-betting, branding-old, ui-ux-vintage. Chacun validé par David avant push.
- **Rollback vers v061** : voir v061 ci-dessus


---

## v063 — 2026-08-07 — état AVANT accordéon case study

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/work/[slug].astro`
- **Rollback** : `cp archives/v063_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v064 — 2026-08-07 — Case study en accordéon (Read more/less)

- **Commit git associé** : à remplir après push
- **Type** : UX improvement — feedback David sur pilote Sonary Dashboard
- **Problème** : le case study Sonary Dashboard v062 poussait les mockups images très bas dans la page. Recruteur ne voyait pas les designs above the fold.
- **Solution** : case study détaillé (sections + liveUrl) rendu dans un `<div id="case-study-body" class="hidden">` par défaut. Bouton toggle "Read the full case study" juste après le shortDesc. Click → expand + label devient "Show less" + chevron rotate 180°. Script inline auto-scope IIFE, écoute click, toggle `.hidden` + `aria-expanded` + `aria-hidden` + label + rotation chevron.
- **A11y** : `aria-controls`, `aria-expanded`, `aria-hidden` correctement wire.
- **Fallback** : projets sans `sections` gardent le rendu legacy `<p whitespace-pre-line>{fullDesc}</p>` (pas d'accordéon). Le fallback sera actif pour les 10 projets pas encore réécrits jusqu'à ce qu'ils passent en `sections`.
- **Impact visuel** : title + tags + shortDesc + bouton Read more, puis ZoneFilters + galleries — images maintenant above the fold sur desktop 1080p.
- **Rollback vers v063** : voir v063 ci-dessus


---

## v065 — 2026-08-07 — état AVANT retrait séparateur zones + reduce spacing

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/work/[slug].astro`
- **Rollback** : `cp archives/v065_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v066 — 2026-08-07 — Retrait border-t entre zones + spacing cohérent pills→title

- **Commit git associé** : à remplir après push
- **Type** : polish visuel — feedback David sur page projet Sonary
- **Problème** : entre ZoneFilters (sticky pill bar) et le titre de zone (ex "Desktop · Dark"), il y avait une ligne de séparation `border-t border-ink/10` + un énorme espace (`mt-24 pt-24` = 96px + 96px = 192px total). Trop d'air, ligne visuelle superflue.
- **Fix** : dans `[slug].astro` sur chaque `<section data-zone-label>` :
  - Retrait `border-t border-ink/10` (plus de ligne)
  - Réduit `mt-24 pt-24` → `mt-12` (192px → 48px total). Espacement cohérent pills↔titre partout.
- **Rollback vers v065** : voir v065 ci-dessus


---

## v067 — 2026-08-07 — état AVANT anim smooth + spacing accordéon

- **Type** : snapshot pré-modif
- **Fichiers snapshotés** : `src/pages/work/[slug].astro`
- **Rollback** : `cp archives/v067_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v068 — 2026-08-07 — Accordéon case study : animation smooth + spacing cohérent

- **Commit git associé** : à remplir après push
- **Type** : polish UX case study Sonary Dashboard
- **3 fixes** :
  1. **Animation** : remplacé `.hidden` (display:none, instant) par une classe `.case-study-body` avec transition `max-height 500ms cubic-bezier(0.22,0.61,0.36,1)` + `opacity 350ms`. Script inline mesure `scrollHeight` du body, l'applique en px pour l'open, release à `none` après transitionend (évite clip si images tardives). Close : pin scrollHeight, force reflow, drop à 0px pour animation.
  2. **`prefers-reduced-motion`** : transition désactivée automatiquement.
  3. **Spacing** :
     - `mt-8` sur le bouton toggle → 32px entre body (CTA "Visit live site" en bas) et bouton "Show less"
     - `pb-4` sur le wrapper article max-w-3xl → petit padding bas de la section case study
     - Wrapper `<div class="mt-8">` autour de `<ZoneFilters>` → 32px entre bouton "Show less" et les pill filters
- **Rollback vers v067** : voir v067 ci-dessus


## v069 — 2026-08-11 — before sticky back-arrow reveal on filter bars

- **Commit git associé** : (à créer après)
- **Type** : snapshot AVANT modif
- **Fichiers snapshotés** :
  - `src/components/ZoneFilters.astro`
  - `src/components/CraftFilters.astro`
  - `src/components/HomeFilters.astro` (unchanged pour l'instant — pas sticky)
- **Changement à venir** :
  - ZoneFilters : back-arrow existant `<a href="/#work">` déplacé en `position: absolute`, hidden par défaut (opacity 0 + translateX -6px + pointer-events none). Fade-in + slide-in via classe `.is-stuck` toggled par IntersectionObserver quand la bar pin au top-[68px]. Contenu principal shift à droite via `padding-left: 48px` sur la même transition (400ms cubic-bezier(0.22,0.61,0.36,1)).
  - CraftFilters : ajout du même pattern back-arrow (nouveau `<a href="/#craft">`) + IntersectionObserver + CSS reveal.
  - HomeFilters : pas modifié. Rendu inline (pas sticky) → pas de moment "devient sticky" à détecter. À revoir si on veut le rendre sticky aussi.
- **Rollback** :
  1. `cp archives/v069_.../src__components__ZoneFilters.astro src/components/ZoneFilters.astro`
  2. `cp archives/v069_.../src__components__CraftFilters.astro src/components/CraftFilters.astro`

## v070 — 2026-08-11 — before Sonary Website homepage-first reorder

- **Commit git associé** : (à créer après)
- **Type** : snapshot AVANT modif
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
- **Changement** :
  - Sonary Website : `home-page-desktop.webp` promu **thumbnail** (à la place de `alternative---desktop.webp`) → aussi image affichée sur home ProjectCard.
  - Gallery réordonnée : `home-page-desktop.webp` + `home-page-mobile.webp` déplacées en 1ère et 2ème position. Le reste (alternative → articles → legal → lineup → review → write) suit dans l'ordre existant.
- **Rollback** :
  - `cp archives/v070_.../src__data__allProjects.ts src/data/allProjects.ts`

## v071 — 2026-08-11 — fix sticky ZoneFilters parent wrapper (root cause du bug v069)

- **Commit git associé** : (à créer après)
- **Type** : bug fix
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` (état AVANT fix)
- **Root cause** :
  - Le wrapper `<div class="mt-8"><ZoneFilters/></div>` (introduit en v068 pour espacer du bouton "Read the full case study") avait une hauteur = hauteur du bar (58px). Sticky ne peut pas dépasser la bounding box de son parent → dès qu'on scroll > 58px sous la position naturelle, le bar disparaît. Résultat : sticky "cassé", back-arrow jamais vu.
  - Post-mortem : après le push v069 (ajout back-arrow reveal), le user a vu que rien ne s'affichait et pensait que le sticky lui-même avait cassé. En vrai la logique v069 était correcte, c'est le wrapper v068 qui limitait la portée du sticky.
- **Fix** :
  - Le wrapper `<div class="mt-8">` englobe maintenant `<ZoneFilters/>` **ET** le `{zones.map(...)}`. Parent hauteur = toutes les sections zones → sticky pin correctement tout le long du scroll.
  - Vérifié en live via IntersectionObserver + backOpacity = 1 après scroll : la classe `.is-stuck` se toggle bien maintenant.
- **CraftFilters** : pas de wrapper limité (rendu directement au top-level de Layout dans `src/pages/craft.astro`), sticky déjà OK — pas de fix nécessaire.
- **Rollback** :
  - `cp archives/v071_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

## v072 — 2026-08-11 — fix animation (Tailwind arbitrary values dropped by JIT)

- **Commit git associé** : (à créer après)
- **Type** : bug fix (anim)
- **Fichiers snapshotés** :
  - `src/components/ZoneFilters.astro` (état APRÈS v069, avant fix anim)
  - `src/components/CraftFilters.astro` (idem)
- **Root cause** :
  - Les classes `transition-all duration-[400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]` posées sur les éléments back-arrow + content ne compilaient PAS. Vérifié via `getComputedStyle` en live : `transition-property` = "background-color, border-color, color" seulement. Les virgules dans `cubic-bezier(0.22,0.61,0.36,1)` cassent le scanner JIT Tailwind 4 → la classe est ignorée silencieusement.
  - Résultat visible : opacity + transform + padding-left changeaient instantanément (pas d'anim), donnant l'impression que back-arrow "apparaissait" sans fade et content sans slide.
- **Fix** :
  - Retrait des classes Tailwind arbitraires cassées.
  - Transitions déplacées dans le `<style is:global>` en CSS natif :
    - `.zone-filters-back` / `.craft-filters-back` : `transition: opacity 400ms cubic-bezier(...), transform 400ms cubic-bezier(...), border-color 200ms ease, color 200ms ease;` + `will-change: opacity, transform`
    - `.zone-filters-content` / `.craft-filters-content` : `transition: padding-left 400ms cubic-bezier(...);` + `will-change: padding-left`
- **Rollback** :
  - `cp archives/v072_.../src__components__ZoneFilters.astro src/components/ZoneFilters.astro`
  - `cp archives/v072_.../src__components__CraftFilters.astro src/components/CraftFilters.astro`

## v073 — 2026-08-11 — cursor pointer global + 3D craft reorder (car-first)

- **Commit git associé** : (à créer après)
- **Type** : polish (UX affordance + curation ordre)
- **Fichiers snapshotés** :
  - `src/styles/global.css`
  - `src/data/craftItems.ts`
- **Changements** :
  - **Cursor pointer global** : Tailwind Preflight reset `<button> { cursor: default }`. Ajout d'une règle globale dans `global.css` : `button:not(:disabled), [role='button']:not([aria-disabled='true']), summary, label[for], input[type='submit|reset|button|checkbox|radio']:not(:disabled), select:not(:disabled) { cursor: pointer; }`. Un seul endroit, couvre tous les composants (nav toggle, filter pills, accordion toggle, load more, BackToTop, X + arrows de la Lightbox, etc.).
  - **Réordonnancement 3D** dans `craftItems.ts` : voiture rouge en 1er (3d-03), puis 3 voitures noires Batmobile-style (3d-09, 3d-18, 3d-20), puis 2 RC buggies noirs (3d-05, 3d-13), puis 7 autres véhicules (podracers/hovercraft/missiles : 3d-01, 3d-14, 3d-17, 3d-21, 3d-24, 3d-23, 3d-25), puis 11 autres modèles (créatures/sculpts/épée/yeux : 3d-02, 3d-04, 3d-06, 3d-07, 3d-08, 3d-11, 3d-12, 3d-15, 3d-16, 3d-19, 3d-22). Digital Painting inchangé (paint-01→paint-05). Réordonnancement via script Python (regex parse-then-rebuild) plutôt qu'edit texte massif pour éviter les typos.
- **Impact** :
  - `/craft` filtrée "3D" : voiture rouge affichée en 1er.
  - Home CraftSection : ordre source utilisé pour SSR mais shuffle Fisher-Yates côté client au load (session 6) — l'ordre source ne détermine pas ce qui est visible dans les 12 premiers items home.
- **Rollback** :
  - `cp archives/v073_.../src__styles__global.css src/styles/global.css`
  - `cp archives/v073_.../src__data__craftItems.ts src/data/craftItems.ts`

## v074 — 2026-08-11 — fix /craft image upscale (naturalWidth cap)

- **Commit git associé** : (à créer après)
- **Type** : bug fix qualité visuelle
- **Fichiers snapshotés** :
  - `src/pages/craft.astro`
- **Root cause** :
  - Les sources 3D old-Wix vont de ~600px à ~1400px de large. La page /craft affiche chaque figure en `w-full` dans un container `max-w-[1200px]`. Sur écran ≥1280px, le browser étire les images de 600-1000px à 1200px → CSS upscale = flou/pixelisation visible (spécialement les créatures sculpts 3d-06/07/11/22).
  - Preset Cloudinary `c_limit` empêchait déjà l'upscale côté serveur (source width max) mais pas côté CSS.
- **Fix** :
  - Ajout classe `.craft-img` + `mx-auto` sur chaque `<img>`.
  - Script au bas de la page : détecte `naturalWidth` de chaque image (après `load`) et applique `img.style.maxWidth = naturalWidth + 'px'`. Résultat : displayed max = actual pixels max → jamais d'upscale. Les petites images (622px, 735px...) restent centrées à leur taille native, les grandes prennent la largeur du container.
  - Fonctionne pour toutes les catégories (3D + Digital Painting + futures). Aucune data-driven config à maintenir.
- **Trade-off retina** : sur DPR=2, images natif < 1200px restent "1x" (Cloudinary c_limit ne peut pas servir plus que source). Le flou léger retina persiste sur les vraiment petites images, mais l'upscale grossier est éliminé. Amélioration nette du rendu.
- **Rollback** :
  - `cp archives/v074_.../src__pages__craft.astro src/pages/craft.astro`

## v075 — 2026-08-11 — 3D reorder : cars first, rest by pixel size desc

- **Commit git associé** : (à créer après)
- **Type** : reorder curatoriel
- **Fichiers snapshotés** :
  - `src/data/craftItems.ts` (état v073 juste avant reorder par taille)
- **Nouvel ordre 3D** :
  1. Voitures (ordre fixe, curated) : 3d-03 (rouge) → 3d-09/18/20 (batmobiles noires) → 3d-05/13 (RC buggies)
  2. Reste (véhicules + créatures/sculpts mélangés) trié par aire pixel (w×h) décroissante : 3d-04 (2560×1600) → 3d-15 → 3d-16 → 3d-24 (2000×1337) → 3d-02 → 3d-21 (1536×900) → 3d-19 (1421×879) → 3d-23 (1280×720) → 3d-25 → 3d-06 (1163×775) → 3d-08 → 3d-11 → 3d-12 → 3d-22 → 3d-07 → 3d-17 → 3d-01 → 3d-14 (800×450, plus petites)
- **Rationale** : v074 caps chaque image à sa taille native. Sur /craft en stack, ça donne un effet visuel où les grandes images s'imposent et les petites paraissent perdues. Ordre par taille décroissante = perception "large → small" naturelle après les voitures.
- **Rollback** :
  - `cp archives/v075_.../src__data__craftItems.ts src/data/craftItems.ts`

## v076 — 2026-08-11 — Colophon : ajout Design system + Method sections

- **Commit git associé** : (à créer après)
- **Type** : contenu
- **Fichiers snapshotés** :
  - `src/pages/colophon.astro`
- **Changement** :
  - 2 nouvelles sections insérées entre "The stack" et "Who did what" :
    1. **Design system** — Palette (5 couleurs avec swatches carrés, name, hex code, role) sur grid 5-col responsive + sub-section "Type, shape, mode" (4 cards : Typeface Manrope, Radius 8/12/pill, Corners squircle superellipse, Dark mode warm charcoal).
    2. **Method** — 6 cards grid 2-col : Pair with Claude via Cowork, Versioned local archives before every edit (75+ checkpoints), Session memory file (contexte-portfolio.md), Content in Google Sheets, Behance-informed layout own tokens, Ship in phases + review live.
  - Bump du build stat "46+" → "75+" iteration checkpoints (à jour avec v075).
- **Style** : cohérent avec les cards existantes (rounded-lg border-ink/10 bg-card, uppercase label muted, bold value). Palette swatches en div coloré avec ring-1 ink/10 pour définir le contour même sur bg white.
- **Rollback** :
  - `cp archives/v076_.../src__pages__colophon.astro src/pages/colophon.astro`

## v077 — 2026-08-11 — About Experience : rewrite timeline from CV v3

- **Commit git associé** : (à créer après)
- **Type** : contenu
- **Fichiers snapshotés** :
  - `src/pages/about.astro` → `about.astro.before`
- **Changement** :
  - Timeline `Experience` réécrite depuis `CV_David_Bitan_2026_v3.docx`. Ryze Beyond enrichi : ajout architecture composants Figma (variants/auto-layout/nested/interactive), méthodes research (user research, usability testing, A/B, personas, journey mapping), mentoring des 2 juniors, Sonary Software Stack Manager avec sub-features (dashboards, AI recommendation flows, chatbot UX), pratique quotidienne AI (Claude, ChatGPT, Midjourney, Leonardo, Figma AI). Reformulation team consolidation en voix passive/neutre (« team of 3 was consolidated to 1 as the company shifted to an AI-augmented workflow » vs « I consolidated a team »).
  - Reorder highlights Ryze : scale metric d'abord → Sonary produit ensuite → sole designer/consolidation → mentoring → craft (Figma, systems, research) → AI.
  - Smart.bid, Wochat, Gamingtech : 2 bullets chacun avec noms de marques réels (LoanMax + sub-brands, 10Bet/Real Deal Bet/Bet Rally) et scope du CV.
  - Postes anciens (Arc Interactive/Publicis, Tradologic, Mench, Gestimo) : 1-2 bullets max, credit Cactus factuel.
- **Rationale** : about.astro actuel = maigre vs CV v3 riche. Recruteur senior scanne les 3 premiers bullets par job — impact chiffré et produit doivent être en tête.
- **Rollback** :
  - `cp archives/v077_.../about.astro.before src/pages/about.astro`

## v078 — 2026-08-11 — Work page : mobile zone split wide/portrait + sort by height

- **Commit git associé** : (à créer après)
- **Type** : layout / UX
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` → `slug.astro.before`
- **Changement** :
  - Mobile zone : détection client-side du ratio W/H de chaque image via `naturalWidth`/`naturalHeight` au load.
    - Wide (ratio > 1) = compositions multi-screens (planches) → move hors de la grid 3-col vers un stack full-width sous la grille. Swap src + srcset vers presets FULL + landscapeSrcset (pré-calculés au SSR, stockés en data-attributes) → browser refetch une version crisp adaptée au slot 1200px.
    - Portrait = vraies captures mobiles → tri par hauteur DESC via CSS `order = -Math.round(naturalHeight)` → tallest en haut, hauteurs proches côte-à-côte, grid packé proprement.
  - Wrapper `<div data-mobile-zone>` englobe grid + wide-stack. `<style is:global>` override le cap 375px + kill card padding pour les items promus.
- **Rationale** : sur Sonary Dashboard, les compositions Figma (Import x3 vues, Add New Software 6 étapes, planches à 6 screens) étaient rendues comme des mobiles normaux dans la grid 3-col → écrasées à ~380px, illisibles. En même temps la grid avait des trous verticaux à cause des hauteurs disparates.
- **Groupage Dark/Light** : déjà géré par les 4 zones splittées de Sonary Dashboard (Desktop·Dark / Desktop·Light / Mobile·Dark / Mobile·Light) via `groupImagesByZone`. Rien à ajouter côté layout.
- **Rollback** :
  - `cp archives/v078_.../slug.astro.before src/pages/work/[slug].astro`

## v079 — 2026-08-11 — Work page : desktop zone split narrow images to 2-col grid

- **Commit git associé** : (à créer après)
- **Type** : layout / fix pixellisation
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` → `slug.astro.bak`
- **Changement** :
  - Desktop zone : détection client-side du `naturalWidth` de chaque image au load.
    - Narrow (natW < 900px) = template email / screenshot étroit → move hors du stack full-width vers un grid 2-col en dessous. Cap `max-width: naturalWidth px` sur le wrapper → image jamais upscalée.
    - Wide (natW ≥ 900px) = mockup desktop normal → reste dans le stack full-width comme avant.
  - Wrapper `<div data-desktop-zone>` englobe stack + narrow-grid. `<style is:global>` override le `w-full` du wrapper pour les items déplacés.
- **Rationale** : Sonary Email Templates a des sources 400×N (format email portrait standard). Zone URL-classée "Desktop" → rendu full-width 1151px CSS × DPR 1.5 = upscale ×4.32 = pixellisé sévère. User feedback direct : « je préfère que l'image soit légèrement plus petite mais qu'elle soit visible comme il faut ». Cap à naturalWidth = image crisp à sa taille native, 2-col pour équilibrer la page.
- **Portée** : générique, tous projets — tout image desktop sous 900px source va bénéficier du cap.
- **Rollback** :
  - `cp archives/v079_.../slug.astro.bak src/pages/work/[slug].astro`

## v080 — 2026-08-11 — About Experience : full detail sur tous postes

- **Commit git associé** : (à créer après)
- **Type** : contenu / rewrite
- **Fichiers snapshotés** :
  - `src/pages/about.astro` → `about.astro.bak`
- **Changement** :
  - Smart.bid : 2 → 5 bullets (match CV v3 verbatim)
  - Wochat : 2 → 5 bullets (match CV v3 verbatim)
  - Gamingtech : 2 → 4 bullets (match CV v3 verbatim)
  - Mench — Qdigital : 1 → 3 bullets + noms de brands (Bank Discount, Coca-Cola, Laline)
  - IGMD Affeurope — Tradologic : 1 → 3 bullets (white-label casino + binary options, trading widgets, HUDs, marketing Flash/HTML5)
  - Arc Interactive (Publicis Group) : 2 → 4 bullets + noms de brands (Bank Leumi, Afeka, UMI Motors — Cadillac, Chevrolet) + collaboration cross-discipline agency
  - Gestimo : 1 → 2 bullets (contexte real-estate Israeli firm, management de l'équipe)
  - Ryze Beyond : intact (déjà étoffé en v077)
- **Rationale** : session 10 v077 avait sur-condensé les postes anciens (choix « CV recruteur scan »). User feedback session 11 : site portfolio a plus d'espace qu'un CV, l'écart entre Ryze (8 bullets) et les 7 autres postes (1-2 bullets) était visuellement déséquilibré. Full-detail pour montrer les 20 ans réels, brands fournies par David en direct pour rendre les postes agency crédibles.
- **Rollback** :
  - `cp archives/v080_.../about.astro.bak src/pages/about.astro`

## v081 — 2026-08-11 — About : corrections Ryze mentoring + Wochat precision + Ryze craft + self-taught education

- **Commit git associé** : (à créer après)
- **Type** : contenu / corrections
- **Fichiers snapshotés** :
  - `src/pages/about.astro` → `about.astro.bak`
- **Changement** :
  - **Ryze team-of-3** : correction factuelle — pas « two junior designers », pas non plus labelisés par level (David préfère ne pas les catégoriser junior/mid, les 2 étaient bons). Reformulé neutre + humble : « worked with two talented designers, sharing knowledge across the team in both directions. I tended to handle the more complex system specs given my years in the craft ». Reconnaît leur talent, situe l'écart uniquement sur l'expérience accumulée.
  - **Wochat** : « Instant-translation messaging app » → « Live voice, text, and video translation messaging app ». Plus précis sur le scope réel du produit.
  - **Ryze motion/craft bullet ajouté** : « Motion and visual craft — SVG micro-interactions and loaders, UI animation, brand logos and marks, 3D concept explorations, and short-form video creation for product and marketing ». David demandait video creation + 3D concept + animation + interaction + logos + loaders — tout regroupé en un bullet dense.
  - **Education** : ajout d'un bloc « Self-taught, continuously — 20+ years ». Hundreds of courses over 2 decades (Udemy, YouTube, Le Site du Zéro → OpenClassrooms). Positionne l'autodidacte + veille tech continue.
  - **Layout Languages / Awards & education** : bump gap horizontal `gap-12` → `sm:gap-24` (48px → 96px sur ≥sm). Les 2 blocs étaient visuellement collés, rythme bizarre. Gap mobile conservé à 12 (blocs stackés).

## v082 — 2026-08-11 — Zones : device overrides pour URLs sans naming convention

- **Commit git associé** : (à créer après)
- **Type** : classifier / data
- **Fichiers snapshotés** :
  - `src/lib/zones.ts` → `zones.ts`
  - `src/data/allProjects.ts` → `allProjects.ts`
  - `src/pages/work/[slug].astro` → `slug.astro`
- **Changement** :
  - Nouveau champ optionnel `FullProject.imageDeviceOverrides?: Record<string, 'desktop'|'mobile'>` — map substring URL → device.
  - `groupImagesByZone(gallery, overrides?)` : second param optionnel. Si device classification par pattern URL retourne `unknown`, on cherche le 1er override matching (par `url.includes(key)`) et on applique.
  - `[slug].astro` : passe `project.imageDeviceOverrides` au classifier.
  - **Sonary Website** : ajout override pour `article-hub/article-hub-1` → mobile et `article-hub/article-hub.webp` → desktop. Les 2 fichiers étaient classés Other (rendu 2-col object-contain max-h-720 = mobile invisible, desktop trop petit) alors qu'ils sont juste un desktop + un mobile screenshot du hub d'articles.
- **Rationale** : ces 2 files ont été uploadés Cloudinary avant que la convention `-desktop`/`-mobile` soit systématique. Renommer côté Cloudinary demanderait re-upload + URL change. L'override data-driven règle le problème sans toucher les assets, et le pattern URL reste le classifier principal (override ne s'applique QUE si device=unknown → aucun risque de conflit).
- **Effet visuel** : les 2 images réintègrent les zones Desktop et Mobile correctement. Le desktop screenshot passe en stack full-width 1200px (au lieu de 560px cadré). Le mobile long screenshot passe en grid 3-col cappé 375px width, hauteur libre (au lieu d'écrasé à 720px max height).
- **Rollback** :
  - `cp archives/v082_.../zones.ts src/lib/zones.ts`
  - `cp archives/v082_.../allProjects.ts src/data/allProjects.ts`
  - `cp archives/v082_.../slug.astro src/pages/work/[slug].astro`

## v083 — 2026-08-11 — Selected Work : reorder des 11 projets (curated David)

- **Commit git associé** : (à créer après)
- **Type** : curation / data reorder
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts` → `allProjects.ts.bak`
- **Changement** — nouvel ordre validé par David sur screenshot annoté :
  1. sonary-dashboard
  2. sonary-website
  3. top5
  4. ryze-brand
  5. ryze-hub
  6. sonary-mailer
  7. playright
  8. ui-ux-vintage
  9. branding-old
  10. casino-work
  11. sport-betting
- **Rationale** : ordre curated pour montrer d'abord les 2 gros projets Sonary récents (case study #1 en prod), puis Top5 (SaaS SEO), puis les 2 Ryze (brand + hub) qui donnent le contexte du groupe, puis les autres Sonary, puis les projets legacy triés visuellement (vintage UI/UX 2011-18 → branding 2006-15 → casino 2011-17 → sport betting). Le sport-betting en dernier = moins portfolio-forward que les screens SaaS récents.
- **Rollback** :
  - `cp archives/v083_.../allProjects.ts.bak src/data/allProjects.ts`

## v084 — 2026-08-11 — Narrow desktop grid : auto-fit + centered

- **Commit git associé** : (à créer après)
- **Type** : layout fix
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` → `slug.astro.bak`
- **Changement** :
  - `[data-desktop-narrow-grid]` : ancien `grid grid-cols-1 sm:grid-cols-2 gap-8 justify-items-center` → nouveau `grid gap-8 justify-center` + inline `grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), max-content))`.
  - Le script v079 continue de set `item.style.maxWidth = naturalWidth + 'px'` sur chaque item déplacé.
  - Résultat : 1 item de 800px → sits centré à 800px CSS (crisp, plus écrasé à 559). 4 items de 400px → packés 2-3 par ligne (comme avant). Auto-fit gère le nombre de cols dynamiquement selon la largeur des items présents.
- **Rationale** : Sonary Website `write-review-step-2---desktop.webp` a une source Cloudinary à seulement 800×1226 (source non-@2x). Classée narrow (< 900) par v079 → forcée en 2-col → cellule 559px CSS → image écrasée à 559 alors que sa taille native optimale = 800. Le auto-fit résout ce cas générique : chaque item prend max sa taille native, le nombre de cols s'adapte.
- **Pattern Tailwind JIT** : `grid-template-columns` avec `repeat(auto-fit, minmax(...))` + virgules internes ne compilent PAS via arbitrary values Tailwind (JIT drop la valeur à cause des virgules). Fix : inline style attr — même leçon que v072 (transitions cubic-bezier).
- **Rollback** :
  - `cp archives/v084_.../slug.astro.bak src/pages/work/[slug].astro`

## v085 — 2026-08-11 — Narrow desktop detector : probe true source width via c_limit,w_9999

- **Commit git associé** : (à créer après)
- **Type** : fix de correctness sur détecteur
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro` → `slug.astro.bak`
- **Changement** :
  - Le script v079 lisait `img.naturalWidth` pour classer une image "narrow". Mais `naturalWidth` reflète la variante srcset SERVIE par le browser (qui dépend du slot CSS + sizes hint + DPR), PAS la source Cloudinary. Résultat : write-review-step-2 desktop (source 1200) était servi en variante 800 ou 639 selon le run → classé narrow à tort → déplacé dans narrow-grid → slot encore plus petit → variante encore plus réduite. Boucle qui rétrécit.
  - Nouveau flow :
    1. Au load, lire `img.naturalWidth` (variante servie).
    2. Si `servedW >= 900` → source garantie ≥ servi ≥ 900 → skip probe, image reste full-width.
    3. Si `servedW < 900` → suspect. Fetch `c_limit,w_9999,q_100,f_auto/<path>` — Cloudinary retourne exactement source width (jamais upscale, jamais réduit).
    4. Si `trueW < 900` → vraiment narrow → move to narrow-grid, cap max-width à `trueW`.
    5. Sinon → false positive, image reste full-width dans le stack.
  - Cache probe par URL (Map) — plusieurs items avec même src ne re-fetchent pas.
- **Coût réseau** : ~0 pour images sources ≥ 900 (pas de probe). +1 fetch Cloudinary par image narrow candidate. Cloudinary CDN cache agressif → coût réel proche de 0 après premier hit.
- **Rationale** : le fix v079 était juste dans son intention (crop mailer 400) mais mesurait la mauvaise chose. Le probe donne la vraie source width, seul critère fiable.
- **Test attendu** : sur Sonary Website, write-review-step-2 (source 1200) → probe → 1200 → skip narrow → reste full-width dans le stack (comme les autres desktop). Sonary Mailer (source 400) → probe → 400 → narrow → 2-col grid capped à 400 comme avant.
- **Rollback** :
  - `cp archives/v085_.../slug.astro.bak src/pages/work/[slug].astro`

## v086 — 2026-08-11 — Cloudinary : f_auto → f_webp (fixes bleuâtre text sur boutons)

- **Commit git associé** : (à créer après)
- **Type** : fix rendu couleur
- **Fichiers snapshotés** :
  - `src/lib/cloudinary.ts` → `cloudinary.ts.bak`
- **Changement** :
  - Remplace toutes les occurrences de `f_auto` par `f_webp` dans les presets Cloudinary : PORTRAIT, LANDSCAPE, SQUARE, FIT_TALL, FULL, FULL_TALL, MOBILE + les 2 srcset generators (mobileSrcset, landscapeSrcset).
- **Rationale** : David signale texte blanc sur boutons rouges (« Sign Up / Log In ») qui apparaît bleuâtre / difficile à lire sur les screenshots. Test HEAD sur `home-page-desktop.webp` : `f_auto,q_100` retourne **JPEG 2.5 MB** (Cloudinary choisit JPEG malgré source WebP). JPEG utilise chroma subsampling 4:2:0 par défaut → destruction du chroma aux bordures nettes texte-clair / bg-saturé → artefact bleuâtre classique.
- **Solution** : `f_webp` force retour WebP q_100 (1.7 MB, chroma 4:4:4 natif) → bordures nettes préservées. Bonus perf : file 30% plus petit que le JPEG servi par f_auto.
- **Trade-off** : compat WebP est à 96%+ browsers en 2026 (tous browsers modernes), négligeable. AVIF (encore plus léger) aurait fonctionné aussi mais support à 94%, moins conservateur.
- **Rollback** :
  - `cp archives/v086_.../cloudinary.ts.bak src/lib/cloudinary.ts`

## v087 — 2026-08-11 — REVERT v086 : back to f_auto (mobile screenshots re-flouted)

- **Commit git associé** : (à créer après)
- **Type** : revert / correction diagnostic
- **Fichiers snapshotés** :
  - `src/lib/cloudinary.ts` → `cloudinary.ts.before-revert` (état v086 = f_webp partout)
- **Changement** : Restore de tous les `f_webp` → `f_auto` (revert v086).
- **Rationale du revert** :
  1. Tests pixel-par-pixel via canvas sur `home-page-desktop.webp` : les artefacts « bleutés » autour du texte blanc sur bouton rouge sont IDENTIQUES entre `f_auto`, `f_webp` et **la source raw sans aucun transform** (~102-105 purplish edge pixels dans les 3). Le bleuté vient de la conversion PNG→WebP@q90 originale — c'est dans le fichier source sur Cloudinary, pas dans le transform.
  2. Sur mobile screenshots (`home-page-mobile.webp`), `f_auto` était INTELLIGENT : il retournait **PNG lossless** (2 MB, meilleure qualité possible sur UI + texte + aplats). En forçant `f_webp` on remplaçait ce PNG par WebP lossy 1.3 MB → **régression visible signalée par David**.
  3. `f_auto` fait du content-aware format picking : screenshots UI → PNG/WebP lossless, photos → JPEG. Vaut mieux que forcer un format unique.
- **Vrai fix pour le bleuté** : ré-uploader les screenshots sources en PNG ou WebP lossless depuis Figma (export sans compression). Cloudinary gardera le PNG intact et servira du PNG au browser via `f_auto` sur les screenshots UI.
- **Rollback** :
  - `cp archives/v087_.../cloudinary.ts.before-revert src/lib/cloudinary.ts` (retourne à v086 = f_webp partout)

## v088 — 2026-08-11 — landscapeSrcset : w_1800 → w_1600 (Cloudinary 25 MP limit)

- **Commit git associé** : (à créer après)
- **Type** : fix rendering — variant broken sur très longs screenshots
- **Fichiers snapshotés** :
  - `src/lib/cloudinary.ts` → `cloudinary.ts.bak`
- **Changement** :
  - `landscapeSrcset` : widths `[1200, 1800, 2400, 3200]` → `[1200, 1600, 2400, 3200]`.
- **Rationale** : sur Sonary Website, l'image `review-page---desktop-side-table-of-content` a une source 1920×15613 (~30 MP, très long scroll desktop). La variante `c_limit,w_1800` calculée donnait 1800×14640 = 26.4 MP, **au-dessus de la limite Cloudinary Free tier de 25 MP output** → HTTP 400. Les autres variantes du srcset (1200, 2400, 3200) marchaient (1200 sous limite, 2400/3200 = source-cap donc pas de transformation calculée). Chrome selon DPR/slot pouvait chercher la 1800 → broken image icon.
  - Diagnostic : test `HEAD` sur les 4 URLs srcset → seule w_1800 retournait 400.
  - Fix : w_1600 → cap h à ~13010 → ~20.8 MP → safe pour toutes les sources jusqu'à ~2500 wide.
- **Trade-off** : perte d'une variante intermediate — browser à DPR intermédiaire ira de 1600 direct à 2400 au lieu de 1800. Overhead bandwidth ~30% sur ces cas rares, invisible perceptuellement.
- **Rollback** :
  - `cp archives/v088_.../cloudinary.ts.bak src/lib/cloudinary.ts`

## v089 — 2026-08-11 — Ryze Brand : device override pour ryze-website (desktop)

- **Commit git associé** : (à créer après)
- **Type** : data override
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts` → `allProjects.ts.bak`
- **Changement** :
  - Sonary Website avait déjà bénéficié de v082 (`imageDeviceOverrides` pour article-hub). Ryze Brand a le même problème sur `ryze-website---homepage---example-of-lines-per-section.webp` — desktop mais filename sans token `-desktop` → tombait en "Other" (rendu 2-col object-contain max-h 720, capture wide invisible).
  - Ajout override : `'ryze-website---homepage---example-of-lines-per-section': 'desktop'`.
- **Effet visuel** :
  - Zone "Other" disparaît de Ryze Brand (2 images → réparties Desktop + Mobile).
  - Desktop capture stack full-width au-dessus de la mobile capture.
  - Le pill "Desktop" apparaît automatiquement dans `ZoneFilters` (le composant extrait les zones dynamiquement).
- **Rollback** :
  - `cp archives/v089_.../allProjects.ts.bak src/data/allProjects.ts`

## v090 — 2026-08-12 — Ryze Brand : full gallery (20 nouveaux captures organisés en 10 folders)

- **Commit git associé** : (à créer après)
- **Type** : contenu / gallery expansion
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts` → `allProjects.ts.bak`
- **Upload PNG requis avant push** :
  - `node scripts/upload-pngs.cjs --confirm --only "portfolio/ryze/0"` (matches 01-09)
  - `node scripts/upload-pngs.cjs --confirm --only "portfolio/ryze/other"` (matches Other folder)
- **Changement** :
  - Gallery passe de 2 URLs (homepage desktop + mobile) à **20 URLs** couvrant l'intégralité du site Ryze Beyond.
  - Nouvelle structure organisée par David en 10 sous-dossiers numérotés :
    - 01 Homepage (2 desktop + 2 mobile)
    - 02 About us (desktop + mobile)
    - 03 What we do (desktop + mobile)
    - 04 Careers (desktop + mobile)
    - 05 Inner Careers (desktop + mobile)
    - 06 Case Study (mobile seul)
    - 07 Partner with Us (desktop + mobile)
    - 08 Error 404 (desktop + mobile)
    - 09 Legal (mobile seul)
    - Other : "All Field" (misc)
  - Retrait de `imageDeviceOverrides` — tous les fichiers portent désormais `-desktop` ou `-mobile` dans leur nom → classifier zones.ts pick them up automatically. "All Field" reste unknown → zone Other (correct puisqu'il est dans folder Other/).
  - Thumbnail bumpé vers la nouvelle desktop v1 (`01---homepage/...---desktop.png`).
- **Résultat visuel attendu** :
  - Zone Desktop : 7 images stackées full-width (Homepage 1+2, About Us, What We Do, Careers, Inner Careers, Partner with Us, Error 404)
  - Zone Mobile : 9 images en grid 3-col (mêmes pages + Case Study + Legal)
  - Zone Other : 1 image (All Field)
- **Rollback** :
  - `cp archives/v090_.../allProjects.ts.bak src/data/allProjects.ts`

## v091 — 2026-08-12 — Ryze Brand All Field → desktop + Other zone description cleanup

- **Commit git associé** : (à créer après)
- **Type** : contenu + polish micro-copy
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
  - `src/lib/zones.ts`
  - `src/pages/work/[slug].astro`
- **Changement 1 — All Field → desktop** (`allProjects.ts`) :
  - Ajout `imageDeviceOverrides: { 'other/all-field': 'desktop' }` sur ryze-brand.
  - Effet : la seule image de la zone Other (`all-field.png`, wide form-field spec board) est reclassée desktop → rendue full-width 1200 dans le stack Desktop en fin de liste. Zone Other disparaît entièrement, pill "Other" ne s'affiche plus.
- **Changement 2 — Retrait texte placeholder de TOUTES les zones** (`zones.ts` + `[slug].astro`) :
  - `zoneDescription` retourne désormais `''` pour tous les labels (Desktop, Mobile, Desktop·Dark, Desktop·Light, Mobile·Dark, Mobile·Light, Other, Gallery, …). Toutes les phrases auto-générées (« 3 desktop layouts. Optimized for 1200–1920 viewports. », etc.) disparaissent.
  - Template `[slug].astro` : condition ajoutée pour skip rendering du `<p>` entier quand la description est vide → chaque zone n'a plus que son h2 (label seul, pas de dead-space).
- **Rationale** : David a signalé ces phrases « je ne veux pas les voir ». La fonction `zoneDescription` reste dans le code (signature préservée) au cas où on veut revenir à du copy per-project custom plus tard — mais l'implém retourne '' par défaut.
- **Rollback** :
  - `cp archives/v091_.../allProjects.ts src/data/allProjects.ts`
  - `cp archives/v091_.../zones.ts src/lib/zones.ts`
  - `cp archives/v091_.../slug.astro src/pages/work/[slug].astro`

- **Rationale** : corrections directes suite feedback David session 11. La phrase « two junior designers » était inexacte et se lisait comme de la vantardise ; la nouvelle formulation dit la même chose mais en montrant le partage de savoir plutôt que la hiérarchie. Video/3D/animation/logos/loaders manquaient — c'est une grosse part du craft real de David sur Ryze. L'autodidacte 20 ans + siteduzero/OpenClassrooms montre la trajectoire d'apprentissage continue, différenciant.
- **Rollback** :
  - `cp archives/v081_.../about.astro.bak src/pages/about.astro`

---

## v092 — 2026-08-12 — Mobile zone : image = card + probe source cap (no upscale ever)

- **Commit git associé** : (à créer après)
- **Type** : fix bug récurrent (border inadaptée + flou upscale)
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
- **Root cause** : deux paths de rendu incohérents dans la zone Mobile Light :
  1. Portrait (ratio W/H < 1) — image `w-[375px]` dans une card wrapper `p-5 sm:p-6 bg-card border border-ink/15` → le padding + bg de la card crée un cadre gris visible autour de l'image (« bordure inadaptée » signalée par David).
  2. Wide composition/planche (ratio > 1) — script v078 la déplace dans `data-mobile-wide-stack` avec CSS `width: 100% !important` → si la source Cloudinary est < 1200 native, le browser étire à 1200 CSS = flou visible.
- **Changement 1 — Kill card wrapper portrait** :
  - Zone Mobile Light : le `<div class="flex ... bg-card p-5 ...">` disparaît. L'`<img>` **est** désormais le `data-mobile-item` direct, avec `border border-ink/15 shadow-md rounded-xl` sur l'img elle-même. Plus de cadre gris, la bordure épouse exactement l'image.
- **Changement 2 — Probe source width + cap max-width partout** :
  - Nouveau `probeSourceWidth(url)` (même pattern que v085 desktop) dans le script mobile. Fetch `c_limit,w_9999` → retourne la vraie source width (`c_limit` ne up-scale jamais, ne down-scale pas sous la source).
  - Portrait : si source < 375 native → inline `max-width: <sourceW>px` sur l'img. Grid slot ne stretch plus jamais l'image au-delà de sa source.
  - Wide composition : après swap vers FULL/landscape srcset + move to wide-stack → probe source width, `max-width: <sourceW>px` inline. Plus jamais d'upscale browser sur les planches ; une composition source 900px s'affiche à 900 CSS max, centrée.
- **Changement 3 — CSS wide-stack override retiré** :
  - `[data-mobile-wide-stack] > [data-mobile-item]` : plus de `width: 100% !important` ni `max-width: 100% !important`. Le max-width inline du probe pilote. Bordure/shadow/rounded stripped pour les planches (elles ont leur propre background Figma), image centrée edge-to-edge de son slot capé source.
- **Rationale** : David : « bordure adaptée à l'image, image nette à la bonne taille, jamais de zoom/scale ». Deux problèmes = un seul fix cohérent. Sources mobiles = 375 native → cap 375 CSS = aucun upscale. Compositions source-native = display max source-native = aucun upscale. Card wrapper retiré = border = edge de l'image exactement.
- **Retina caveat** : sur écran DPR 2, une source native 375 rendue à 375 CSS = 750 physiques attendus / 375 réels = interpolation browser inévitable. Fix vrai crispness = ré-export mobile Figma @2x/3x (750 ou 1125 native source), pas côté code.
- **Rollback** :
  - `cp archives/v092_.../[slug].astro src/pages/work/[slug].astro`

---

## v093 — 2026-08-12 — Kill toute "bordure d'espacement" + bump mobile srcset

- **Commit git associé** : (à créer après)
- **Type** : fix continuité v092 — David toujours frustré par un vide horizontal autour des images + flou mobile
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
  - `src/lib/cloudinary.ts`
- **Diagnostic (probe live via fl_getinfo)** :
  - Source Cloudinary mobile TOP5 (`portfolio/top5/comparison/mobile---375---inner-343`) = **375 × 5589 native**. Export Figma @1x. Sur retina DPR 2, slot 375 CSS = 750 physiques, source 375 → upscale 100 % browser = **flou intrinsèque, impossible à fix côté code**.
  - Source desktop TOP5 (`comparison-page---desktop-1920`) = **1920 × 4611 native**. Sur slot 1200 CSS DPR 2 = 2400 physiques → upscale ~25 % = léger flou.
- **Changement 1 — Bump mobileSrcset (`cloudinary.ts`)** :
  - `[375, 800]` → `[375, 750, 1125]`. Trois variantes matchant DPR 1/2/3 sur une cellule 375 CSS. Cloudinary `c_limit` ne upscale jamais → si la source est 375 native, les trois requêtes retournent 375 (aucune régression, aucun gain). Si David ré-exporte les mobiles en 2x/3x depuis Figma, les browsers retina auront enfin une variante à la bonne densité et l'image sera crisp.
- **Changement 2 — Section retire son `px-6`, header le récupère** :
  - `<section class="mx-auto mt-12 max-w-[1200px] scroll-mt-32 px-6">` → sans `px-6`.
  - `<header class="grid grid-cols-12 gap-8">` → ajout `px-6`.
  - Effet : les stacks et grids images sont désormais edge-to-edge du container 1200. Plus de 24 px de vide gris entre l'image et le bord de la section (« la bordure d'espacement » signalée par David). Le h2 + description gardent leurs 24 px de padding pour rester lisibles sur mobile viewport.
- **Changement 3 — Grid mobile en auto-fit fixé à 375** :
  - `class="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3"` → `class="grid items-start justify-center gap-3"` + `style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 375px), 375px));"`.
  - Cellules toujours 375 wide (le mobile design), packées autant que fit dans les 1200 dispos, centrées. Sur viewport < 375 la cellule shrink à 100 %.
  - Gap 24 → 12 px pour serrer.
  - Résultat : la cellule EST le slot image. L'image `w-full` remplit exactement la cellule 375. Aucun vide horizontal entre l'image et son slot. Aucun étirement au-delà de 375 CSS.
- **Changement 4 — Image mobile `w-[375px] max-w-full mx-auto` → `w-full`** :
  - Puisque la cellule est cap à 375, l'image `w-full` s'aligne pile dessus. Plus besoin de `w-[375px]` explicite, plus besoin de `mx-auto`. Border+shadow (light) ou nu (dark) directement sur l'`<img>`.
- **Retina caveat (identique v092, non-fixable côté code)** : sur retina DPR 2, source 375 native + slot 375 CSS → flou 2× tant que les sources ne sont pas ré-exportées @2x/@3x. Pareil desktop 1920 native + slot 1200 CSS DPR 2 → flou léger 25 %. Solution unique = ré-export Figma en 2400+ desktop et 750/1125 mobile.
- **Rollback** :
  - `cp archives/v093_.../[slug].astro src/pages/work/[slug].astro`
  - `cp archives/v093_.../cloudinary.ts src/lib/cloudinary.ts`

---

## v094 — 2026-08-13 — Fix tags SaaS erronés (4 projets) + Playright Gaming + year 2021

- **Commit git associé** : (à créer après)
- **Type** : correction data — task #7 du backlog
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
- **Diagnostic** : seul `sonary-dashboard` est vraiment un SaaS. `sonary-website`, `top5`, `sonary-mailer` étaient taggés SaaS à tort (ce sont des surfaces marketing/éditoriales/emails, pas des SaaS produits). `playright` est un site comparison casinos UK → catégorie **Gaming**, pas SaaS. Year Playright était `2024`, vraie date = `2021`.
- **Changements** :
  - `sonary-website` : `category: 'SaaS' → 'UI/UX'` + retrait `categories` (fallback `[category]`) + tags `['SaaS','Marketing Site','Content','SEO'] → ['Marketing Site','Content','SEO']`.
  - `top5` : `category: 'SaaS' → 'UI/UX'` + retrait `categories` + tags `['SaaS','Editorial','Comparison'] → ['Editorial','Comparison']`.
  - `sonary-mailer` : `category: 'SaaS' → 'UI/UX'` + retrait `categories`. Tags déjà sans SaaS.
  - `playright` : `year: '2024' → '2021'` + `category: 'SaaS' → 'Gaming'` + `categories: ['SaaS','UI/UX'] → ['Gaming','UI/UX']` + tags `['SaaS','Product Page','UX'] → ['Gaming','Casino Comparison','UX']`.
- **Impact pill filter home** (SelectedWork) : la pill **SaaS** ne montre plus que `sonary-dashboard` (seul vrai SaaS). **UI/UX** gagne sonary-website/top5/sonary-mailer. **Gaming** gagne playright (avec casino-work + sport-betting).
- **Rollback** :
  - `cp archives/v094_.../src__data__allProjects.ts src/data/allProjects.ts`

---

## v095 — 2026-08-13 — Mobile zone break out article padding (cell = 375 strict)

- **Commit git associé** : (à créer après)
- **Type** : fix bug v093 — sur mobile viewport 375, les cellules étaient à 327 CSS (pas 375)
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
- **Diagnostic** : v093 avait retiré `px-6` de la `<section>` pensant régler le vide horizontal. Mais l'`<article>` parent garde `px-6` (24 px chaque côté). Sur viewport 375 : article inner = 327 → section = 327 → grid = 327 → cell `minmax(min(100%, 375px), 375px)` = 327 (contrainte 100 % dominante). L'image `w-full` = 327, pas 375. Sur retina DPR 2, slot 327 CSS avec source 375 → downscale visuel + le browser sert quand même une variante Cloudinary trop petite. David voyait des images « pas 375 de large » à raison.
- **Fix** : `<div class="mt-12" data-mobile-zone>` → `<div class="mt-12 -mx-6" data-mobile-zone>`. Négatif margin −24 px chaque côté sur la mobile zone → le div break out du padding de l'article. Sur mobile 375 : zone = 375, grid = 375, cell = 375, image = 375. Sur desktop 1200 : article inner = 1152, zone = 1200 → grid = 1200 → 3 cells de 375 (1125) + 2 gaps de 12 (24) = 1149, fit propre dans 1200. Aucun débordement horizontal.
- **Zones non touchées** : `data-desktop-zone` (garde son intent v093, images stay dans article inner) et zone `Other` (grid 2-col object-contain, layout différent). Si David veut aussi le desktop edge-to-edge 1200, on ajoutera `-mx-6` là aussi.
- **Rollback** :
  - `cp archives/v095_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v096 — 2026-08-13 — Mobile grid → flex-wrap, image w-[375px] strict, gap 37.5 px

- **Commit git associé** : (à créer après)
- **Type** : fix demande explicite David — cell = image = 375 pile, gap 37.5 px, peu importe si le 1200 reste avec du vide
- **Fichiers snapshotés** :
  - `src/pages/work/[slug].astro`
- **Diagnostic** : le grid `auto-fit + minmax(min(100%, 375px), 375px)` marchait en théorie mais David voyait encore les cells se contracter (probablement combo de l'article `px-6` + du `min(100%, ...)` qui shrink quand parent < 375). Impossible à décoincer sans casser autre chose.
- **Fix — layout radicalement plus simple (flex)** :
  - `<div class="grid ..." style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 375px), 375px));" data-mobile-grid>` → `<div class="flex flex-wrap items-start justify-center gap-[25px]" data-mobile-grid>`.
  - Sur chaque `<img data-mobile-item>` : `w-full` → `w-[375px] max-w-full`. L'image fait toujours 375 pile ; sur viewport < 375 (rare), `max-w-full` empêche l'overflow.
  - Gap 12 → 37.5 px (demande explicite David — espace entre chaque image mobile).
  - `justify-center` centre la row, donc sur desktop 1200 les 3 images de 375 se placent centrées, avec l'espace résiduel (1200 − 3×375 − 2×37.5 = 0 px !) — nickel pile-poil.
- **Comportement viewport par viewport** :
  - 1200+ (desktop) : 3 images de 375 côte à côte + 25 px gap, ligne centrée dans le 1200. Wrap si plus de 3 items.
  - 800 (tablet) : 2 images × 375 (+ 25 gap = 775), wrap sur ligne suivante.
  - 375 (mobile) : 1 image de 375 par ligne, empilées.
  - 320 (rare) : `max-w-full` clamp à 320.
- **-mx-6 v095 conservé** : la zone break out toujours du padding article pour que sur mobile 375 l'image ne soit pas contrainte à 327.
- **Wide compositions (ratio > 1) inchangées** : le script client-side les sort du grid vers le `data-mobile-wide-stack` full-width.
- **Rollback** :
  - `cp archives/v096_.../src__pages__work__slug.astro src/pages/work/[slug].astro`

---

## v097 — 2026-08-13 — Top5 article-375 : re-upload PNG + drop version prefix pour servir latest

- **Commit git associé** : (à créer après upload + push David)
- **Type** : remplacement asset — David a régénéré `Portfolio images/Top5/Article/Article 375.png` (fichier daté 2026-08-13 02:36)
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
- **Contexte** : l'ancien article-375 était rendu buggé en live (compression / artefacts). David a ré-exporté un nouveau PNG. Sandbox Cowork ne peut pas atteindre api.cloudinary.com (bloqué par proxy allowlist), donc David lance l'upload lui-même depuis PowerShell via le pipeline `scripts/upload-pngs.cjs`.
- **Changement code** : URL Cloudinary `v1785342215/portfolio/top5/article/article-375.webp` → `portfolio/top5/article/article-375.webp` (drop du prefix version). Sans prefix, Cloudinary sert la version courante du public_id. Après upload, le browser refetch le nouveau PNG (bonus : `invalidate: true` dans le script purge le CDN cache immédiatement).
- **Note pipeline** : le script `upload-pngs.cjs` a `overwrite: true` + `invalidate: true`. Le public_id `portfolio/top5/article/article-375` reste identique, la source PNG remplace l'ancienne, l'URL non-versioned dans le code auto-tire la nouvelle.
- **Rollback** :
  - Code : `cp archives/v097_.../src__data__allProjects.ts src/data/allProjects.ts`
  - Asset : re-uploader l'ancien PNG (pas conservé — Cloudinary garde l'historique via version prefix, l'ancien = `v1785342215` toujours accessible en dur si besoin)

---

## v098 — 2026-08-13 — Top5 comparison + lineup mobile : drop version prefix + test @2x

- **Commit git associé** : (à créer après upload + push David)
- **Type** : préparation code pour test qualité @2x sur comparison + lineup mobile
- **Fichiers snapshotés** :
  - `src/data/allProjects.ts`
- **Contexte** : après le test @2x sur article-375 (v097), David veut valider la qualité retina sur les 2 autres mobiles du projet Top5. Renaming local des exports @2x pour qu'ils écrasent les public_ids existants :
  - `Comparison/Mobile - 375 - inner 343.png` (@1x 375×5589) → `.png.bak` (script upload skip)
  - `Comparison/Mobile - 375x2 - inner 343.png` (@2x 750×11178) → renommé `Mobile - 375 - inner 343.png`
  - `Lineup/Website width 375x2 - Container 343 - Lineup 344.png` (@2x 750×28775) → renommé sans le `x2`
  - `Article/Article 375x2.png` (@1x backup 375×15473) → `.png.bak`
- **Changement code** : drop version prefixes sur les 2 URLs comparison + lineup mobile (`v1785342219` et `v1785342225`) → non-versioned = Cloudinary sert la version courante du public_id après upload+invalidate.
- **Bénéfice attendu** : retina crisp sur DPR 2 (majorité des devices récents). Server-side Lanczos downscale sur DPR 1 (750→375) supérieur au browser scaling du @1x.
- **Rollback code** :
  - `cp archives/v098_.../src__data__allProjects.ts src/data/allProjects.ts`
