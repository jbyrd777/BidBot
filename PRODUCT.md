# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Estimating lead** at a commercial flooring subcontractor: triages every invitation to bid at a desk and makes the bid or no bid call.
- **Sales and pricing**: owns the price and the GC relationship; checks what is coming due and what the team is bidding.
- **Owner**: glances at the board on a phone between job sites.

## Product Purpose

Bid Desk is a team of bots that runs a flooring subcontractor's bid desk. It reads every invitation to bid from every platform and inbox, pulls out the facts, screens each one against the company's rules, and puts it in front of a person to decide. Later bots cover scope, takeoff coordination with the company's own estimators, vendor RFQs, proposals, GC follow up and submittals. Success is no missed invitation, faster bid or no bid calls, and consistent follow up that wins more work.

## Positioning

A standalone product for any commercial flooring subcontractor. It is not tied to an outside estimating service: estimating comes from each company's own team. Open decision: the single claim a generic bid platform cannot copy has not been chosen yet. Candidates on the table are "built only for commercial flooring" and "one inbox from invitation to award".

## Operating Context

- Invitations arrive by email from BuildingConnected, ConstructConnect, Procore, direct GC emails, and forwarded job lists.
- The org chart is fixed: estimating produces quantities, sales owns price.
- Used at a desk for triage and on a phone in the field.

## Capabilities and Constraints

- Multi tenant: every company configures its own rules, roles and connectors; no custom code per client.
- White label per client: each company sees its own name, logo and color.
- No screen ever lets a bot or an estimator set a price.
- Every outbound step waits for a person until the company turns on auto send for that routine.
- No tool, product or AI names anywhere in the product or its output.
- Readable and usable on a phone.

## Evidence on Hand

- Twelve real invitations (sample fixtures in `src/lib/itb/__fixtures__/emails.ts`), with personal details replaced.
- No customers, testimonials, metrics or pricing exist yet; do not fabricate any.

## Product Principles

1. A person makes every call; bots prepare, recommend and chase.
2. Nothing slips: every invitation is read and every update lands on the bid it belongs to.
3. Flooring native: the vocabulary, scope and rules are a flooring subcontractor's own.
4. One product for every company, configured rather than customized.
