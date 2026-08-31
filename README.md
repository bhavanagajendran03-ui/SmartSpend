# SmartSpend — Personal Finance & Budget Analytics Dashboard

A finance dashboard built for the Elevate Labs 2-week internship project
(base idea: *Budget Planner with Data Visualizations*), expanded with the
modules discussed in the project brief: dashboard overview, income/expense
CRUD, charts, filters, savings goals, budget limits with alerts, rule-based
spending insights, monthly reports with month-to-month comparison, dark
mode, CSV export, transaction search, and a financial health score.

## How to run it

No build step, no npm install, no API keys required.

1. Unzip the project.
2. Open `index.html` directly in a browser — **or**, for the smoothest
   experience (some browsers restrict `fetch`/module behaviour on the
   `file://` protocol), serve it locally:
   ```bash
   cd smartspend
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```
3. Log in with the pre-loaded demo account to see sample data:
   - **Email:** `demo@smartspend.app`
   - **Password:** `demo1234`

   Or tap **Sign up** to create your own account — all data is scoped to
   the logged-in user.

## Tech stack

| Layer            | Choice                                   |
|-------------------|-------------------------------------------|
| UI                | HTML5, CSS3 (custom design system, no framework), vanilla JavaScript |
| Charts            | Chart.js (via CDN)                       |
| Auth              | Local mock auth (`js/auth.js`) — same shape as Firebase Auth |
| Data storage      | `localStorage`, wrapped in a Firestore-style API (`js/store.js`) |

**Why localStorage instead of real Firebase in this build?** It keeps the
project runnable with a single double-click, with no API keys, billing
setup, or internet dependency — ideal for a demo/interview walkthrough.
The code is intentionally organized so that swapping in real Firebase is a
contained change:

- `js/store.js` — replace `getCollection/addDoc/updateDoc/deleteDoc` with
  the equivalent Firestore SDK calls (`getDocs`, `addDoc`, `updateDoc`,
  `deleteDoc`).
- `js/auth.js` — replace `register/login/logout` with
  `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`,
  `signOut` from Firebase Auth.

No other file talks to `localStorage` directly, so nothing else needs to
change.

## Project structure

```
smartspend/
├── index.html          # App shell: auth screen, sidebar, all views, modals
├── css/
│   └── styles.css       # Design system (light + dark themes) & layout
├── js/
│   ├── store.js         # Persistence layer (localStorage, Firestore-shaped API)
│   ├── auth.js           # Register / login / logout / demo data seeding
│   ├── transactions.js    # Categories, CRUD, filtering, search, CSV export
│   ├── goals.js           # Savings goals & budget-limit CRUD + alert thresholds
│   ├── insights.js        # Monthly summaries, comparisons, rule-based insights, health score
│   ├── charts.js           # Chart.js render helpers (pie, bar, line)
│   └── main.js              # App bootstrap: navigation, rendering, event wiring
└── README.md
```

## Feature checklist (maps to the project brief)

- [x] Dashboard: income, expenses, balance, savings, goal progress, recent transactions
- [x] Income & expense CRUD with category, date, description, payment method
- [x] Pie/doughnut, bar, and line charts (Chart.js)
- [x] Filters: type, category, month, free-text search
- [x] Savings goals with progress bars and deadlines
- [x] Budget limits with 80%-warning and over-limit alerts
- [x] Rule-based spending insights (no external AI call — see `insights.js`)
- [x] Monthly summary + month-to-month comparison with ↑/↓ indicators
- [x] Local authentication with per-user data isolation
- [x] Dark mode toggle
- [x] Responsive layout (desktop, tablet, mobile)
- [x] CSV export of (filtered) transactions
- [x] Financial health score (0–100), explicitly labeled as a custom rule-based score

## Notes for your internship report

- **Introduction / Abstract:** frame it as *"a personal finance dashboard
  that lets a user log income and expenses, visualize spending patterns,
  set savings goals and budget limits, and get automated insights into
  their habits."*
- **Tools used:** HTML5, CSS3, JavaScript (ES6+), Chart.js, browser
  `localStorage` (standing in for Firebase Auth + Firestore).
- **Steps involved:** data modeling (transactions/goals/budgets) →
  authentication → CRUD screens → chart integration → filters/search →
  goals & budget alerts → rule-based insights & health score → dark mode
  & responsive polish → CSV export.
- **Conclusion:** summarize what you'd add with more time (e.g. real
  Firebase backend, recurring transactions, multi-currency support).

Good luck with the presentation!
