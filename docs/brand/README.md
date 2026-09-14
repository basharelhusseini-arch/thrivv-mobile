# Thrivv wordmark

The web identity uses six upright outlined letters, optical spacing and a solid
champagne-gold finish. The complete name is THRIVV. Geometry is independent of
installed fonts and stays legible at the 20px and 24px app sizes.

- Master geometry and colors: `lib/brand-wordmark.ts`.
- Shared web component: `components/Logo.tsx`; existing sizes, variants and links remain supported.
- Gold: `#D8BD7D`. Ivory/white: `#F4F1E8`. Both are designed for dark backgrounds.
- Transparent exports: `public/brand/thrivv-wordmark-gold.svg` and `public/brand/thrivv-wordmark-white.svg`.
- Regenerate SVG exports after editing the master: `node scripts/export-logo.cjs`.
- `thrivv-wordmark-preview.png` shows the actual vector geometry at large and small sizes; it is a design preview, not a browser screenshot.

The wordmark contains its own clear space. Preserve its aspect ratio and solid
finish; avoid adding skew, glow or trailing slashes. UI accent colors remain
separate from the wordmark finish. Native wrapper launcher/splash assets are
outside this web-logo update.

Validation: TypeScript and targeted lint passed. Both SVG variants were rendered
at 24px height and checked for clipping. Shared call sites and accessible naming
were reviewed. No live browser layout pass is claimed.
