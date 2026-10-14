# Sponsorship module — API and UI contract

Backend: `backend/routes/sponsorshipRoutes.js` → `backend/controllers/sponsorshipController.js`
(models `SponsorAccount`, `SponsorshipOpportunity`, `SponsorshipTier`, `SponsorshipDeal`).
All amounts are **whole NPR integers**. All responses are `{ success, data | message }`;
errors carry a human-readable `message` to show in a toast. Verified end to end by 73 API checks.

## Who can do what (server-enforced; clients only hide UI)

| Actor | How it is determined |
| --- | --- |
| Sponsorship manager | permission `canManageSponsorships` (ADMIN preset, Campaign Manager template, SUPER_ADMIN) |
| Brand / media staff | `canManageBrandKits` (or manager) |
| Finance | `canManageSponsorFinance` (never in a preset; Finance Team template; SUPER_ADMIN) |
| Organizer | a USER listed in `opportunity.organizers` (per campaign) |
| Sponsor | member of a `SponsorAccount` (`OWNER` / `EDITOR` / `VIEWER`) |

Web: `useAuth().can('canManageSponsorships')` etc. App: same. Staff templates for the role editor come
from `GET /api/super-admin/access-catalog` → `data.staffTemplates` (`{ CAMPAIGN_MANAGER: {label, permissions[]}, MEDIA_TEAM, FINANCE_TEAM }`).

Money visibility in deal responses: organisers and brand staff never receive `cashAmount`,
`proposal.amount`, in-kind `estimatedValue`, `tier.price`; only finance and the sponsor receive
`payments` / `amountReceived`; sponsors never receive `internal` messages and only receive
`report` once `report.sharedAt` is set. Every deal response includes
`viewer: { isManager, isFinance, isBrand, isOrganizer, isSponsor, sponsorRole }` — use it to show/hide
controls.

## Enums

- Opportunity `status`: `DRAFT OPEN CLOSED COMPLETED CANCELLED` (public sees OPEN/CLOSED/COMPLETED).
  `campaignType`: `CLEANUP BLOOD_DONATION TREE_PLANTATION EDUCATION DISASTER_RELIEF FOOD_DISTRIBUTION HEALTH OTHER`.
- Tier `level`: `TITLE GOLD SILVER BRONZE COMMUNITY_PARTNER MEDIA_PARTNER IN_KIND CUSTOM`; `logoSize`: `XL L M S NONE`;
  `slots` 0 = unlimited; `price` 0 = in-kind / by quotation (show `priceNote`).
- Resource / contribution types: `CASH MATERIALS EQUIPMENT TRANSPORT FOOD UNIFORMS VENUE MEDIA OTHER`.
- Deal `stage`: `APPLIED IN_REVIEW NEGOTIATING AGREED FULFILLED DECLINED WITHDRAWN CANCELLED`.
  Allowed moves: APPLIED→IN_REVIEW/NEGOTIATING/AGREED/DECLINED · IN_REVIEW→NEGOTIATING/AGREED/DECLINED ·
  NEGOTIATING→IN_REVIEW/AGREED/DECLINED · AGREED→FULFILLED/CANCELLED/NEGOTIATING · FULFILLED→AGREED ·
  DECLINED→IN_REVIEW · CANCELLED→IN_REVIEW. AGREED/FULFILLED/CANCELLED = managers only; others = managers or organisers.
  AGREED needs `cashAmount > 0` or an active in-kind item, and a free tier slot; it copies the
  opportunity's `deliverablesTemplate` onto the deal. FULFILLED needs every deliverable DONE or WAIVED.
- In-kind `valuationMethod`: `SPONSOR_INVOICE MARKET_QUOTE SPONSOR_DECLARED STAFF_ESTIMATE NOT_VALUED`;
  `status`: `PLEDGED RECEIVED CANCELLED`. Always label in-kind values "estimated value — not cash".
