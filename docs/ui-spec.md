# UI Specification — CyberComplaint

## Design Direction
Light mode. Minimal. 2026 editorial aesthetic. Mobile-first for stressed Indian users filing cybercrime complaints.

## Color System

### Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FAFAFA` | Page background |
| `foreground` | `#1A1A2E` | Primary text |
| `card` | `#FFFFFF` | Card backgrounds |
| `primary` | `#2563EB` | CTAs, links, accents |
| `destructive` | `#DC2626` | Emergency callouts, errors |
| `success` | `#16A34A` | Trust signals, positive states |
| `muted-foreground` | `#6B7280` | Secondary text |
| `border` | `#E5E7EB` | Dividers, card borders |
| `surface-elevated` | `#F9FAFB` | Section alternating bg |

### Gradients
- **text-gradient**: `#2563EB → #7C3AED → #16A34A` (hero headline accent)
- **Logo**: Primary blue shield on `#2563EB/10` background

## Typography

### Font Stack
- **Body**: Inter (variable, `--font-inter`)
- **Headings**: DM Serif Display (`--font-dm-serif`)
- **Monospace**: JetBrains Mono (`--font-mono`) — for phone numbers, stats

### Scale
| Element | Size | Weight |
|---------|------|--------|
| Hero headline | `text-5xl → text-7xl` | `font-bold` |
| Section headings | `text-3xl → text-5xl` | `font-bold` |
| Subheadings | `text-lg → text-xl` | `font-medium` |
| Body | `text-base` | `font-normal` |
| Labels/captions | `text-sm` | `font-medium` |

## Components

### Button
- **Primary**: `bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20`
- **Hover**: `bg-primary/90` + arrow translate
- **Sizes**: `sm` (nav), `lg` (hero CTA)

### Card
- `bg-card border border-border rounded-2xl`
- Hover states: `data-[state=open]:border-primary/30` (accordion)

### Badge/Callout
- Emergency: `bg-red-50 border-red-100 text-red-600 rounded-full`
- Trust: inline flex with icon + text, `text-sm text-muted-foreground`

## Layout

### Spacing
- Section padding: `py-24 px-6`
- Max content width: `max-w-7xl` (hero), `max-w-5xl` (how-it-works), `max-w-3xl` (FAQ)
- Grid gaps: `gap-6` → `gap-8` → `gap-12` responsive

### Grid System
- Hero: centered single column, `max-w-3xl mx-auto text-center`
- How It Works: `grid sm:grid-cols-3`
- Social Proof stat: centered, full-width
- Social Proof cards: `grid sm:grid-cols-2`

## Sections (Page Order)

1. **Navbar** — fixed, transparent → `bg-background/80 backdrop-blur-xl` on scroll
2. **Hero** — full viewport, grid-bg pattern, gradient blobs, single CTA
3. **SocialProof** — big 78% stat + two urgency cards
4. **HowItWorks** — 3 horizontal steps with connector lines
5. **FAQ** — accordion, `bg-surface-elevated/50` alternating sections
6. **Footer** — CTA repeat, emergency numbers, disclaimer

## Visual Effects
- **grid-bg**: subtle blue gridlines at `rgba(37,99,235,0.03)`
- **Gradient blobs**: blue/purple blurred circles behind hero
- **noise-bg**: optional SVG noise texture at 2% opacity
- **Animations**: framer-motion fade-up on hero elements, staggered delays
- **Scrollbar**: 6px custom, light theme matching `#FAFAFA` track

## Favicon
Shield with lock icon, indigo/violet gradient (`#6366F1 → #8B5CF6`)

## Logo
- Shield icon on `bg-primary/10`, `text-primary`
- Sizes: sm (6×6), md (8×8), lg (10×10)
- Text: "CyberComplaint" in `font-semibold tracking-tight`

## Responsive Breakpoints
- Mobile: default (< 640px)
- sm: 640px — 2-col grids activate
- md: 768px — nav links appear
- lg: 1024px — max-widths expand

## Accessibility
- `scroll-smooth` on html
- `antialiased` on html
- Semantic HTML: `<section>`, `<nav>`, `<footer>`
- Color contrast: primary blue on white ≥ 4.5:1
- Focus rings via `outline-ring/50`
