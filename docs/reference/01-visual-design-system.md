# Barnes Hauling & Disposal Visual Design System

**Status:** APPROVED DESIGN SOURCE OF TRUTH
**Applies to:** Public website, quote and booking flows, customer portal, transactional pages, and operations interfaces
**Visual direction approved:** July 17, 2026
**Owner-supplied reference:** Dumpster-rental promotional flyer featuring the Barnes elk-and-forest mark

## 1. Authority and usage

This document is the authoritative visual-design specification for Barnes Hauling & Disposal. New user-interface work must follow it unless the owner deliberately approves a documented revision.

When sources conflict, use this order:

1. Versioned business, pricing, legal, and operational data for factual content.
2. This document for visual appearance and interaction design.
3. Existing implementation patterns that do not conflict with either source above.
4. The owner-supplied flyer as visual inspiration only.

The reference flyer establishes the desired **theme, typography character, color family, density, imagery, and rugged service-business tone**. It is not a factual source for pricing, contact details, legal identity, availability, or service-area claims.

### Never copy these unverified or conflicting flyer claims

- Do not use `barneshauling@gmail.com`. The currently confirmed customer email is `barneshaulingdisposal@gmail.com`.
- Do not publish a `$350` price for the 22-yard dumpster unless an approved pricing version supplies that value. It currently remains quote-required.
- Do not append `LLC` until the legal business name and entity type are confirmed.
- Do not claim same-day delivery, fast delivery, a Utah-wide service area, or surrounding-area coverage until operations approves the exact promise and geography.
- Do not treat promotional taglines, testimonials, guarantees, license claims, or insurance claims as confirmed facts.

## 2. Brand character

The brand should feel:

- Rugged, practical, and capable.
- Local and outdoors-oriented without looking recreational or rustic-luxury.
- Direct, honest, and easy to understand.
- Dependable and operationally disciplined.
- Bold enough for trucks and job sites, but polished enough for payments and signed agreements.

The visual shorthand is **industrial utility meets Utah outdoors**: black equipment, forest silhouettes, olive green, high-contrast type, light concrete-like surfaces, and structured information panels.

### Desired impression

Customers should immediately understand what Barnes does, what action to take, and why the business is trustworthy. The interface should feel strong and established, not flashy, delicate, playful, or overly technical.

## 3. Logo and brand mark

The approved core mark is the black elk silhouette containing a pine-forest cutout.

### Approved treatments

- Black mark on white, fog, or light gray.
- White mark on black, charcoal, or dark photographic backgrounds.
- One-color olive treatment only when contrast is sufficient and the mark remains recognizable.
- Brand name set separately beside or beneath the mark for responsive flexibility.

### Clear space and sizing

- Maintain clear space around the mark equal to at least 12% of its rendered width.
- Do not render the mark below `64px` wide in normal website headers.
- At small sizes, use the mark without small supporting text.
- Preserve the original aspect ratio.

### Prohibited logo treatments

- No stretching, skewing, rotating, outlining, or redrawing.
- No gradients inside the mark.
- No drop shadow that reduces the clean silhouette.
- No placement over busy imagery without a solid or gradient contrast treatment.
- No combining the mark with an unconfirmed legal suffix.

## 4. Color system

The site uses a monochrome foundation with an olive-green service accent. The green must feel natural and utilitarian rather than bright, neon, or blue-green.

| Token | Value | Required use |
| --- | --- | --- |
| `--color-black` | `#0B0C0A` | Primary dark background, major display text, footer |
| `--color-charcoal` | `#191B18` | Raised dark surfaces and dark secondary sections |
| `--color-olive` | `#4E6A2A` | Primary brand accent, buttons, headings, active states |
| `--color-olive-dark` | `#33481B` | Hover states, dark green bands, small text on light surfaces |
| `--color-olive-light` | `#7E9552` | Decorative fills, icons, subtle highlights; not small text on white |
| `--color-paper` | `#F7F7F4` | Main light page background |
| `--color-fog` | `#ECEDE9` | Alternate sections and table rows |
| `--color-white` | `#FFFFFF` | Cards, inverse text, clean content areas |
| `--color-line` | `#C9CDC5` | Borders, dividers, table rules |
| `--color-muted` | `#62675F` | Secondary text on light backgrounds |
| `--color-danger` | `#A33A32` | Errors and destructive warnings only |
| `--color-success` | `#3F672B` | Confirmed success states |

