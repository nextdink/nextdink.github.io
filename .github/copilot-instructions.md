# Copilot Instructions — Next Dink

## General Rules

- **Do not** automatically commit or push changes. Leave that to the developer.

## Build & Dev Commands

```bash
npm run dev          # Start Vite dev server (connects to local Functions emulator)
npm run build        # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint         # ESLint across the project
npm run preview      # Preview production build locally
```

Cloud Functions (separate package in `functions/`):

```bash
cd functions && npm ci && npm run build
```

There is no test runner configured in this project.

## Architecture

This is a **pickleball event coordination app** — players create events with team-based capacity, register teams, manage waitlists, and share via invite lists. It also has AI-powered tournament discovery. No chat or social features.

### Layer Separation

```
Views → Hooks → Services → Firebase
```

- **Views** (`src/views/*View.tsx`) — Page-level components. Compose UI from shared components, delegate all business logic to hooks.
- **Hooks** (`src/hooks/`) — Business logic layer. Each hook (e.g., `useEvent`, `useEvents`, `useList`) manages its own state with `useState`/`useCallback` and calls services directly.
- **Services** (`src/services/`) — Thin wrappers around Firebase SDK calls (Firestore queries, Auth methods, FCM). No business logic here.
- **Config** (`src/config/`) — Firebase init (`firebase.ts`), route constants (`routes.ts`), theme colors (`theme.ts`).

### State Management

- **React Context** for auth (`AuthContext`) and theme (`ThemeContext`) — no global stores.
- **Zustand** is installed but not used; hooks use local React state.
- **React Query** (`@tanstack/react-query`) is installed and the `QueryClientProvider` is wired up (staleTime: 5 min, retry: 1), but current hooks use manual async patterns instead of `useQuery`/`useMutation`.

### Routing

React Router v7 with **HashRouter** (for GitHub Pages). All routes are defined in `src/config/routes.ts`. Event URLs use **`eventCode`** (not `eventId`) for user-friendly sharing (e.g., `/events/:eventCode`). Three route wrapper patterns in `App.tsx`:

- `ProtectedRoute` — Requires auth; redirects to `/login?redirect=...`
- `PublicRoute` — Redirects authenticated users away from login/signup
- `OptionalAuthRoute` — Allows both (used for public event detail pages)

### Firestore Schema

- `/users/{userId}` — Profile, FCM tokens, notification prefs
- `/events/{eventId}` — Event data with **embedded** `registrations[]` array (each registration is a team with members). Capacity is calculated client-side from these arrays.
- `/lists/{listId}` → `/lists/{listId}/members/{userId}` — Invite lists with subcollection
- `/tournaments/{tournamentId}` — User-submitted tournaments
- `/tournamentCache/{geoBucketKey}` — AI discovery cache (admin SDK only)
- `/config/searchUsage` — Monthly Gemini API call counter (admin SDK only)

### Client vs Cloud Function Mutations

**Critical pattern**: All event mutations (register, leave, claim slot, manage admins, invite, cancel) go through **Cloud Functions** using Firestore transactions. The client **cannot** directly write to `registrations[]`, `adminIds[]`, or `invitedUserIds[]` — Firestore security rules enforce this. This ensures atomic updates and prevents race conditions on the embedded arrays.

Callable functions in `functions/src/eventFunctions.ts`: `registerTeam`, `leaveTeam`, `claimSlot`, `updateTeamMember`, `respondToInvite`, `declineEvent`, `manageInvitations`, `manageTeams`, `manageAdmins`, `cancelEvent`.

### Cloud Functions (`functions/src/`)

Two categories of Cloud Functions:

1. **Callable functions** (`eventFunctions.ts`) — Event mutations via Firestore transactions (see above).
2. **Firestore triggers** (`index.ts`) — Push notifications (FCM) fired on: invite, slot claim, waitlist promotion, event cancel, event detail changes.

### Tournament Discovery

AI-powered tournament search using **Gemini 2.5 Flash** with Google Search grounding (`functions/src/index.ts`):