- Deliverable `type`: `VEST_LOGO VENUE_BANNER BACKDROP ID_CARD SOCIAL_MENTION VIDEO PHOTO_ALBUM WEBSITE_LISTING SPEAKING_SLOT IMPACT_REPORT OTHER`;
  `status`: `PENDING IN_PROGRESS DONE WAIVED` (DONE needs a proof link or note; WAIVED managers only).
- Payment `method`: `BANK_TRANSFER CONNECTIPS KHALTI ESEWA CHEQUE CASH OTHER` (reference required unless CASH).
- Brand placements: `VEST_FRONT VEST_BACK BANNER BACKDROP ID_CARD SIGNAGE`; slot `size`: `XL L M S`.
- Sponsor account `type`: `COMPANY NGO LOCAL_BUSINESS EDUCATION GOVERNMENT MEDIA INDIVIDUAL OTHER`;
  `verificationStatus`: `PENDING VERIFIED REJECTED`.

Images/logos/proofs/agreements are **http(s) URLs** for now (no upload service yet — Cloudinary is
pending). Use URL fields with a live preview; never accept `javascript:`/data URLs.

## Endpoints (prefix `/api/sponsorship`)

Public
- `GET /opportunities?status=OPEN|CLOSED|COMPLETED&campaignType=` → list: opportunity fields + `tierCount`, `startingPrice|null`, `sponsors[]` (public), `fundingSecuredPct|null`.
- `GET /opportunities/:id` (optional auth) → opportunity + `tiers[]` (`slotsLeft` null=unlimited) + `sponsors[]` `{deal,name,type,website,tier{name,level,order,logoSize},logoUrl('' unless approved)}` + `fundingSecuredPct` + `viewer{canManage,isOrganizer,canBrand}` + populated `event`, `donationCampaign`, `organizers`. Drafts only for managers/organisers.

Sponsor accounts (signed in)
- `POST /accounts` `{name,type,description,website,panNumber,vatRegistered,address,contactName,contactEmail,contactPhone,logos:[{label,url,background:LIGHT|DARK|ANY}]}` → account with `myRole`.
- `GET /accounts/mine` · `GET /accounts/:id` (members populated `{user:{name,email}}`) · `PUT /accounts/:id` (OWNER/EDITOR; name/PAN change resets VERIFIED→PENDING)
- `POST /accounts/:id/members` `{email, role}` (OWNER) · `DELETE /accounts/:id/members/:userId` (OWNER or self-leave; last owner protected)

Sponsor-side deals
- `POST /opportunities/:id/apply` `{sponsorAccount, tier?, isCustomQuote?, message, contributionTypes[], amount?, inKindItems?[], logoUrl?}` → `{_id}`. Tier OR message required. 409 if an active proposal exists (`dealId` returned).
- `GET /deals/mine` (no messages/history) · `GET /deals/:id`
- `PUT /deals/:id/sponsor` `{action:'UPDATE_PROPOSAL'|'SET_LOGO'|'APPROVE_LOGO'|'REVOKE_LOGO'|'WITHDRAW', ...}` (OWNER/EDITOR). UPDATE_PROPOSAL takes `message, amount, contributionTypes, inKindItems, tier|null`; SET_LOGO `{logoUrl}` (clears approval); WITHDRAW `{note}`.
- `POST /deals/:id/messages` `{body, internal?}` (internal only honoured for staff/organisers)

