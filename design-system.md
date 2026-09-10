# Name Genius design system

Visual direction: **Linear's design system** — Inter typography, a dark near-black canvas, an indigo accent, hairline borders instead of heavy shadows, and modest (8–16px) radii instead of pill-everything. This replaced the earlier Lato/orange/TripGlide-inspired direction on request; the structure (swipe deck, floating nav, overlapping sheet) is unchanged, only the surface language.

## Principles

1. The name is the hero. Everything else is supporting evidence.
2. One primary action, always within thumb reach (sticky indigo/white CTA or floating nav).
3. Depth comes from hairline borders and subtle elevation, not big shadows or bright fills.
4. Motion answers a gesture (`transform` + `opacity`, ease-out, under 250ms). Honor `prefers-reduced-motion`.
5. Never rely on color alone for like/dislike — pair with labels.

## Layout

- Phone canvas: max 430px, page `--color-bg-page` (`#08090a`)
- Horizontal padding: `--spacing-5`
- Featured cards: `--radius-2xl` (16px)
- Sheets overlap the hero by `--spacing-8`
- Bottom nav: floating panel, `--color-bg-surface` + hairline border, `--radius-xl`

## Components

| Component | Token use |
|---|---|
| Primary CTA | fill `--color-primary` (indigo `#5e6ad2`), `--radius-md`, 44px min height |
| Ink CTA | fill `--color-text-primary` (near-white), inverse text (Book / Generate) |
| Category pills | inactive `--color-bg-surface` + hairline border; active indigo tint |
| Icon circle | 40px, `--color-bg-surface`, hairline border, no shadow |
| Badge | `--radius-xs`, translucent tint of the semantic color |
| Input | `--radius-md`, 1px `--color-border-default`, focus ring `rgba(94,106,210,0.22)` |

## Motion

- Press: `scale(0.98)` 120ms `--ease-out`
- Sheet: 240ms `--ease-drawer` translateY
- Swipe: follow finger; commit uses velocity or 80px
- Stagger type chips 30ms
