# Revenue ledger and invoices — API and UI contract

Backend: `backend/routes/revenueRoutes.js` → `backend/controllers/revenueController.js`; ledger rules in
`backend/utils/ledger.js`; models `LedgerEntry`, `Invoice`, `InvoiceCounter`, `RevenueSettings`.
Verified end to end by 66 API checks (plus the sponsorship and ads suites still passing).

**Money in this module is in paisa** (integers, 1 NPR = 100 paisa; every field ends in `Paisa`). Format with
`(paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })`. Inputs (`amount`, `unitPrice`) are sent
in **NPR** and may have two decimals. Sponsorship and ads elsewhere stay in whole NPR.

## Who can do what

| Actor | How | Can |
| --- | --- | --- |
| Finance | permission `canManageRevenue` (Finance Team template; SUPER_ADMIN) | everything below: billing profile, invoices, payments, ledger, full summary |
| Summary viewers | any of `canManageSponsorFinance`, `canManageSponsorships`, `canManageAds`, `canReviewAds` | `GET /summary` with `access: 'SUMMARY'` (no `bySource`, no `vat`) |
| Sponsor | member of the billed SponsorAccount | their issued invoices (never drafts): list, view, print |

## Concepts (show these words in the UI)

- **Ledger stages** — each money event is its own row: `CONTRACTED` (deal agreed / ad approved; the difference is
  posted whenever the value changes), `INVOICED` (invoice issued, net of VAT), `RECEIVED` (money in the bank),
  `SPENT` (costs of revenue work). **Projected** is not stored: it is the open pipeline (proposals under discussion,
  ads waiting for review). Never add stages together.
- Rows are never edited. A correction is a **reversal** row (negative amount, `reversalOf` set; the original gets
  `reversed: true`). Show reversals in muted text with "Reversal" and the note.
- **Sources**: `SPONSORSHIP ADVERTISING MEDIA_PRODUCTION CSR MERCHANDISE OTHER`. Donations are not here (they have their
  own ledger); in-kind sponsorship is never cash. Show the server's `notes[]` under the dashboard.
- **VAT**: only when the billing profile has `vatRegistered: true` (needs a PAN). Then invoices are `kind: TAX_INVOICE`
  with `vatRate` (13% default) on top of the subtotal; otherwise `kind: INVOICE` with no VAT. Deal and ad amounts are
  treated as before VAT. Show a small "VAT treatment to be confirmed by your accountant" hint in the billing profile.

## Invoices

`status`: `DRAFT → ISSUED → PARTIALLY_PAID → PAID`; `ISSUED` without payments `→ VOID`. Overdue = `overdue: true`
(computed: open and past `dueDate`). Each invoice bills one subject: `subjectType` `SPONSORSHIP_DEAL` (`deal`),
`AD_CAMPAIGN` (`adCampaign`) or `OTHER` (with `source` one of `MEDIA_PRODUCTION CSR MERCHANDISE OTHER`).
`number` (e.g. `HM-2083/84-0001`, prefix + Nepali fiscal year + sequence) is `null` until issued — show "Draft" instead.
Issued invoices are locked; mistakes are fixed by voiding (reason required) and issuing a new one. A voided invoice
keeps its number. A deal or campaign can never be invoiced for more than its contracted value (the error message says
how much is left — show it).

Invoice response: `{ _id, number, fiscalYear, status, kind, sponsorAccount{_id,name,type}, subjectType, source,
deal{_id,stage,cashAmount,opportunity}, adCampaign{_id,title,status,pricingModel}, lines[{description, quantity,
unitPricePaisa, amountPaisa}], subtotalPaisa, vatRate, vatPaisa, totalPaisa, paidPaisa, balancePaisa, overdue,
issueDate, dueDate, notes, seller{name,pan,vatRegistered,address,email,phone}, billTo{…same}, paymentInstructions,
footerNote, payments[{_id, amountPaisa, method, reference, receivedAt, note?, recordedBy?{name}}], voidReason,
viewer{isFinance, sponsorRole}, billing?{contractedPaisa, invoicedPaisa, remainingPaisa} (finance, subject invoices) }`.
Payment `method`: `BANK_TRANSFER CONNECTIPS KHALTI ESEWA CHEQUE CASH OTHER` (reference required unless CASH).

**Printable invoice**: build a print view from the invoice JSON (no server PDF). Show seller block (name, PAN, address),
"TAX INVOICE" or "INVOICE", number, issue and due dates, bill-to block (name, PAN, address), lines table, subtotal,
VAT line (only for tax invoices), total, paid / balance, payment instructions, footer note, and a clear "VOID" mark
for void invoices. Web: a print-friendly route with `@media print` CSS and a "Print / Save as PDF" button. App: show
the same layout; offer Share (text summary) — no PDF library needed.

## Endpoints (prefix `/api/revenue`)

