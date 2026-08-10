---
name: Obsidian & Ether Light
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#5d5e60'
  on-tertiary: '#ffffff'
  tertiary-container: '#767778'
  on-tertiary-container: '#040506'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e2e2e3'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Sora
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: '0'
  body-md:
    fontFamily: Sora
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-md:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Sora
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  sidebar-width: 280px
  panel-right-width: 320px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 48px
---

## Brand & Style

This design system evolves a high-fidelity aesthetic into a light-first, high-clarity workspace. It targets sophisticated professionals and creative teams who require a focused, low-friction environment. The style is **Modern Minimalist** with influences from **Glassmorphism**, emphasizing high-quality white space, layered depth, and precise information density. 

The emotional response should be one of "effortless power"—a UI that feels weightless yet structurally sound. By prioritizing crisp white surfaces over deep obsidian tones, the system maximizes readability and reduces cognitive load during long working sessions. Large corner radii and generous internal padding maintain the approachable, premium character established by the original narrative.

## Colors

The palette shifts to a "Paper and Ink" foundation with an electric Indigo core. 

- **Primary (#6366f1):** Used for primary actions, focus states, and active indicators. It provides the "Ether" energy within the light environment.
- **Backgrounds:** The base layer is pure white (#FFFFFF). Secondary surfaces like sidebars and background fills use #F9FAFB to create subtle structural differentiation.
- **Borders:** All UI boundaries use a soft Slate (#E2E8F0) to maintain definition without visual noise.
- **Text:** Primary content uses Slate-900 (#0F172A) for maximum contrast, while secondary metadata uses Slate-500 (#64748b).

## Typography

Sora is the exclusive typeface, utilized for its technical geometric clarity and wide aperture. In this light theme, we use slightly heavier weights for headlines to ensure they anchor the layout against the vast white space.

For body text, tracking is kept at 0 to maintain readability, while labels and small captions receive a slight letter-spacing increase (+0.01em to +0.02em) to prevent characters from blurring together on high-resolution displays. Hierarchy is established through weight shifts (SemiBold for interactive elements) rather than just size.

## Layout & Spacing

The layout utilizes a **Fluid-Fixed Hybrid** model. The main content area sits within a 12-column fluid grid, but is flanked by fixed-width functional zones: a multi-level Left Sidebar (280px) and an optional Right Detail Panel (320px).

**Breakpoints:**
- **Desktop (1280px+):** Full 3-column layout (Sidebar + Content + Panel).
- **Tablet (768px - 1279px):** Sidebar becomes a collapsible drawer; Right Panel is hidden behind an overlay.
- **Mobile (<768px):** Single column with 16px side margins.

Spacing follows an 8px base grid, though "Ether" requires 24px and 48px gaps to create the signature premium, airy feel. Gutters are strictly enforced at 24px to ensure components never feel cramped.

## Elevation & Depth

This system uses **Ambient Shadows** and **Tonal Layering** to create a sense of verticality. Unlike the dark theme's reliance on glows, the light theme uses shadows to indicate interactivity and hierarchy.

- **Level 0 (Base):** #FFFFFF or #F9FAFB. No shadow. Used for the application canvas.
- **Level 1 (Card/Surface):** White surface with a 1px border (#E2E8F0). No shadow.
- **Level 2 (Floating/Active):** White surface with a soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)`.
- **Level 3 (Modals/Command Palette):** High-elevation shadow with an Indigo-tinted ambient glow to reflect the brand color: `0 20px 25px -5px rgb(99 102 241 / 0.1), 0 8px 10px -6px rgb(99 102 241 / 0.1)`.
- **Glassmorphism:** Navigation bars and sticky headers use a 12px backdrop blur with a semi-transparent white fill (80% opacity) to maintain context during scroll.

## Shapes

The shape language is hyper-rounded, conveying a friendly yet high-end technological feel. A base radius of **24px** (rounded-xl) is the standard for cards and primary containers. 

- **Buttons & Inputs:** Use the pill-shape (full radius) or a minimum of 12px to maintain the "soft-tech" aesthetic.
- **Data Tables:** Outer containers use 24px, while internal row selections use a 8px radius to maximize space efficiency.
- **Command Palette:** Uses 20px radius to appear as a distinct, floating architectural element.

## Components

### Left Sidebar (Multi-level)
The sidebar uses a #F9FAFB background with a subtle right border. Navigation items feature 12px padding, a 12px radius, and use the Primary Indigo color only for the active state icon and a 3px vertical "indicator pill."

### Data Tables
Tables are designed for high-density information without looking cluttered. They use horizontal-only borders (Slate-100). Header rows are sticky, using a #F9FAFB background with a SemiBold Sora Label-SM font. Rows feature a "soft-hover" state using #F1F5F9.

### Command Palette
A center-aligned floating modal. It features a prominent 24px search icon, 18px Sora typography for input, and a high-elevation shadow. Results are categorized with Label-SM headers.

### Buttons
- **Primary:** Solid Indigo (#6366f1) with white text. Full-pill radius.
- **Secondary:** White background with 1px Slate-200 border. Hover state adds a Level 2 shadow.
- **Ghost:** No background or border. Indigo text for actions, Slate-600 for navigation.

### Inputs & Cards
Inputs use a 12px radius and a Slate-50 background that shifts to White with an Indigo border on focus. Cards are pure white, strictly using the 24px radius and Level 1 or Level 2 elevation to separate content blocks.