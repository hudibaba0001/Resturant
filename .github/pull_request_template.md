## Summary
Describe the change and the user value (why this helps a restaurant go live faster).

## Checklist (MVP guardrails)
- [ ] No new third‑party deps outside allowlist in `.cursorrules`
- [ ] All server handlers validate input with **Zod**
- [ ] **No secrets** in repo or client bundle (service role, Stripe keys, webhook secrets)
- [ ] **RLS** policies exist for any new table and follow `has_restaurant_permission()`
- [ ] EU‑only: no code that sends data outside EU; Supabase project is in EU
- [ ] Stripe webhook idempotency respected; only store Stripe IDs, not card data
- [ ] Public APIs only expose non‑sensitive fields
- [ ] Accepts: build passes locally (`npm run build`), widget loads, `/api/chat` (Edge), `/api/orders` + `/api/stripe/webhook` (Node)

## UI/UX QA (must pass)
- [ ] I completed the steps in docs/ui-ux-pr-checklist.md and attached Lighthouse (mobile) results.
- [ ] Keyboard-only flow verified; focus rings visible; contrast meets spec.
- [ ] No secrets in bundle; events fire; screenshots attached.

[Link to full checklist](../docs/ui-ux-pr-checklist.md)

## Screenshots / Proof
Add terminal output, cURL examples, or GIF.

## Migration Notes
- [ ] Includes SQL migration(s) if schema changed
- [ ] Backfill/compat handled (if applicable)
