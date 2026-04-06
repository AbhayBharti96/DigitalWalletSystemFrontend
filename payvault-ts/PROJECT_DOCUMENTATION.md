# PayVault — Project Documentation

This document describes **PayVault** (package `payvault-ts`): a production-oriented **React + TypeScript** single-page application that acts as the client for a digital wallet product. It covers **what** the app does, **where** code lives, **how** major flows are implemented, and **why** those choices were made.

---

## 1. What this project is

PayVault is a **frontend** for:

- **Authentication** — login, signup, OTP verification flows (backed by REST APIs).
- **KYC** — document upload and status tracking until approval.
- **Wallet** — balance, transfers, withdrawals, transaction history, statements.
- **Payments** — Razorpay-hosted checkout for **wallet top-ups**, with server-side verification.
- **Rewards** — points, tiers, catalog redemption, reward transaction history.
- **Admin** — dashboards, user management, KYC review (for `ADMIN` role).

The app assumes a **separate backend** implementing the routes declared in `src/core/api.ts`. The UI is **not** a mock: it expects real HTTP responses in the shapes defined in `src/types/index.ts`.

---

## 2. Technology stack and rationale

| Layer | Choice | Why (design intent) |
|--------|--------|---------------------|
| UI | React 18 | Standard SPA model, strong ecosystem. |
| Language | TypeScript | End-to-end typing for API contracts and Redux state. |
| Build | Vite 5 | Fast dev server and optimized production bundles. |
| Routing | React Router 6 | Nested routes, layouts, programmatic navigation. |
| Global state | Redux Toolkit | Predictable async flows (`createAsyncThunk`), DevTools-friendly. |
| HTTP | Axios | Interceptors for JWT attach and **silent token refresh** on 401. |
| Styling | Tailwind CSS + CSS variables | Utility classes plus **theme tokens** in `src/styles/index.css` for light/dark. |
| Components | MUI packages are in `package.json`; primary screens lean on **custom** `shared/components/ui` + Tailwind. |
| Animation | Framer Motion | Page and micro-interactions without heavy bespoke CSS. |
| Charts | Recharts | Dashboard and admin visualizations. |
| Toasts | react-hot-toast | Non-blocking user feedback; styled in `main.tsx` to match design tokens. |
| Dates | dayjs | Formatting and relative time (`timeAgo`). |
| Tests | Vitest | Unit tests for pure helpers (e.g. `apiErrors`); config merged in `vite.config.ts`. |

**Code splitting:** route components are loaded with `React.lazy` in `App.tsx` so initial load stays smaller; Vite `manualChunks` further splits vendor bundles (`vendor-react`, `vendor-redux`, `vendor-charts`).

---

## 3. Repository layout (where things live)

```
payvault-ts/
├── index.html
├── vite.config.ts          # Vite + path alias `@` → `./src`, Vitest, dev port 3001
├── tailwind.config.js      # darkMode: 'class', fonts, animations
├── package.json
├── .env.example            # VITE_API_BASE_URL, VITE_RAZORPAY_KEY_ID
├── README.md               # Quick start and architecture summary
└── src/
    ├── main.tsx            # Root: ErrorBoundary, Redux, Router, Toaster, auth sync registration
    ├── App.tsx             # Routes, lazy imports, auth/KYC/admin guards
    ├── vite-env.d.ts       # Vite client types
    ├── types/index.ts      # Shared domain & API TypeScript types
    ├── core/
    │   ├── api.ts          # Axios instances, interceptors, all service modules
    │   └── authSync.ts     # Callback bridge: token refresh → Redux without circular imports
    ├── store/
    │   ├── store.ts        # configureStore; serializableCheck: false (non-serializable values in state)
    │   ├── authSlice.ts
    │   ├── walletSlice.ts
    │   ├── rewardsSlice.ts
    │   ├── themeSlice.ts
    │   └── notificationSlice.ts
    ├── layouts/
    │   ├── AppLayout.tsx   # Sidebar, topbar, notifications, theme toggle, `<Outlet />`
    │   └── AuthLayout.tsx  # Shell for login/signup
    ├── features/           # Route-level screens (feature folders)
    │   ├── auth/
    │   ├── dashboard/
    │   ├── wallet/
    │   ├── transactions/
    │   ├── rewards/
    │   ├── kyc/
    │   ├── profile/
    │   └── admin/
    ├── shared/
    │   ├── hooks.ts        # useAppDispatch/Selector, useAuth, useTheme, useNotify, debounce, etc.
    │   ├── utils.ts        # Currency, dates, tier/KYC helpers, tx icons, idempotency key helper
    │   ├── apiErrors.ts    # getApiErrorMessage — normalize Axios errors
    │   └── components/     # ErrorBoundary, ui primitives, ScratchCard
    └── styles/
        └── index.css       # Design tokens :root / .dark, .card, .btn-primary, etc.
```

