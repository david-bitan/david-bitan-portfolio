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