- **Caching**: Coordinates are geo-bucketed to 0.1° (~7 mi grid). Results cached in `tournamentCache/{lat}_{lng}` with a **72-hour TTL**.
- **Rate limiting**: Monthly cap of 4,500 Gemini calls tracked in `config/searchUsage`. Stale cache is served when limit is reached.
- **Fallback**: On API error, returns cached data if available.
- AI-discovered tournaments (`source: "ai"`) link to external source URLs. User-submitted tournaments (`source: "user"`) have in-app detail pages.

### Push Notifications (FCM)

The app is a **PWA** with Firebase Cloud Messaging. Messaging is lazy-initialized in `src/config/firebase.ts`. The `firebase-messaging-sw.js` service worker has Firebase config placeholders that are replaced with actual secrets via `sed` in the CI pipeline (service workers aren't processed by Vite).

## Key Conventions

### Imports

Always use the `@/` path alias (mapped to `src/`). No relative imports.

```typescript
import { Button } from "@/components/ui/Button";
import { useEvent } from "@/hooks/useEvent";
import { Event } from "@/types/event.types";
```

### Component Organization

- `src/components/ui/` — Reusable primitives: `Button`, `Input`, `Card`, `Badge`, `Modal`, `Spinner`, `Avatar`
- `src/components/layout/` — `PageLayout`, `Header`, `BottomNav`
- `src/components/common/` — Domain-specific shared components: `EventCard`, `UserRow`, `RegistrationCard`, `TeamRegistrationModal`, `TournamentCard`

### Domain Types

Types live in `src/types/` and include helper functions alongside interfaces:

- `event.types.ts` — `Event`, `TeamRegistration`, `TeamMember` + utility functions like `getJoinedTeams()`, `getWaitlistedTeams()`, `isUserInEvent()`, `getUserEventStatus()`
- `tournament.types.ts` — `Tournament`, `CreateTournamentData` + utilities like `formatDateRange()`, `isUpcoming()`
- `user.types.ts` — `User`
- `list.types.ts` — `List`

### Styling

- **Tailwind CSS v4** via Vite plugin — all styling is utility classes, no CSS modules.
- **Flat design** — no shadows or gradients on UI elements. Use 1px borders instead.
- Brand colors are defined in `src/config/theme.ts` and registered as CSS custom properties via `@theme` in `src/index.css`. Always use `primary-*` classes for brand colors — never hardcode `teal-600`.
- Color usage: `primary-*` (teal) for brand, `slate-*` for neutrals, `emerald-*` for success, `amber-*` for warnings, `red-*` for danger.
- Dark mode supported (light/dark/system) via `ThemeContext`.
- Minimum touch target: 44×44px.

### Events — Team Model

Events use team-based registration (1–4 players per team). A team has a captain (`createdBy`) and members that can be `"user"`, `"guest"` (name-only placeholder), or `"open"` (claimable slot). Capacity is expressed as `maxTeams` × `teamSize`. Waitlisting happens at the team level — excess registrations beyond `maxTeams` are waitlisted.

### Avatars

Deterministic SVG avatars generated client-side in `src/utils/avatarUtils.ts` using FNV-1a hash. OAuth profile photos are shown when available; generated avatars are the fallback.

## Environment Variables

All prefixed with `VITE_` for client-side access:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_VAPID_KEY
VITE_GOOGLE_MAPS_API_KEY
```

Cloud Functions use `GEMINI_API_KEY` (set via Firebase environment config, not `VITE_`-prefixed).

## Pre-commit Hooks

Husky runs `lint-staged` on commit:

- `*.{ts,tsx}` → ESLint fix + Prettier format
- `*.{json,md,css}` → Prettier format

## CI/CD

GitHub Actions (`deploy.yml`) on push to `main`:

1. Build frontend with secrets injected as env vars → deploy to GitHub Pages
2. Post-build: inject Firebase config into `firebase-messaging-sw.js` via `sed` (service worker can't use Vite env vars)
3. Deploy Cloud Functions to Firebase (requires `FIREBASE_TOKEN` secret)