---

## 4. Runtime architecture (how pieces connect)

### 4.1 Application shell (`main.tsx`)

1. **`registerAuthTokenSync`** — When the Axios layer refreshes tokens after a 401, it calls `notifyTokensRefreshed`. The callback registered in `main.tsx` dispatches **`setTokens`** so Redux stays aligned with `sessionStorage` without importing the store inside `api.ts`.
2. **`Provider` + `BrowserRouter`** — Standard React-Redux and routing context.
3. **`ErrorBoundary`** — Catches render errors; shows recovery UI and error detail in development.
4. **`Toaster`** — Global toast styling aligned with CSS variables.

### 4.2 Routing and access control (`App.tsx`)

- **Public routes** (`AuthLayout`): `/login`, `/signup`.
- **Protected shell**: Any authenticated user gets `AppLayout` and child routes.
- **`RequireAuth`** guard:
  - No `accessToken` → redirect `/login`.
  - `adminOnly` → non-admins → `/dashboard`.
  - `requireKyc` → if `user.kycStatus !== 'APPROVED'` → `/kyc`.
- **KYC-gated features**: `/wallet`, `/transactions`, `/rewards` require approved KYC.
- **Admin**: `/admin`, `/admin/users`, `/admin/kyc` require `role === 'ADMIN'`.
- **`/`** redirects to `/dashboard`; unknown paths → `NotFoundPage`.

**Why:** Product rule that wallet and rewards need verified identity, while dashboard/KYC/profile remain reachable to complete onboarding.

### 4.3 Authentication

**Storage:** Tokens and serialized `user` are written to **`sessionStorage`** on login/OTP success (`authSlice` `persist`). The code also *reads* `localStorage` for tokens/user on load (`stored()`), enabling a future “remember me” without duplicating refresh logic.

**Redux (`authSlice.ts`):**

- Thunks: `loginUser`, `signupUser`, `sendOtpThunk`, `verifyOtpThunk`.
- Reducers: `logout` (clears state + `clearClientAuth`), `updateKycStatus` (syncs KYC into user + session user blob), `setTokens` (refresh pipeline), `clearError`.

**HTTP layer (`api.ts`):**

- **`api`**: Default client for authenticated calls; request interceptor adds `Authorization: Bearer <access>`.
- **401 handling:** Single-flight refresh: first 401 triggers `POST /api/auth/refresh`; queued requests retry with new access token; on failure, `clearClientAuth` and hard redirect to `/login`.
- **`authApi`**: Unauthenticated client used for refresh (and other auth endpoints) to avoid interceptor loops.

**Logout (`useAuth`):** Calls `authService.logout` with refresh token when possible, then dispatches `logout` and navigates to login.

### 4.4 API surface (backend contract)

All paths are relative to `VITE_API_BASE_URL` (default dev: `http://localhost:8080`).

| Domain | Representative endpoints | Notes |
|--------|-------------------------|--------|
| Auth | `/api/auth/login`, `signup`, `send-otp`, `verify-otp`, `refresh`, `logout`, forgot-password flows | Returns `AuthResponse` with tokens + `user`. |
| Users | `GET/PUT /api/users/profile` | Headers: `X-UserId`. |
| KYC | `POST /api/kyc/submit` (multipart), `GET /api/kyc/status` | Query/body per `kycService`. |
| Wallet | `balance`, `transactions`, `ledger`, `transfer`, `withdraw`, `statement`, `statement/download` | Paginated responses use `PageResponse<T>`. |
| Payment | `POST /api/payment/create-order`, `POST /api/payment/verify` | Razorpay order + verification payload. |
| Rewards | `summary`, `catalog`, `transactions`, `redeem`, `redeempoints`, internal earn | Catalog may be global; user calls use `X-UserId`. |
| Admin | `dashboard`, `users`, `users/:id`, block/unblock, role change, search, KYC pending/approve/reject, catalog add | Headers: `X-UserRole`, and `X-UserEmail` where required. |

**Why `X-UserId` / `X-UserRole`:** The frontend mirrors a backend style where the server may trust gateway-injected headers or dev proxies; production systems often replace these with pure JWT claims— the types and calls remain a stable contract for this codebase.

### 4.5 Wallet and Razorpay (`WalletPage.tsx` + `walletSlice`)

