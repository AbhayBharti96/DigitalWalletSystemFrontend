# PayVault (frontend)

Production-oriented React + TypeScript client for a digital wallet, KYC, rewards, and Razorpay top-ups. This repo follows a **feature-based** layout, **Redux Toolkit** for global state, and a **central Axios layer** with auth interceptors.

## Requirements

- Node 18+
- Backend API compatible with the routes in `src/core/api.ts` (see env below)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — set VITE_API_BASE_URL and VITE_RAZORPAY_KEY_ID
npm run dev
```

The app runs at `http://localhost:3001` by default.

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API origin (no trailing slash). In production builds, this should always be set. |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Checkout **key id** only; the secret must stay on the server. |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript only |
| `npm test` | Vitest unit tests |

## Architecture (high level)

- **`src/features/*`** — Route-level screens (auth, dashboard, wallet, admin, …).
- **`src/core/api.ts`** — Axios instances, JWT on requests, refresh on 401, domain API modules (`authService`, `walletService`, …).
- **`src/store/*`** — Redux slices and async thunks; co-located with global domain state.
- **`src/shared/`** — UI primitives, hooks (`useDebounce`, `useThrottleCallback`, `useAuth`), and `getApiErrorMessage` for consistent errors.
- **Lazy routes** — Code-splitting via `React.lazy` in `App.tsx`.

## Security notes

- Tokens are stored in `sessionStorage` (and optionally `localStorage` if you extend “remember me”); never log raw tokens.
- Payment **verification** is always done on the backend; the client only forwards Razorpay response fields to your API.
- Prefer environment-specific API URLs over hardcoding.

## Real-time

There is no WebSocket in this codebase yet; add one when the backend exposes a channel (e.g. transaction notifications).
