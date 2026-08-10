---
name: Obsidian & Ether
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for a premium, high-velocity fintech experience tailored to a Gen Z audience. It balances the precision of professional tooling with the fluid, expressive nature of modern lifestyle apps. The aesthetic sits at the intersection of **Minimalism** and **Glassmorphism**, leveraging deep obsidian surfaces and vibrant mesh accents to create a sense of infinite depth.

The brand personality is sophisticated yet approachable—moving away from traditional banking "stuffiness" toward a "digital-first" premium feel. It draws inspiration from high-end productivity software, emphasizing clarity, speed, and high-quality tactile feedback. Every interaction should feel intentional, frictionless, and visually rewarding.

## Colors

This design system utilizes a high-contrast dark-mode-first palette. The base is **Obsidian** (#020203), providing a deep, ink-like canvas that allows vibrant primary colors to "pop" with neon-like intensity.

- **Primary (Electric Indigo):** Used for primary actions, active states, and brand highlights.
- **Secondary (Vibrant Mint):** Reserved for "positive" financial flows—settling debts, receiving money, and growth.
- **Surface Strategy:** Layers are defined by increasing luminosity. Higher-order elements use lighter obsidian shades to indicate elevation.
- **Glassmorphism:** Overlays use a semi-transparent white (8-12%) with a high-saturation backdrop blur (20px+) to maintain legibility over mesh gradients.

## Typography

The typography strategy pairs **Sora** for display and **Geist** for utility.

- **Display & Headlines:** Sora provides a futuristic, geometric character that feels modern and bold. High-weight display roles should use tight letter-spacing to create a "locked-in" editorial look.
- **Body & Interface:** Geist is used for all functional text, providing exceptional legibility and a "developer-tool" level of precision.
- **Monospace Accents:** JetBrains Mono is utilized for financial figures, transaction IDs, and labels to evoke a sense of data accuracy and technical sophistication.

## Layout & Spacing

The layout relies on a strict **8px grid system**. Generous negative space is a core tenet of this system to prevent the UI from feeling cluttered during complex expense splitting.

- **Desktop:** 12-column fluid grid with wide 32px gutters for a spacious, "canvas" feel.
- **Mobile:** 4-column grid with 24px side margins.
- **Rhythm:** Vertical spacing should prioritize large gaps (32px+) between major logical sections and tighter gaps (8px-16px) between related interactive elements. This "grouping" helps Gen Z users scan information rapidly.

## Elevation & Depth

This design system eschews traditional "drop shadows" in favor of **Tonal Elevation** and **Inner Glows**.

- **Level 0 (Background):** Pure Obsidian.
- **Level 1 (Cards/Lists):** Slightly lighter surface with a 1px "inner border" (top-down light source) at 10% white opacity.
- **Level 2 (Popovers/Modals):** Glassmorphic surfaces with a 40px backdrop blur and a soft, expansive outer glow (#000000 40% opacity, 20px blur) to simulate floating.
- **Mesh Gradients:** Subtle, slow-moving blurs of Indigo and Mint are placed behind Level 0 surfaces, visible only through glassmorphic elements to create a sense of vibrant energy underneath the interface.

## Shapes

The shape language is ultra-soft and organic.
- **Buttons:** Use a 12px (rounded-lg) radius to feel tactile and friendly.
- **Cards:** Use a 24px (rounded-xl) radius, creating a "container" feel that mimics high-end hardware.
- **Inputs:** Match button radius (12px) for consistency in the "active" zone of the screen.
- **Interactive States:** When hovered or pressed, elements may subtly increase their corner radius or scale by 2-3% to provide physics-based feedback.

## Components

### Buttons
- **Primary:** Solid Electric Indigo with white text. High-gloss finish (subtle top-to-bottom gradient).
- **Secondary:** Glassmorphic background (10% white) with a 1px border.
- **Motion:** Scale down to 0.96 on tap; spring-based return to 1.0.

### Input Fields
- Filled style using a deep charcoal (#18181B).
- Active state features a 1px solid Electric Indigo border and a subtle outer glow.
- Labels use JetBrains Mono for a "data-entry" feel.

### Cards
- Large 24px radius.
- 1px "Hairline" border (rgba 255,255,255, 0.08).
- Backdrop-blur: 20px for cards positioned over mesh gradients.

### Navigation
- Floating bottom tab bar with glassmorphism.
- Active icons use a "blob" indicator—a soft, glowing Indigo circle behind the icon.
- Transitions between tabs should use horizontal slides with a heavy damping ratio (stiffness: 300, damping: 30).

### Chips/Badges
- Pill-shaped (fully rounded).
- High-saturation backgrounds with low-opacity (20%) to allow the text color to dominate.