Finance (`canManageRevenue`)
- `GET /settings` · `PUT /settings` `{ sellerName, sellerPan, sellerAddress, sellerEmail, sellerPhone, vatRegistered, vatRate, invoicePrefix, fiscalYearStart:'MM-DD' (1 Shrawan, default 07-17), defaultDueDays, paymentInstructions, footerNote }`. Issuing needs name + address.
- `GET /billables?sponsorAccount=<id>` → `{ deals:[{_id,title,tier,stage,contractedPaisa,invoicedPaisa,remainingPaisa}], adCampaigns:[{_id,title,status,pricingModel,…same}] }` — use it in the "new invoice" form to pick the subject and prefill one line with the remaining amount.
- `POST /invoices` `{ sponsorAccount, subjectType, deal?|adCampaign?, source? (OTHER only), lines:[{description, quantity, unitPrice}], dueDate?, notes? }` → DRAFT (totals computed by the server with the current VAT setting).
- `PUT /invoices/:id` (drafts) `{ lines?, dueDate?, notes?, source? }` · `DELETE /invoices/:id` (drafts; 409 otherwise → offer Void)
- `POST /invoices/:id/issue` `{ issueDate? }` · `POST /invoices/:id/void` `{ reason }` (409 when it has payments)
- `POST /invoices/:id/payments` `{ amount, method, reference, receivedAt, note }` (≤ balance) · `DELETE /invoices/:id/payments/:pid?reason=` (reason required)
- `GET /invoices?status=A,B&sponsorAccount=&fiscalYear=&deal=&adCampaign=&overdue=true`
- `GET /ledger?from=YYYY-MM-DD&to=&source=A,B&stage=A,B&sponsorAccount=` (newest first, max 1000; `&format=csv` downloads — fetch with auth → blob)
  rows: `{ _id, date, source, stage, amountPaisa, vatPaisa, description, sponsorAccount{name}, invoice{number}, deal, adCampaign, method, reference, origin: SYSTEM|MANUAL, reversalOf, reversed, note, createdBy{name} }`
- `POST /ledger` `{ date, source, stage: 'RECEIVED'|'SPENT', amount, description, sponsorAccount?, method, reference, note }` — for other income and costs. Sponsorship/advertising *receipts* are refused (record them on the deal or invoice).
- `DELETE /ledger/:id?reason=` — reverses a MANUAL row (system rows follow their deal/campaign/invoice).

Summary (finance full; summary viewers totals only)
- `GET /summary?from=&to=` (default: current fiscal year) → `{ range{from,to,fiscalYear}, byStage{CONTRACTED,INVOICED,RECEIVED,SPENT}, netPaisa (received − spent), bySource?{SOURCE:{…stages}}, vat?{invoicedPaisa,receivedPaisa,registered,rate}, receivables{outstandingPaisa,overduePaisa,overdueCount,openCount}, projected{sponsorshipPaisa,advertisingPaisa,openDeals,adsInReview}, uninvoicedPaisa, months:[{month:'YYYY-MM',CONTRACTED,INVOICED,RECEIVED,SPENT}] (12), access:'FULL'|'SUMMARY', notes[] }`

Sponsors
- `GET /invoices/mine` → issued/paid/void invoices of my accounts · `GET /invoices/:id` (404 for drafts / other accounts)

## Changes to existing flows

- Sponsorship deal payments (`POST /api/sponsorship/deals/:id/payments`) now also post a RECEIVED ledger row, but return
  **409** while the deal has an open invoice ("record it on the invoice") — show that message with a link to the invoice
  (`invoice` id is in the response). Payments made on a deal invoice appear in the deal's payment list with an
  `invoice` id; deleting those from the deal returns 409 — link to the invoice instead.
- A deal with issued invoices cannot leave the agreed stages (cancel / back to negotiation → 409 listing the invoice
  numbers: void them first) and its `cashAmount` cannot go below what was already invoiced (409).
- `GET /api/sponsorship/admin/accounts` is also open to `canManageRevenue` (to pick who to bill).
- Notifications: type `BILLING`, link `/sponsor/invoices/:id`.

## UI placement

Web: admin tab `revenue` (dashboard: stage cards, receivables, projected, 12-month chart received vs spent, by-source
table, VAT box, notes) visible with any of the summary permissions; tabs `invoices` (list + filters + new/edit drawer +
detail with payments, issue, void) and `ledger` (filterable table, CSV, add manual entry, reverse) and a "Billing
profile" section, for `canManageRevenue`. A "Revenue" nav group. Print route for invoices (e.g. `/invoices/:id/print`,
works for finance and for the sponsor). Sponsor portal: "Invoices" list `/sponsor/invoices` and detail
`/sponsor/invoices/:id` with print. Deal drawer (finance): show the deal's invoices and a "Create invoice" shortcut.
App: the same as admin sections `revenue`, `invoices`, `ledger` + sponsor screens `/sponsor/invoices`, `/sponsor/invoices/[id]`.
