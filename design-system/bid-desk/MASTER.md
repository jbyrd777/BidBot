# Bid Desk design system (master)

Source of truth for every screen. Page rules in `pages/` override this file.
Built with the `ui-ux-pro-max` and `redesign-existing-projects` skills, in the visual direction of the reference finance dashboard Jesse picked: light canvas, white rounded cards, big numbers, one fresh green accent.

## Product read

- Product type: B2B operations dashboard for commercial flooring subcontractors
- Users: estimators, sales and owners triaging invitations to bid at a desk, sometimes on a phone
- Dials: variance 4, motion 3, density 7

## Color (one accent, one cool gray family)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| paper | #ECEEF1 | #0E1013 | Page canvas |
| panel | #FFFFFF | #181B1F | Cards |
| sunk | #F3F5F7 | #21252A | Inner tiles, inputs, chips |
| ink | #15181C | #EEF1F4 | Text, primary buttons, active nav |
| ink-soft | #69717B | #9AA2AB | Secondary text |
| rule | #E3E6EA | #2B3036 | Dividers |
| lime | #B4DC5F | #B4DC5F | The only accent: lead card, likely bid, working status |
| lime-deep | #4F7413 | #C7E88A | Outline for "needs a look", focus ring |
| lime-wash | #EEF7DC | #26301A | Fill behind "needs a look" |
| stop | #B8432F | #F0937F | Past due text only |

Bid Desk's read is carried by fill and pattern, not hue alone: solid lime is a likely bid, a lime outline needs a look, gray hatching is a likely pass.

## Type

- Display and numbers: Outfit (variable), semibold, tight tracking, balanced wraps
- Body: Work Sans (variable)
- Tabular figures everywhere
- Sentence case for every heading and label. No all caps labels.

## Shape

- Radius steps: container 20, tile 12, control 10, chip 6, swatch 3
- GC marks are squircles, never circles
- Status tags are square edged with a swatch, not pills
- No borders on cards; depth comes from canvas versus panel

## Layout

- Top navigation, no sidebar (two destinations do not earn a rail)
- Max width 1360, 24px gutters on desktop, 12px on phone
- Bid board: an asymmetric stat row (lime lead card plus three compact stats), the three week due chart, then the invitation list
- Lists are rows inside one card, not a grid of equal cards

## Interaction

- Every link and button: 160 to 200ms transition, scale 0.98 on press
- Visible focus ring in lime-deep
- Reduced motion turns off the chart grow in and smooth scroll
- Loading skeleton matches the board layout; empty and not found states tell the person what to do next

## Do not

- Add a second accent color
- Use circles for avatars or pill badges for status
- Put three equal cards in a row
- Use color alone to show a bid's status
