# PR UI/UX QA Checklist — Stjarna

> Use this checklist **on every PR** that touches UI (widget or dashboard). Copy/paste into the PR description and tick each box.

---

## 1) Accessibility (must‑pass)

* [ ] Keyboard: I can complete the core flow **without a mouse** (open → interact → close).
* [ ] Focus: visible focus ring on **every** interactive control; focus trapped in modal; `Esc` closes.
* [ ] Labels: inputs/buttons/links have clear text or `aria-label`; assistant replies use `aria-live="polite"`.
* [ ] Contrast: body text ≥ **4.5:1**; large text ≥ **3:1**; checked with DevTools.
* [ ] Hit targets: primary actions ≥ **44×44px** on mobile.

## 2) Performance

* [ ] Lighthouse (mobile) ≥ **90** on the changed page(s) or widget demo.
* [ ] No layout shift (CLS ≈ 0). Skeletons used for async lists.
* [ ] Widget JS ≤ **35KB gz**; dashboard page ≤ **150KB gz** first load (excl. fonts).

## 3) Responsiveness

* [ ] Looks correct at **360×640**, **768×1024**, **1280×800** viewports.
* [ ] No horizontal scrollbars; cards wrap cleanly.

## 4) Visual & Tokens

* [ ] Uses **Playbook tokens** (spacing, radii, colors, shadows) — no ad‑hoc magic numbers.
* [ ] Consistent icon size/padding; card borders = subtle (1px) and rounded.

## 5) Interaction States

* [ ] Loading spinners where needed; skeletons for lists.
* [ ] Errors are **inline & recoverable**; no alerts; toasts auto‑dismiss in 3s for non‑critical.
* [ ] Disabled states show intent (opacity/cursor) but remain readable.

## 6) Copy & Formatting

* [ ] Plain, friendly copy; no lorem ipsum.
* [ ] Prices always include currency, e.g., `SEK 119.00`.
* [ ] Empty states suggest next actions (e.g., "Try 'vegan' or 'gluten‑free'").

## 7) Telemetry (if applicable)

* [ ] Fires events: `widget_open`, `add_to_cart`, `checkout_start` (and `order_paid` if webhook present).
* [ ] No PII sent to analytics. EU‑hosted Plausible only.

## 8) Security & Privacy

* [ ] No secrets in client bundle; inspected with search/CI.
* [ ] No diner PII collected; only non‑sensitive usage events.

---

## Widget‑specific Acceptance

* [ ] FAB opens modal; **chat left / suggestions+cart right** on desktop; stacks on mobile.
* [ ] Suggestion card: **name, price, desc (2 lines), chips, Add**; quantity stepper after add.
* [ ] **Dine‑in** returns & displays an **order code**; **Pickup** opens Stripe Checkout.
* [ ] Closed banner shows when `/api/public/status` returns `{ open:false }` (pickup hidden or disabled).

## Dashboard‑specific Acceptance

* [ ] **Menu:** sections list + items table; create/edit item modal; move item between sections.
* [ ] **Orders:** filter by status; search by code; KPI strip shows **Orders / Paid / GMV / AOV (7d)**.
* [ ] **Embed:** copy‑to‑clipboard snippet; live widget preview.
* [ ] **Settings:** opening hours editor validates structure before save.
* [ ] RLS verified: **viewer** cannot mutate; **editor** can.

---

## Manual Test Steps (tick all)

* [ ] Widget: open → ask "vegan options?" → add item → Dine‑in code → close (keyboard only).
* [ ] Pickup: start checkout; if webhook configured, complete test payment and see `paid` in orders.
* [ ] Dashboard/Menu: create item with `price_cents` and tags; move section; toggle availability.
* [ ] Dashboard/Orders: find order by code; (temp) "Mark paid" works.

---

## Reviewer Notes

* Risks / regressions considered:
* Screenshots / Lighthouse summaries attached:
* Out of scope follow‑ups (if any):