### Color rules

- Black, white, and fog provide most of the surface area.
- Olive is the only primary brand accent.
- Use olive for meaning and emphasis, not as a wash across every element.
- Gold, orange, bright blue, purple, and teal are not brand colors.
- Facebook blue and other third-party colors may appear only inside recognizable third-party marks.
- Text and essential controls must meet WCAG 2.2 AA contrast.
- Never communicate status through color alone.

## 5. Typography

The reference uses heavy, condensed, all-caps display lettering paired with a clean condensed sans serif. The web implementation standardizes that character with accessible, licensed web fonts.

### Required font families

| Role | Family | Weights | Fallback |
| --- | --- | --- | --- |
| Primary display | **Anton** | 400 | `Impact, Haettenschweiler, sans-serif` |
| Headings, labels, navigation, prices | **Barlow Condensed** | 600, 700, 800 | `Arial Narrow, sans-serif` |
| Body, forms, agreements, help text | **Barlow** | 400, 500, 600, 700 | `Arial, Helvetica, sans-serif` |
| Technical identifiers | **Geist Mono** | 400, 500 | `ui-monospace, monospace` |

Use `next/font/google` so production pages self-host the font files through Next.js. Do not load fonts through a render-blocking stylesheet.

### Type scale

| Token | Size | Line height | Typical use |
| --- | --- | --- | --- |
| `--text-hero` | `clamp(3.75rem, 10vw, 8.5rem)` | `0.88` | Two-line hero statement |
| `--text-display` | `clamp(2.75rem, 7vw, 5.75rem)` | `0.92` | Major campaign or service heading |
| `--text-h1` | `clamp(2.5rem, 5vw, 4.5rem)` | `0.98` | Page title |
| `--text-h2` | `clamp(2rem, 4vw, 3.25rem)` | `1.0` | Section heading |
| `--text-h3` | `clamp(1.4rem, 2vw, 2rem)` | `1.08` | Card or subsection heading |
| `--text-lead` | `clamp(1.125rem, 2vw, 1.375rem)` | `1.45` | Introductory text |
| `--text-body` | `1rem` | `1.6` | General content and forms |
| `--text-small` | `0.875rem` | `1.45` | Supporting copy and metadata |
| `--text-label` | `0.8125rem` | `1.2` | Eyebrows, table headers, field labels |

### Typography rules

- Anton is for short display statements only, normally uppercase.
- Never use Anton for paragraphs, forms, policies, or accessibility instructions.
- Barlow Condensed carries headings, prices, navigation, buttons, and compact operational labels.
- Barlow carries all reading-intensive content.
- Hero and display headings may use tight tracking from `-0.03em` to `-0.01em`.
- Uppercase labels use tracking from `0.04em` to `0.08em`.
- Do not set long sentences or paragraphs in all caps.
- Use tabular numerals for prices, dates, weights, totals, and dashboard metrics.
- Keep body-copy measure between approximately `45ch` and `72ch`.

## 6. Texture and environmental imagery

Texture is part of the brand, but it must remain subtle and must never reduce usability.

### Approved texture

- Fine monochrome grain resembling printed paper, powder coat, or concrete.
- Distressed speckling inside very large display type at low opacity.
- Soft fog, distant mountains, and evergreen silhouettes as section transitions.
- Black powder-coated dumpster surfaces and real worksite details.
- Dry-brush edges for occasional campaign banners or CTA accents.

### Texture limits

- Grain opacity: `1%` to `4%` on light surfaces; maximum `6%` on large dark display areas.
- Keep forms, tables, policy text, and checkout surfaces texture-free.
- Decorative overlays use `pointer-events: none` and must not affect focus states.
- Never place detailed body copy directly over forest silhouettes or busy photographs.
- Avoid faux wood, camouflage, leather, western motifs, neon effects, and glossy automotive gradients.

## 7. Layout and composition

The visual rhythm comes from bold horizontal bands, oversized headings, structured comparison panels, and strong black-to-light contrast.

### Page structure

1. Utility/contact bar where appropriate.
2. Main navigation with the elk mark and one dominant CTA.
3. High-impact hero with a short headline and clear service action.
4. Trust strip using three concise benefits with icons.
5. Service or pricing section with structured cards or comparison rows.
6. Restrictions, process, FAQs, and supporting proof.
7. Strong call/contact band.
8. Dark footer with contact, service links, and policies.

