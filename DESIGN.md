# Bid Desk design system

## World
Apple style glass over a quiet daylight canvas. Content sits on solid white plates; glass is kept for the control layer only (island nav, segmented filters, the decision panel, the back pill), so it always means "you can act here".

## Materials
| Class | Use |
| --- | --- |
| `.bezel` | Outer frosted tray, 6px padding, 30px radius. Holds one plate. |
| `.core` | Solid white plate inside a bezel, 24px radius (concentric with the bezel). |
| `.core-lime` | The one lime plate per screen: the lead number. |
| `.glass` | Frosted control surface: blur 24px, saturate 180%, inner highlight. |
| `.lens` | The bright capsule that slides between segments on a spring. |
| `.ambient` | Fixed lime and sky color fields behind everything, so the glass has something to refract. |

## Tokens
Canvas #e9edf0, core #ffffff, sunk #f2f4f6, ink #12161a, ink soft #5f6872, lime #b6de5c, lime deep #47700d, lime wash #eef7da, stop #b23d2a. Radii: 30 shell, 24 core, 16 tile, 8 chip, full for every control. Dark mode redefines every token.

## Type
Geist variable, one family. Big numbers 40 to 56px semibold with tight tracking and tabular figures; headings 19 to 34px; body 14 to 15px; meta 12px. No all caps labels, no eyebrows.

## Meaning without color
A likely bid is solid lime, one that needs a look is a lime outline, a likely pass is gray hatching. Shape and texture carry the meaning, not hue alone.

## Icons
Phosphor, light weight, 16 to 18px, always `aria-hidden` next to a text label.

## Motion
One easing curve, `--ease-glide` cubic-bezier(0.32, 0.72, 0, 1), 200ms, no overshoot. The lens moves on a motion/react spring (stiffness 300, damping 30). Press feedback scales to 0.97. Never `transition: all`. Everything collapses to instant under reduced motion.

## Layout
Max width 1180px. First viewport on the board: island nav, then a bento row (lime lead plate plus three stat plates that each filter the list), then the three week due rail. Stat plates are links, never decoration. Mobile: brand and avatar on one row, nav and search on the next; stats sit three across; no horizontal page scroll at 390px.
