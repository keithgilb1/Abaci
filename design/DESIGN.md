# Abaci design system

This is adapted from the "Fold" style reference Keith supplied on 2026-11-25 (in the project thread). Tokens are in `tokens.css`. In one line: **a Bauhaus poster on fog.** It's a bright, spacious, cool near-white workspace with deep navy ink, one electric-blue accent and poster-scale headlines.

## Fonts
GT Walsheim Pro and GT America are licensed, so **Inter** (400/500/600/700) substitutes for both. Use `tabular-nums` for every number in tables, KPIs and axes.

## Color roles
| Token | Hex | Use |
| --- | --- | --- |
| Midnight Navy | #20294c | All text, filled primary buttons, the main chart series. Never use pure black. |
| Cornflower Steel | #375390 | Borders, icon strokes (1.5px line icons), ghost button outlines |
| Electric Blue | #459af8 | Links, active nav, the ONE highlighted data point per chart. Never a large fill. |
| Fog White | #f0f1f5 | Page canvas |
| Pure White | #ffffff | Cards |
| Mist Gray | #dddfe9 | Nested surfaces, chart gridlines |
| Silver Lining | #c7cbdb | Hairline dividers, chart axes |
| Dusk | #676b89 | Secondary text, supporting sentences, chart labels |
| Smoke | #979db5 | Uppercase tag text, context series |
| Hyacinth | #788dba | Comparison series (e.g., Treasury), ghost borders |
| Voltage Yellow | #ffff00 | At most ONE callout card per page, used for the headline finding. Text on it is Abyss #042939. |

## Shape, space, elevation
- Only two radii: **12px cards**, **9999px pills** (buttons, tags, nav, slider thumbs). Panels/nav can use 24px.
- 8px base grid, 24px card padding, 48px between sections, max width 1200px.
- Cards are white on fog, with no border and the navy-tinted shadow `--shadow-xl`. Don't go deeper than three surface levels.
- The system is strictly flat: no gradients.

## Type
- Each page opens with ONE poster headline that states the finding, e.g., "Grade E loans lost money." Use 64–100px, weight 700, tight negative tracking, in Navy. Follow it with one 18px Dusk sentence.
- Use 24/32px weight 600 for card titles, 16–18px weight 400 for body text, and 10px uppercase +0.4px for tags and labels.
- Left-align body copy. Center only the hero.

## Components to build
- **Filled pill button:** Navy background, white 16/600 text, 16×12 padding, `--shadow-sm`.
- **Ghost pill button:** 1.5px Cornflower border and text, no fill.
- **KPI card:** a white card with a 10px uppercase Smoke label and a 32px/600 Navy number. The delta goes underneath in Dusk.
- **Category tag:** a Fog pill with a 10px uppercase Smoke label (e.g., GRADE C, 60 MO, DEBT CONSOLIDATION).
- **Sticky nav pill:** 24px radius on Fog with `--shadow-md`. Links are Navy, the active link is Electric Blue. Tabs: Overview · Pricing · Policy Lab · vs Treasury · Ask Abaci.
- **Voltage callout:** the single most important number on the page.
- **Lab controls:** pill-shaped sliders and segmented toggles. The thumb is Navy, the active track is Electric Blue.

## Charts
- Most series are achromatic: Navy for the main series, Hyacinth for the comparison and Smoke for context. Electric Blue is for the one point the title talks about.
- Losses may use the single warm color `--chart-loss`, and only for losses.
- Mist gridlines, Silver axes, Dusk 14px labels. Label lines directly instead of using legends where possible.
- Every chart title states the finding, not the topic.

## Imagery
No photography or decorative gradients. If any illustration is needed, use thin-line Cornflower icons.