1. **`createPaymentOrder`** thunk → backend creates Razorpay order; returns amount (in **paise**), currency, order id.
2. Client loads **`VITE_RAZORPAY_KEY_ID`** and opens Razorpay Checkout with `order_id` and `amount`.
3. On success, **`walletService.verifyPayment`** posts `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature` (**camelCase** to match backend expectation documented in code).
4. Only after verification succeeds does the UI show success, refresh balance/transactions, and optionally scratch-card / rewards side effects.

**Why:** Payment signatures must be validated on the **server**; the client never holds the Razorpay secret.

### 4.6 Rewards and gamification

- **Redux** caches `summary`, `catalog`, and `transactions`.
- **Scratch card** (`ScratchCard.tsx`) provides a playful reveal after qualifying actions (wired from wallet flows).
- **Points heuristic** in `utils.calcPoints`: e.g. 1 point per ₹100 topped up—display logic; server remains source of truth for balances.

### 4.7 KYC (`KycPage.tsx`)

- Loads current status; on submit, `FormData` upload with `docType`, `docNumber`.
- Updates Redux `user.kycStatus` via `updateKycStatus` when status is known so guards and dashboard reflect changes without extra fetches.
- File size capped at 5MB client-side.

### 4.8 Dashboard (`DashboardPage.tsx`)

- Fetches **wallet balance** and **reward summary** when `user.id` is present.
- **Spending chart** uses **static demo data** (`spend` array)—not live API data; useful for UI polish but should be called out for production if real analytics are required.

### 4.9 Admin

- **`AdminDashboard`**: Fetches aggregated stats and renders Recharts bar/pie charts.
- **`AdminUsers`** / **`AdminKyc`**: List/search/block/role and KYC approve/reject flows via `adminService` (see files under `features/admin/`).

### 4.10 Theme (`themeSlice.ts` + `index.css`)

- On load: reads `localStorage.theme` or `prefers-color-scheme`, applies `.dark` on `document.documentElement`.
- **Toggle** updates class + persistence—Tailwind `darkMode: 'class'` drives dark variants across utilities.

### 4.11 Notifications (`notificationSlice.ts`)

- **In-app** notification list in `AppLayout` (not push/WebSocket).
- **`seedNotifications`** runs when user gains `accessToken`—bootstrap sample items if empty.
- **`useNotify`** dispatches `addNotification` for feature screens to append entries.

### 4.12 Errors (`shared/apiErrors.ts`)

- **`getApiErrorMessage`** normalizes Axios errors into user-facing strings (message field, HTTP status fallbacks, network).
- Used consistently in Redux thunks to avoid duplicated `catch` logic.

---

## 5. Developer workflow

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies. |
| `npm run dev` | Dev server at **http://localhost:3001**. |
| `npm run build` | `tsc && vite build` — typecheck + production bundle. |
| `npm run preview` | Serve production build locally. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript only. |
| `npm test` | Vitest (currently `src/**/*.test.ts`). |

**Path alias:** import from `@/` maps to `src/` (see `vite.config.ts`).

---

## 6. Configuration

From `.env.example`:

- **`VITE_API_BASE_URL`** — API origin, no trailing slash. Required for production builds (warning is logged in `api.ts` if missing in prod).
- **`VITE_RAZORPAY_KEY_ID`** — Public key id only; required for top-up UI.

---

## 7. Security and privacy notes

- **Tokens in storage:** session-first; treat XSS as critical—avoid injecting untrusted HTML; React’s default escaping helps.
- **No secrets in frontend:** Razorpay **secret** stays on backend; only `key_id` in env.
- **Verification:** All monetary correctness depends on backend idempotency, ledger rules, and payment verification.
- **Admin actions:** gated by `RequireAuth adminOnly`; backend must enforce the same role checks.

---

## 8. Limitations and natural extensions

- **Notifications** are local/seeded—no WebSocket or server inbox (README notes this).
- **Dashboard spending chart** is static sample data.
- **MUI** is available but not uniformly the primary UI layer; mixed usage is possible in individual files.
- **Testing:** Focus is on unit utilities; there are no E2E tests in-repo.

---

## 9. Summary

PayVault-ts implements a **feature-sliced** React app with a **single Axios gateway**, **JWT + refresh**, **Redux Toolkit** for auth/wallet/rewards/theme/notifications, and **strict route guards** for KYC and admin. Styling combines **Tailwind**, **CSS variables**, and **Framer Motion** for a cohesive wallet product experience, while **types** in `src/types/index.ts` document the expected backend contract end-to-end.

For day-to-day orientation: start at **`App.tsx`** (routes), **`core/api.ts`** (all HTTP), and **`store/*`** (state mutations); each **`features/*`** folder is the UI and orchestration for one product area.
