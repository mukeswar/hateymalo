# Porting the HATEYMALO website to the Expo app

The app in `mobile/` is a React Native (Expo SDK 57, Expo Router, JavaScript) port of the
website in `frontend/src`. It talks to the same Express API (`backend/`), so every screen must
call the **same endpoints with the same payloads** as its web page and respect the same
permissions and PlatformSettings toggles.

## Rules
- **Feature parity.** Read the web page fully and port every feature, action, empty state and
  permission check. Re-layout for a phone (single column, bottom sheets instead of modals,
  horizontal chip bars instead of sidebars), but do not drop functionality.
- **No fabricated data.** Show only real API data; honest empty states otherwise (no fake
  stats, testimonials or orgs).
- **Never seed or wipe the database.** Use disposable `QA ` / `qa_` records if you create test
  data through the API and delete them afterwards.
- Imports use relative paths (e.g. `../../components/ui`). No new npm packages without a very
  good reason; if needed use `npx expo install <pkg>` from `mobile/`.
- Every route file default-exports a component. Set the header title from inside the screen
  with `<Stack.Screen options={{ title: '…' }} />` (import `Stack` from `expo-router`) when it
  differs from the defaults in `src/app/_layout.jsx`.
- Navigation: `import { router, Link, useLocalSearchParams } from 'expo-router'`. Web route →
  app route: `/post/:id` → `/post/[id]`, `/events/:id` → `/event/[id]`, `/blogs/:id` →
  `/blog/[id]`, `/profile/:id` → `/profile/[id]`, `/admin` and `/admin-dashboard` → `/admin`,
  `/admin/<section>` for each id in `src/lib/adminAccess.js`. Others keep their name
  (`/donate`, `/search`, `/members`, `/categories`, `/organizations`, `/about`, `/dashboard`,
  `/notifications`, `/create-post`, `/create-blog`, `/login`, `/register`).
- Gate signed-in screens: if `!user` after `loading`, show an EmptyState with a "Sign in"
  action → `router.push('/login')` (or `<Redirect href="/login" />`).
- Lists: use `FlatList` (with `<Screen scroll={false}>`) for long/paginated lists; pull to
  refresh everywhere it makes sense.
- Confirm destructive actions with `confirm(title, message)` from `src/lib/confirm.js`
  (Promise<boolean>; works on native and web — plain `Alert.alert` buttons do nothing on web).
- Images are URLs (no upload endpoint) — keep URL text fields where the web uses them; render
  with `expo-image`'s `Image`.
- Icons: `lucide-react-native` (same names as the web's `lucide-react`).

## Available foundation (do not rewrite; extend only if truly needed and say so)
- `src/theme.js` — `colors`, `fonts`, `radius`, `space`, `shadow`, `statusTone(status)`.
- `src/lib/api.js` — axios `API` (JWT attached), `errorMessage(err, fallback)`, `API_URL`.
- `src/lib/format.js` — `formatNPR`, `formatNumber`, `formatDate`, `formatDateTime`, `timeAgo`,
  `humanize`, `plainText`, `pct`.
- `src/lib/adminAccess.js` — `ADMIN_GROUPS`, `canAccessSection`, `findSection`.
- `src/lib/confirm.js` — cross-platform confirm dialog.
- `src/context/AuthContext.jsx` — `useAuth()` → `{ user, loading, isAuthenticated, login,
  register, logout, updateProfile, refreshUser, isAdmin, isSuperAdmin, can(perm) }` (same as web).
- `src/context/SettingsContext.jsx` — `useSettings()` → `{ settings, refreshSettings }`.
- `src/context/ToastContext.jsx` — `useToast()` → `{ showToast(message, 'success'|'error'|'warning'|'info') }`.
- `src/components/ui` — `T` (variants: display h1 h2 h3 body medium semibold bold small caption
  eyebrow eyebrowDeva), `Button` (variants primary pine ghost soft danger text; sizes sm md lg;
  icon, loading, full), `Avatar` (name, src, size xs–2xl|number), `VerificationBadge`,
  `Screen` (scroll, refreshing, onRefresh, edges), `Card` (onPress, padded), `SectionHeader`,
  `Divider`, `Row`, `Chip`, `StatusChip`, `ChipBar`, `Segmented`, `ProgressBar`, `Field`
  (TextInput props + label/hint/error/multiline), `Select` (chip picker), `Loading`,
  `Skeleton`, `EmptyState`, `ErrorState`, `Sheet` (bottom-sheet modal: visible, onClose,
  title, footer).

## Shared components (one owner each; same name and props as the web component)
| File (`src/components/…`) | Props | Owner |
|---|---|---|
| `PostCard.jsx` | `{ post }` | posts agent |
| `CommentSection.jsx` | same as web (`{ postId }` …) | posts agent |
| `PostUpdatesSection.jsx` | `{ postId, isCreator }` | posts agent |
| `ReportModal.jsx` | `{ isOpen, onClose, targetType, targetId, targetTitle }` | posts agent |
| `RejectionModal.jsx` | `{ isOpen, onClose, onConfirm, postTitle }` | posts agent |
| `DonationModal.jsx` | `{ isOpen, onClose, campaign, onSuccess }` | posts agent |
| `FinancialTransparencySection.jsx` | `{ campaignId, isOrganizer }` | posts agent |
| `BadgeList.jsx` | `{ userId }` | account agent |
| `EditProfileModal.jsx` | `{ isOpen, onClose }` | account agent |
| `ChangePasswordCard.jsx` | `{}` | account agent |

If you need a shared component you don't own and it doesn't exist yet, import it anyway with
the props above — its owner is building it in parallel. Never create a file owned by someone else.

## Checking your work
- Backend: `http://localhost:5000/api` (in-memory seeded DB). Logins:
  `admin@hateymalo.com / admin123` (SUPER_ADMIN), `ram@hateymalo.com / user123`,
  `sita@hateymalo.com / user123`. Use `curl` to inspect real response shapes before coding.
- Metro dev server is already running on port 8081. Check your files compile with:
  `curl -s "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=web&dev=true&minify=false" -o /dev/null -w "%{http_code}\n"`
  (200 = bundles; on 500 run without `-o /dev/null` and read the error). Route screens are
  split into async chunks, so also check each route you touched:
  `curl -s "http://localhost:8081/src/app/<route>.bundle?platform=web&dev=true" -o /dev/null -w "%{http_code}\n"`
  (e.g. `src/app/admin/members`, `src/app/(tabs)/explore`). Do not start another
  Metro/expo server and do not drive the browser pane — the lead verifies UI at the end.

## Sponsorship module

The sponsorship API, permissions, enums, routes and the shared artwork generator are specified in
`../docs/SPONSORSHIP.md`. Read it before touching any sponsorship screen.
