# Advertising module — API and UI contract

Backend: `backend/routes/adRoutes.js` → `backend/controllers/adController.js`
(models `AdPlacement`, `AdCampaign` with embedded creatives, `AdMetricDaily` counters, `AdEventSeen` de-dup keys).
Advertisers are **SponsorAccounts** (the same organisation records as sponsorship; see `docs/SPONSORSHIP.md`).
All amounts are **whole NPR integers**. Responses are `{ success, data | message }`; show `message` in a toast.
Verified end to end by 94 API checks.

## Who can do what (server-enforced; clients only hide UI)

| Actor | How it is determined | Can |
| --- | --- | --- |
| Advertiser | OWNER / EDITOR of the campaign's SponsorAccount (VIEWER = read-only) | create drafts, edit, submit, pause/resume own pause, end, archive, delete unused drafts, read reports |
| Ad manager | permission `canManageAds` (ADMIN preset, Campaign Manager template) | everything an advertiser can, for any account; set custom `flatPrice` / `rate` |
| Ad reviewer | permission `canReviewAds` (ADMIN preset) | approve / reject, pause / resume any campaign, manage placements and rate cards |
| Finance | `canManageSponsorFinance` | read campaigns, reports and the summary |

`useAuth().can('canManageAds')` / `can('canReviewAds')` on web and app. A campaign can only be **approved** when its
SponsorAccount is `VERIFIED` (verification lives in the sponsorship admin tab).
Every campaign response includes `viewer: { isAdvertiser, advertiserRole, canEdit, canReview, canManage, isFinance }`.

## Enums

- Campaign `status`: `DRAFT IN_REVIEW APPROVED REJECTED PAUSED ENDED ARCHIVED`.
  Computed `deliveryStatus` (show this as the main badge): same as status, except APPROVED becomes
  `SCHEDULED` (before start) · `LIVE` · `FINISHED` (past end) · `BUDGET_SPENT` · `NO_CREATIVE`.
  Campaigns past their end date are moved to ENDED automatically.
- `objective`: `AWARENESS TRAFFIC VOLUNTEERS DONATIONS EVENT_PROMOTION OTHER`.
- `pricingModel`: `FLAT` (uses `flatPrice` for the whole run) · `CPM` (`rate` per 1,000 impressions) · `CPC` (`rate` per click).
  CPM/CPC need `budget` > 0 and stop serving when spend reaches it. FLAT sets `rate` and `budget` to 0.
- Creative `format`: `IMAGE` (imageUrl required) · `NATIVE` (sponsored card: imageUrl + headline required, body, cta) · `VIDEO` (videoUrl required, posterUrl, skipAfterSeconds 0–30).
  `cta`: `LEARN_MORE VISIT SIGN_UP DONATE VOLUNTEER SHOP CONTACT WATCH`. `labelText`: `Sponsored Advertisement Promoted प्रायोजित` (never empty).
  Creative `status`: `PENDING APPROVED REJECTED` (+ `rejectionReason`). Max 10 creatives.
- Placement `surfaces`: `WEB APP`; `formats` subset of the creative formats; `maxAds` 1–5; `rateCard { flatPerDay, cpm, cpc }` (0 = not offered).

Images/videos are **http(s) URLs** for now (uploads wait for Cloudinary). Use URL fields with a live preview.

## Pricing rules

Advertisers never type a price. On create/update/submit the server quotes from the chosen placements' rate cards:
FLAT = sum of `flatPerDay` × whole days; CPM/CPC = the highest `cpm`/`cpc` among the placements. If a chosen placement
has 0 for that model the save fails with a message (show it). Show the quote (`flatPrice` or `rate`) and `budget`
read-only to advertisers. Ad managers may send `flatPrice` and/or `rate` → `customPrice: true`; a custom price
is kept while the advertiser does not change pricing model, placements or dates.

## Endpoints (prefix `/api/ads`)

Public
- `GET /placements` → active placements with rate cards (for the advertiser form).
- `GET /serve?placement=<key>&surface=WEB|APP&category=<cause name>&limit=<n>&exclude=<campaignId,…>` (optional auth) →
  `{ placement: {key,maxAds,width,height} | null, ads: [{ token, campaignId, creativeId, format, imageUrl, videoUrl, posterUrl, headline, body, cta, ctaLabel, altText, labelText, skipAfterSeconds, advertiserName, frequencyCapPerDay, clickPath }] }`.
  Empty `ads` when ads are switched off (`settings.adsEnabled === false`), the slot is inactive, or nothing matches.
  Campaigns with `categories` only show when `category` matches (case-insensitive); untargeted campaigns show everywhere.
- `POST /events` `{ events: [{ t: token, type }] }` (≤ 50, optional auth) → `{ counted, ignored }`. Types:
  `IMPRESSION VIEWABLE VIDEO_START VIDEO_Q25 VIDEO_Q50 VIDEO_Q75 VIDEO_COMPLETE VIDEO_SKIP`. Each counts once per token;
  anything but IMPRESSION is ignored until that token's IMPRESSION was recorded.
- `GET /click?t=<token>` → counts the click (once per token) and **302-redirects** to the destination (UTM added when `appendUtm`).
  Clients open `API_BASE + clickPath` (API_BASE already ends in `/api`) in a new tab / the system browser.

