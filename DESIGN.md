# Bid Desk design system

Built from the reference dashboard shot the owner picked (finance dashboard, Dribbble 26816259). The reference wins on every visual question.

## Shell
Left sidebar on a near white frame: company name, Dashboard, Bids with its three views and an undecided count badge, Bot team, and a "Connect your inbox" card at the bottom. The app sits in a light gray rounded panel with a top bar: quick search on the left, an alert button and the user chip on the right. Below 1024px the sidebar becomes a row of tabs under the top bar.

## Surfaces
Flat white cards, 14px radius, no borders or shadows, on #ececec. Inner tiles and tracks use #f3f3f3. The one colored card is the lime gradient "Next due" card in the right rail.

## Color
Ink #141414, soft text #8a8a8a. Three status colors: lime #9fd04e (looks like a bid), yellow #f0e14a (needs a look), orange #f6a65c (likely pass). Every colored fill carries a fine diagonal white hatch, as in the reference. Inactive bars are flat gray #e6e6e6.

## Type
Plus Jakarta Sans, one family. Big numbers 26 to 34px bold with tight tracking; card titles 15px semibold; labels 11 to 12px soft gray. Dates use periods (11.04).

## Dashboard map (reference widget, Bid Desk meaning)
Balance chart: open bids due per day, likely bids and needs a look above the zero line, likely passes below it, one day in color with a tooltip, 7d and 14d switch.
Income, expenses, saved: invitations read, waiting on you, bidding.
Spending limit: weekly bid load against capacity, overflow in orange.
Tip card: the busiest close day and what to do about it.
Cost analysis: scope mix as a segmented bar with percentages.
Financial health gauge: service area fit.
Goal tracker: coming up, time used from invitation to due date.
Debit card and quick actions: next undecided bid with Bid, Pass, Plans, Email GC, Details.
Quick payment avatars: who sends the most invitations.
Transaction history: recent activity with each bid's call.

## Motion
One curve, cubic-bezier(0.32, 0.72, 0, 1), 180ms on press and hover. Bars grow in once on load. Nothing moves under reduced motion.
