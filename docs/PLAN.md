# Lettermint — Product & UI/UX Roadmap

> Status: Phases 1–5 shipped (editor, studio, craft, brand kit, launch polish). Phases 6–7 are planned and each one stands on its own, so later work does not need a redesign.

## 1. Why change

Phase 1 was a working but **plain, single-purpose initials generator**. It had no export, no
inspiration, and no reason to come back. "Type two letters and pick a circle" is an idea from the
2010s. Modern tools (Figma plugins, Looka, Brandmark, Recraft) compete on:

1. **Instant generation.** Show many good options before the user touches a control.
2. **Context.** Show the mark where it will actually be used (favicon, app icon, avatar).
3. **Output.** Give the user files they can use immediately, plus a link they can share.
4. **Low-risk editing.** Undo/redo, autosave and deep links mean nothing is ever lost.

**New positioning:** *Lettermint — a pocket brand-mark studio.* You type your initials and get a
mark, its variations, mockups and an export kit. It stays free, needs no signup, runs entirely in
the browser and works offline.

## 2. Design system (from `ui-ux-pro-max`, adapted)

The skill recommended a violet/pink "AI creative tool" palette with Fredoka/Nunito and a
kinetic-brutalist style. **Changes for this product:**

| Skill recommendation | Decision | Reason |
|---|---|---|
| Violet `#7C3AED` primary, pink accent | **Mint `#10B981` primary + violet `#8B5CF6` secondary**, used as an "aurora" gradient | The brand is *Lettermint*. Violet stays as the secondary/generation colour. |
| Fredoka / Nunito via Google Fonts CDN | **Bricolage Grotesque (display) + Inter (UI)**, self-hosted through @fontsource | Both are already bundled. There are no third-party requests, and the PWA keeps working offline. |
| Kinetic brutalism, 0px radius, marquee | **Soft "studio" bento**: layered surfaces, 16–24px radius, subtle glass only on floating bars | An editor needs calm chrome so that the logo is the loudest element on screen. |
| Dark primary | **Light, Dark and System** themes, designed together | Logo designers need to check their mark on both backgrounds. |

Rules carried over from the skill (these are not optional):
- Text contrast is ≥ 4.5:1 and the focus ring is always visible. Icon-only buttons have `aria-label` and a tooltip.
- Touch targets are ≥ 44px and buttons give press feedback (scale 0.97).
- Motion lasts 150–300ms, uses only transform/opacity, and respects `prefers-reduced-motion`.
- Icons are SVG only, never emoji. Each screen has one primary CTA (**Export**).
- Toasts use `aria-live="polite"`, never steal focus and dismiss themselves after about 3s.

Tokens are defined in `src/index.css` (`--color-ink-*`, `--color-mint-*`, `--aurora`, radii, shadows).

## 3. Phases

### Phase 2 — Studio *(shipped)*
| Feature | Notes |
|---|---|
| Redesigned shell | Top bar (brand, undo/redo, shuffle, theme, share, **Export**), bento editor layout, refreshed mobile bottom sheet |
| **Variations gallery** | 8 generated alternatives from the user's own initials. Click one to apply it, or shuffle with `R` |
| **Palette presets** | Curated pairs, a swap-colours button and the contrast check |
| **Gradient fill** | Solid or linear gradient background with an angle control. Included in exports |
| **Export dialog** | SVG download, PNG at 64–2048px, copy SVG markup, success toasts |
| **Mockups** | Browser tab, iOS home-screen icon, social avatar, light/dark tiles |
| **Undo / redo** | `⌘/Ctrl+Z`, `⇧⌘Z`. Slider drags are merged into one step |
| **Autosave + share link** | State is saved to localStorage and mirrored into the URL hash. A copy-link action shares the exact logo |
| **Preview backdrop** | Checkerboard, light or dark, to test transparency |

### Phase 3 — Craft
- Outline/stroke and monoline letters, a letter colour gradient, and an inner border ring
- More shapes (rounded square with a radius slider, shield, pill, blob with a seed) and "no shape"
- Per-letter offset/rotation for monogram interlocks
- Variable-font weight axis (needs WOFF→TTF variable sources)

### Phase 4 — Brand kit *(shipped: Export dialog → Kit)*
- One-click ZIP: favicon.ico + PNG set (16/32/180/192/512), `site.webmanifest`, social avatar, OG image (1200×630)
- Auto-generated palette (tints/shades plus a complementary colour) exported as CSS variables and Tailwind config
- Wordmark lockup: mark + full name, horizontal/stacked
- Implementation: pure `lib/brandkit` (palette, lockups, OG, manifest), `lib/zip` (stored ZIP), `lib/ico`
  (PNG-in-ICO); `exporter.brandKitZip` only rasterises and packs. Lockup text is converted to paths, so
  files need no fonts. `brandName` is part of `LogoState` (autosave, share link `n=`, undo).

### Phase 5 — Launch polish *(shipped, no new features)*
- Responsive pass at 360/768/1280 px: 44px targets, export dialog scrolls within the mobile viewport
- Accessibility: in-dialog live region (the page behind a modal is inert), AA contrast for the primary button,
  gradient text and size chips, higher-contrast switch track
- Performance: export code lazy-loaded; gallery fonts wait for the selected font; logo fonts runtime-cached by
  the service worker instead of precaching all 60
- Error states: blocked clipboard, export failure, font load failure, unsupported characters, damaged share links
- SEO: meta, Open Graph and Twitter tags, canonical placeholder, robots.txt, sitemap, icons and OG image generated
  by the app's own brand-kit export

### Phase 6 — Generative / AI (still $0, client-side)
- "Describe your vibe" keywords that map to font/shape/palette weights (rule-based first)
- Seeded variation URLs (`#seed=…`) so a set of results can be shared
- Optional on-device model later; no server is required

### Phase 7 — Platform
- Saved library (IndexedDB) with named projects
- Installable PWA manifest and icons, share target
- i18n and RTL review

## 4. Architecture rules (keep it continuable)

- **Pure first.** Geometry (`lib/buildLogo`), SVG serialisation (`lib/svg`), variations (`lib/variations`),
  share encoding (`lib/share`) and history (`lib/history`) are pure, deterministic and unit-tested.
  Components only render.
- **One renderer.** `components/LogoMark` draws the logo everywhere (preview, gallery, mockups). Export
  uses `lib/svg`, and both share `gradientVector`. A new visual feature goes into both places and nowhere else.
- **Store validates.** Every write, including `apply(partial)` from URL, storage or variations, goes through
  the same validators. Untrusted input never reaches the renderer.
- **No new runtime dependencies** unless one replaces a meaningful amount of code. Icons are inline SVG.
- **Verification:** `npm run test && npm run lint && npm run build` must pass before each phase is marked done.