Advertisers and ad managers (signed in)
- `POST /campaigns` `{ advertiser, title, objective, description, destinationUrl, appendUtm, startDate, endDate, pricingModel, budget, placements:[key], surfaces:[WEB|APP], categories:[name], frequencyCapPerDay, creatives:[…], flatPrice?, rate? (managers) }` → 201 campaign (DRAFT).
- `GET /campaigns/mine?advertiser=<id>` → my accounts' campaigns (no history).
- `GET /campaigns/:id` → campaign + `history[{status,note,by{name},at}]` + `deliveryStatus, spend, bookedValue, ctr, totals{impressions,viewable,clicks}, advertiser{_id,name,type,verificationStatus,logos}, viewer`.
- `PUT /campaigns/:id` (same body, partial). Send the **whole** `creatives` array (keep `_id` on existing ones); unchanged creatives keep their review status, changed ones become PENDING.
  If an APPROVED/PAUSED campaign is changed by someone without `canReviewAds` (except `frequencyCapPerDay`) it goes back to IN_REVIEW and stops serving — warn before saving. ENDED/ARCHIVED are locked.
- `POST /campaigns/:id/submit` `{ note? }` — DRAFT/REJECTED → IN_REVIEW (needs a placement, an active creative, a future end date).
- `POST /campaigns/:id/status` `{ action, note }`: `PAUSE` (APPROVED→PAUSED) · `RESUME` (PAUSED→APPROVED; advertisers cannot resume when `pausedByStaff`) · `END` · `ARCHIVE` (DRAFT/REJECTED/ENDED) · `WITHDRAW` (IN_REVIEW→DRAFT).
- `DELETE /campaigns/:id` — only DRAFT/REJECTED campaigns that never served (409 otherwise → offer Archive).
- `GET /campaigns/:id/report?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ campaign, range, totals{served, impressions, viewable, clicks, videoStarts, videoQ25..videoComplete, videoSkips, filteredImpressions, filteredClicks, ctr, viewableRate, completionRate, spend}, days:[{day, …same, spend|null}], byCreative:[{creative,name,…}], byPlacement:[{placement,surface,…}], notes:[string] }`.
  `&format=csv` downloads a CSV (send the auth header; use fetch → blob → download link).

Staff
- `GET /admin/summary` (manager/reviewer/finance) → `{ byStatus{STATUS:n}, live, awaitingReview, last30{impressions,viewable,clicks,filtered,ctr,viewableRate,days:[{day,impressions,viewable,clicks}]}, money{booked,earned,note}, top:[{_id,title,advertiser,impressions,clicks,ctr,deliveryStatus}] }`.
- `GET /admin/campaigns?status=A,B&advertiser=<id>` → list (review queue = `status=IN_REVIEW`).
- `PUT /campaigns/:id/review` (canReviewAds) `{ decision: 'APPROVE'|'REJECT', reason, creatives?: [{_id, status:'APPROVED'|'REJECTED', reason}] }` — reason required to reject; on approve, PENDING creatives not listed become APPROVED.
- `GET /admin/placements` (ad staff) → all placements + `activeCampaigns`. `POST /admin/placements` / `PUT /admin/placements/:id` / `DELETE /admin/placements/:id` (canReviewAds)
  `{ key:'page.slot', name, description, surfaces, formats, width, height, maxAds, rateCard{flatPerDay,cpm,cpc}, isActive, order }`.
  Keys of used placements cannot be renamed or deleted (deactivate instead). A new key shows nothing until a client renders that slot.

Settings: `adsEnabled` (boolean, default true) in `PUT /api/super-admin/settings` and public `GET /api/settings` — the master switch.
Notifications: type `ADVERTISING`, links `/sponsor/ads/:id` (advertiser) and `/admin?tab=ads&campaign=:id` (reviewers).

## Rendering rules (web and app)

Slots rendered by clients: `home.banner` (homepage), `feed.inline` (after every 6th item in the posts/stories lists; pass the
list's cause as `category` when filtered), `content.footer` (post / story / event detail; pass that item's `category`),
`events.list` (top of the events list).

1. Fetch `/ads/serve` when the slot mounts; render nothing (no gap, no placeholder) when `ads` is empty or the request fails.
2. Always show `labelText` ("Sponsored") and "by {advertiserName}" visibly on the ad; mark it up as an ad (`aria-label="Sponsored: …"`).
3. **Impression**: send `IMPRESSION` once the ad has actually rendered on screen (image loaded and ≥ 1px visible; not in a hidden tab).
   **Viewable**: send `VIEWABLE` when ≥ 50% of the ad stays visible for 1 continuous second (2 s for VIDEO).
   Video: `VIDEO_START` on first play, quartiles by currentTime/duration, `VIDEO_COMPLETE` at the end, `VIDEO_SKIP` when the user skips. Videos autoplay muted only; show "Skip" after `skipAfterSeconds`.
   Batch events (flush every few seconds and on page hide). On web `navigator.sendBeacon(url, JSON.stringify(body))` works — the endpoint accepts a `text/plain` JSON string.
4. **Click**: open `API_BASE + clickPath` (new tab with `rel="noopener sponsored"` on web; system browser in the app).
5. **Frequency cap**: keep a per-device, per-day count of impressions by `campaignId` (localStorage / AsyncStorage);
   pass campaigns that reached `frequencyCapPerDay` (0 = unlimited) in `exclude`.
6. Never send personal data; tokens identify the ad, not the person.
