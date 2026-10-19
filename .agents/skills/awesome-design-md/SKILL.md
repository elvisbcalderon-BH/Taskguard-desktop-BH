---
name: awesome-design-md
description: Apply high-end brand design systems (Linear, Stripe, Vercel, Raycast, Supabase, etc.) using curated DESIGN.md specifications. Use when styling or designing UI to match world-class brands.
---

# Awesome DESIGN.md Systems

This skill allows the agent to reference pre-built, industry-standard `DESIGN.md` guidelines for world-class web applications and brands.

## Available Brand Design Systems
The curated specifications reside in the `awesome-design-md/` directory (or can be referenced locally):
- **Stripe**: Clean financial elegance, subtle gradients, high legibility.
- **Linear**: High contrast dark mode, subtle borders (`rgba(255,255,255,0.08)`), micro-interactions, keyboard-first feel.
- **Vercel**: Monochromatic black/white, geometric precision, Geist font stack, crisp borders.
- **Raycast**: Deep dark aesthetic, vibrant neon accents, compact desktop/command palette density.
- **Supabase**: Emerald/dark theme, developer-focused layout, distinct brand cards.
- **Airbnb, Apple, GitHub, Notion, OpenAI, Shopify, Spotify, etc.**

## Workflow
1. When starting or restyling a project, ask or infer which design language fits best.
2. Load the corresponding `DESIGN.md` specification.
3. Extract tokens:
   - Color palette (hex codes, CSS variables).
   - Typography scales & Google Fonts.
   - Component styles (buttons, cards, badges, inputs).
   - Elevation, shadows, and border-radius rules.
4. Apply the tokens consistently to `index.css` and all UI components.