Staff / organisers
- `GET /admin/summary` (manager/finance) → `{opportunities:{STATUS:n}, pipeline:[{stage,deals,projected}], contractedCash, receivedCash?, outstandingCash?, inKind:{pledgedValue,receivedValue,items,note}, pendingSponsorAccounts}` (received/outstanding finance only)
- `GET /admin/accounts?status=` (manager/finance) · `PUT /admin/accounts/:id/verify` `{status, note}` (manager)
- `GET /admin/opportunities?status=` (managers/brand/finance: all; organisers: theirs) → each with `dealStats{total,open,contracted,contractedCash?,received?}`
- `POST /opportunities` (manager) `{title, campaignType, summary, description, objectives[], coverImage, location, startDate, endDate, schedule, expectedAudience{count,description}, fundingGoal, resourceNeeds[{type,description,quantity,unit}], deliverablesTemplate[{title,type,dueOffsetDays}], event?, donationCampaign?, organizers[userId], status:'DRAFT'|'OPEN', tierTemplateIds[]}`
- `PUT /opportunities/:id` (manager; organisers: details only, no status/organizers) · `DELETE /opportunities/:id` (manager; 409 if active/completed deals)
- `GET /tiers?opportunity=<id>|templates` (manager; includes inactive + `slotsTaken`) · `POST /tiers` `{opportunity?, name, level, description, price, priceNote, benefits[], logoSize, slots, order, isActive}` · `PUT /tiers/:id` · `DELETE /tiers/:id` (hides instead when used)
- `GET /admin/deals?opportunity=&stage=A,B&sponsor=` (manager/finance/brand: all; organisers: their campaigns)
- `PUT /deals/:id/stage` `{stage, note}` · `PUT /deals/:id` (manager) `{tier, isCustomQuote, cashAmount, inKindItems[] (with _id, status, receivedAt), agreement{documentUrl,terms,signedAt,signedByName}, showOnPublicPage}`
- `POST /deals/:id/deliverables` `{title,type,dueDate}` (manager/organiser) · `PUT /deals/:id/deliverables/:did` `{status, proofUrls[], proofNote, title, dueDate}` (manager/organiser/brand) · `DELETE /deals/:id/deliverables/:did` (manager)
- `PUT /deals/:id/report` `{summary, highlights[], mediaUrls[], share?:true}` (manager/organiser; contracted deals)
- `POST /deals/:id/payments` `{amount, method, reference, receivedAt, note}` (finance) · `DELETE /deals/:id/payments/:pid?reason=` (finance)
- `GET /opportunities/:id/brand-kit` (brand staff, organisers, agreed sponsors) → `{campaignLabel, accentColor, notes, approvedAt, slots:[{deal,order,size,placements[],sponsorName,logoUrl,logoUsageApproved,tier}], unplaced:[...], opportunity{_id,title,startDate,location}}`
- `PUT /opportunities/:id/brand-kit` `{campaignLabel, accentColor:'#RRGGBB', notes, slots:[{deal,order,size,placements[]}], approve?:true}` (any change clears approval)

Notifications: type `SPONSORSHIP` with a `link` (web path): `/sponsor/portal`, `/sponsor/portal/deals/:id`,
`/sponsor/opportunities/:id`, `/admin?tab=sponsors`, `/admin?tab=sponsorDeals&deal=:id`.

## Artwork

`frontend/src/lib/brandKitSvg.js` (identical copy `mobile/src/lib/brandKitSvg.js` — keep them identical):
`renderBrandKitSvg({ item, campaignLabel, accentColor, brandLogoHref, title, dateText, location, sponsors:[{name, logoHref, size, order, logoUsageApproved}], personName, personRole })` → SVG string in
real millimetres; `BRAND_ITEMS` lists items with labels and sizes. Pass only slots for the chosen
placement, `logoHref = slot.logoUrl`, `size = slot.size`. Unapproved logos are skipped automatically —
show a clear warning listing sponsors whose logo is not yet approved.

## Routes

Web: `/sponsor` (why sponsor + open opportunities), `/sponsor/opportunities/:id` (proposal page, tiers,
apply), `/sponsor/portal` (my sponsor accounts + deals; create account), `/sponsor/portal/deals/:id`,
`/sponsor/portal/accounts/:id`, `/organize/:id` (organiser workspace for one opportunity).
Admin dashboard tabs (SuperAdminDashboard): `sponsorship`, `sponsorDeals`, `sponsors`.

App (Expo Router): `/sponsor` (list), `/sponsor/[id]`, `/sponsor/portal` , `/sponsor/portal/deal/[id]`,
`/sponsor/portal/account/[id]`, `/sponsor/organize/[id]`, admin sections `/admin/sponsorship`,
`/admin/sponsorDeals`, `/admin/sponsors` (already registered in `mobile/src/lib/adminAccess.js`;
`need` may be an array = any of).
