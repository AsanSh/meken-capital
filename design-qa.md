# Design QA — Meken Capital

Date: 2026-09-03

final result: passed

## Comparison target and evidence

- Source visual truth: `/Users/asans/Desktop/meken-capital/docs/design/selected-reference.png` (selected merged City with Proof design).
- Implementation: `http://127.0.0.1:4173/index.html`.
- Source pixels: 1254×1254. Implementation CSS viewport and screenshot: 1254×1254, effective screenshot density 1. No density normalization required.
- State: Russian, dark theme, city phase 50%, September demo selected, dialog closed, top of page, entrance finished.
- First implementation: `docs/design/screenshots/desktop-v1.png`.
- Revised implementation: `docs/design/screenshots/desktop-v2.png`.
- Full-view evidence: source and each implementation image were opened together in the same model-visible comparison tool output, not inferred from code or file names.
- Focused crops not required: both images were available at 1254px, and heading wrapping, small chart labels, numerical values, navigation and CTA could be inspected directly. Additional mobile close-scale captures verify labels and controls.
- Other evidence: `docs/design/screenshots/mobile-home.png`, `mobile-metrics.png`, `mobile-invite.png`, `tablet-home.png`, `report-april.png`, `disclosure.png`.

## Findings and comparison history

### Pass 1 — blocked

- [P2, fixed] Hero copy and CTA sat lower than reference; copy used three lines instead of four. Lowered top padding from 155px minimum to 130px, corrected explicit copy breaks and tightened CTA gap.
- [P2, fixed] Proof section vertical rhythm pushed the final disclaimer beyond the reference view. Reduced chart height and gaps around chart/timeline/report actions; increased horizontal separation between chart and metrics to better match the target.
- [P2, fixed] Desktop navigation was right-biased instead of centred. Restored automatic margins on both sides.

### Pass 2 — passed

Compared `desktop-v2.png` with the exact source image after all visual fixes. Header alignment, headline and body hierarchy, hero-to-proof boundary, open data layout, graph and metric group now preserve the selected visual character. Full-width raster city artwork is a separately generated matching scene, not the source screenshot baked into the page.

No remaining actionable P0/P1/P2 findings in the implemented scope.

## Required fidelity surfaces

- Fonts / typography: Inter 400 with restrained 500 UI weights reproduces the modern grotesk direction. Large two-line headline and four-line introduction retained on desktop. Small data captions remain secondary; metrics use tabular figures. Narrow 320px heading wraps intentionally without overflow.
- Spacing / layout: hero ends around the same 760px region at source width. Reference chart-left / metrics-right arrangement retained; mobile stacks chart above metrics. Margins scale from 24px to 64px. No nested-card dashboard substituted.
- Colors / tokens: graphite #080b0d, chartreuse #c1f900, white and cool-muted greys match selected direction. Forms, links, focus, errors and disabled controls use dark-compatible colors. Lime primary buttons use dark text.
- Image quality: generated built-city and blueprint WebPs have matching camera/framing, crisp architecture, dark left negative space and mountain horizon. Native range reveals real image layers; no handcrafted illustration or screenshot-as-UI. Phosphor icon is the real library asset. Graph is data-driven Chart.js, not decorative artwork.
- Copy / content: hero and proof copy match the selected intent. Added explicit demo disclaimers, native controls and pause action. Metrics have no claimed financial performance. Extra approach and contact sections complete the journey without adding routes.

## Interaction and responsive checks

- City: Idea sets 0%, complete object sets 100%, ArrowRight increments native range by 1; pressed-state labels follow phase. Pause toggles movement off. Code respects prefers-reduced-motion; OS-level emulation was not performed.
- Month picker: all six months checked in browser; progress values 8/18/32/46/57/68, completed stages 1/2/4/5/7/8 and report counts 1/1/2/2/3/4 match the data source and period summary.
- Report: April opens April title, date, 8%, 1/12 stages and next-step content. Escape closes and returns focus to open-report button. Download action invoked without console errors; generated content is local text, not externally fetched evidence. Downloaded file contents were not independently opened from the browser's download store.
- Form: empty submission raises required-fields message; filled synthetic contact details plus four consents prepare mailto draft; removing a consent hides stale draft. No email sent or external contact made.
- Mobile menu opens and closes with Escape; anchor navigation scrolls to proof section.
- Widths 320, 390 and 768 checked for document overflow: scrollWidth equals innerWidth. Mobile 390 hero, metrics and invitation form visually inspected. Tablet 768 hero visually inspected. Desktop 1254 source comparison and 1440 disclosure page inspected.
- Browser error logs checked: empty on home and disclosure checks.
- Automated `node --test tests/site.test.mjs`: 4/4 passing (frozen coherent demo dataset, initial values, all local HTML links/assets/fragments, first-party script syntax).
- `git diff --check`: passed.

## Accepted scope differences and follow-up polish

- [P3] City is a generated two-layer visual reveal with restrained scroll motion, not geometric WebGL construction. This keeps the existing static HTML project lightweight.
- [P3] Header/CTA pixel dimensions and exact architectural geometry differ slightly from image mock; hierarchy and visual identity are preserved.
- New cinematic journey is Russian homepage only. Inner pages and English homepage received shared tokens, typography and palette, not independent cinematic redesigns.
- No claim of backend/authentication, real metrics, legal launch readiness or publication. Existing legal/company content requires owner verification before public release.

## Implementation checklist

- [x] Selected visual direction implemented in existing project.
- [x] All hero assets present locally; licenses retained for vendor resources.
- [x] Core navigation, stateful demo and invitation workflow tested.
- [x] P2 visual findings fixed and re-compared.
- [x] Local preview retained for user; no GitHub push or deployment performed.