### Grid

- Maximum content width: `80rem`.
- Horizontal page gutter: `clamp(1rem, 4vw, 3rem)`.
- Use a 12-column desktop grid, 6-column tablet grid, and single-column mobile flow.
- Standard section spacing: `clamp(4rem, 8vw, 7rem)`.
- Dense tables and operational screens may use smaller spacing while retaining clear grouping.

### Shape language

- Cards use a restrained `0.75rem` to `1rem` radius.
- Inputs and buttons use `0.375rem` to `0.625rem` radii.
- Do not use bubbly pill-shaped cards or excessive rounded containers.
- Use firm rules, dividers, dark bands, and square-edged image framing to reinforce the industrial tone.
- Shadows are soft and low-opacity; borders do most of the structural work.

## 8. Core component language

### Header and navigation

- Light or black background with high contrast.
- Logo at left; service links centered or right; primary action at far right.
- Public navigation must include clear paths to services, dumpster rentals, hauling, FAQs, contact, and customer sign-in when available.
- On mobile, preserve a persistent call or quote action without covering content.

### Buttons

- Primary: olive background, white bold condensed label.
- Primary hover: olive-dark background with a visible non-color change such as lift or border.
- Secondary light: transparent or white with black border and black label.
- Secondary dark: transparent with white border and white label.
- Minimum interactive target: `44px × 44px`.
- Use action labels such as `Get a Quote`, `Check Availability`, `Call 385-246-4219`, and `Continue to Payment`.
- Never use brush texture as the only button boundary.

### Service and pricing cards

- Put size or service name first, then best use, included limits, price state, and action.
- Use a white or fog card with black type, olive headers, and clear rule lines.
- Make confirmed prices visually prominent using Barlow Condensed.
- Display `Contact for current rate` or `Request a quote` for quote-required items; never show `$0`.
- Restrictions must sit near the relevant offering, not only in fine print.

### Trust strip

- Three concise items work best on desktop; stack them on mobile.
- Use simple olive line or solid icons: clock, handshake/service, shield/check, scale, calendar, location.
- Keep claims factual and operationally approved.

### Forms and booking

- Forms use clean white surfaces with minimal texture around them.
- Labels remain visible above fields; placeholders are examples, not labels.
- Group the flow into clear steps with an explicit progress indicator.
- Show price inclusions, restrictions, consent, and next steps before commitment.
- Error messages use plain language and appear adjacent to the relevant field.

### Tables

- Use olive or black header rows with white uppercase Barlow Condensed labels.
- Use alternating white and fog rows only when it improves scanning.
- On small screens, convert comparison tables into stacked cards; do not force horizontal reading of critical content.

### Agreements and policies

- Use the body font on an untextured white or paper surface.
- Maintain a readable line length and visible heading hierarchy.
- Do not use distressed display text inside contractual content.
- Keep acceptance controls, document version, effective date, and download action clear.

### Operations interface

- Retain the palette and heading family but reduce promotional texture.
- Prioritize dense, calm, scannable data presentation.
- Use status text plus icon or shape; never rely on color alone.
- Keep irreversible or financial actions visually distinct and confirmation-gated.

## 9. Photography and illustration

Prefer real, permission-cleared images of:

- Actual Barnes dumpsters and hauling equipment.
- Clean placement at real residential or commercial sites.
- Delivery, pickup, loading, and safe work practices.
- Utah foothills, mountains, and evergreen landscapes used as quiet context.
- Before-and-after work only with customer approval and accurate representation.

Image treatment should be high contrast, slightly cool or neutral, and grounded. Black equipment should retain detail rather than becoming a featureless silhouette.

Do not fabricate job photos, employees, customers, reviews, licenses, or equipment inventory. AI-generated images may be used only as clearly approved decorative concepts, never as evidence of completed work or owned equipment.

## 10. Iconography

- Use one consistent icon family.
- Prefer geometric line icons with `2px` to `2.5px` strokes or bold simple solids.
- Use round icon containers sparingly, primarily in trust strips and process steps.
- Icons support text and never replace an essential label.
- Do not mix cartoon, photorealistic, hand-drawn, and thin-line icon styles.

## 11. Motion and interaction

- Motion should feel quick, solid, and functional.
- Standard duration: `140ms` to `220ms`.
- Use opacity, small vertical movement, and restrained scale changes.
- Avoid parallax that interferes with reading, long cinematic transitions, bouncing controls, and constant decorative motion.
- Honor `prefers-reduced-motion` and leave all functionality intact without animation.

## 12. Responsive behavior

Design mobile-first. Every customer task must work from a `320px` viewport upward.

| Range | Layout behavior |
| --- | --- |
| `< 30rem` | Single-column layout, stacked actions, compact logo, card-based pricing |
| `30rem–47.99rem` | Single column with wider cards and paired minor actions where space permits |
| `48rem–63.99rem` | Two-column sections and expanded navigation patterns |
| `64rem–79.99rem` | Full desktop grid and comparison layouts |
| `≥ 80rem` | Constrained content width; do not stretch reading areas indefinitely |

Large display typography must scale with `clamp()` and must not create horizontal overflow. Preserve the headline hierarchy on mobile rather than shrinking everything to body size.

## 13. Accessibility and performance requirements

- Target WCAG 2.2 AA.
- Preserve keyboard navigation and obvious focus indicators.
- Use semantic headings in logical order.
- Provide alternative text for meaningful images and empty alternative text for decoration.
- Do not embed important information only inside promotional images.
- Maintain `44px` minimum targets for primary touch controls.
- Use responsive images and modern formats.
- Keep decorative grain and silhouettes lightweight; prefer CSS or optimized local assets.
- Avoid autoplay media and layout shifts.
- Test zoom at 200%, reduced motion, high-contrast modes, and screen-reader names.

## 14. Voice paired with the design

Visual strength must be matched by plain, honest language.

- Lead with the service and next action.
- Prefer short sentences and concrete terms.
- State what is included and excluded.
- Avoid exaggerated claims, macho language, fear tactics, and vague superlatives.
- Use `Dependable service`, `Clear pricing`, and similar phrases only as positioning—not as unsupported guarantees.
- Explain quote-required pricing directly.

## 15. Anti-patterns

Do not introduce:

- Generic blue SaaS styling.
- Bright green or neon environmental branding.
- Beige luxury branding or delicate serif-led layouts.
- Excessive gradients, glassmorphism, glowing controls, or 3D chrome.
- Large areas of decorative texture behind functional content.
- Oversized rounded pills on every component.
- Multiple competing accent colors.
- Thin, low-contrast type over photography.
- Dense desktop tables simply scaled down on mobile.
- Marketing claims sourced from the flyer rather than approved business data.

## 16. Implementation tokens

Use these semantic aliases in the SCSS token layer:

```scss
:root {
  --color-ink: #0b0c0a;
  --color-text: #191b18;
  --color-text-muted: #62675f;
  --color-text-inverse: #ffffff;
  --color-brand: #4e6a2a;
  --color-brand-deep: #33481b;
  --color-brand-soft: #7e9552;
  --color-surface: #f7f7f4;
  --color-surface-muted: #ecede9;
  --color-surface-raised: #ffffff;
  --color-border: #c9cdc5;
  --color-focus: #7e9552;
  --color-danger: #a33a32;
  --color-success: #3f672b;

  --font-display: "Anton", Impact, Haettenschweiler, sans-serif;
  --font-heading: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-body: "Barlow", Arial, Helvetica, sans-serif;

  --radius-control: 0.5rem;
  --radius-card: 0.875rem;
  --container-width: 80rem;
  --container-gutter: clamp(1rem, 4vw, 3rem);
}
```

The implementation may add semantic tokens, but it must not change these foundation values without updating this document in the same reviewed change.

## 17. Design acceptance checklist

Before a public-facing UI change is complete, verify:

- [ ] Anton, Barlow Condensed, and Barlow are used according to their defined roles.
- [ ] The black, olive, fog, and white palette is dominant.
- [ ] Texture is subtle and absent from reading-intensive or transactional surfaces.
- [ ] The elk-and-forest mark has adequate space and contrast.
- [ ] Pricing and contact content comes from approved data, not the reference flyer.
- [ ] Quote-required services never display a zero or invented price.
- [ ] Buttons and form controls meet minimum touch-target requirements.
- [ ] Mobile layouts convert tables to usable stacked content.
- [ ] Focus, keyboard, reduced-motion, zoom, and contrast behavior are verified.
- [ ] Claims, service areas, availability, and legal identity are confirmed before publication.
- [ ] Lint, typecheck, build, and responsive visual checks pass.
