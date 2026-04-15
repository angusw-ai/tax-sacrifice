# AGENTS.md — Codex Context for UK Salary Sacrifice Optimiser

This file provides context for AI coding agents (Codex) working in this repository.

---

## Project overview

A free UK salary sacrifice calculator and savings optimiser built for higher earners. It models the personal allowance taper, childcare cliff edge, bonus sacrifice scenarios, pension vs ISA comparisons, and the 2029 NI cap changes. Deployed at https://tax-sacrifice.vercel.app.

The app is entirely client-side React. There is no backend, no database, and no API calls. All tax calculations are performed in the browser using hardcoded constants in taxEngine.js.

---

## Repository structure

```
/                          ← repo root
├── README.md              ← project documentation
├── AGENTS.md              ← this file
├── vercel.json            ← Vercel build config (root directory: frontend, Node 20)
├── frontend/              ← all application code lives here
│   ├── package.json       ← dependencies and build scripts
│   ├── .nvmrc             ← Node version pin (20)
│   ├── public/
│   │   └── index.html     ← HTML entry point (no external scripts)
│   └── src/
│       ├── index.js       ← React entry point, injects Vercel Analytics
│       ├── App.js         ← Root component, wraps app in WizardProvider
│       ├── context/
│       │   └── WizardContext.js   ← ALL wizard state lives here
│       ├── components/
│       │   ├── WizardShell.js     ← Shell, header, step nav, step routing
│       │   └── AdjustedNetIncomeBanner.js  ← Persistent ANI banner
│       ├── pages/
│       │   ├── Step1Situation.js      ← Step 1: salary, region, loans, children
│       │   ├── Step2Sacrifice.js      ← Step 2: scheme selection and config
│       │   ├── StepBonusSacrifice.js  ← Step 3: bonus sacrifice scenarios
│       │   ├── Step3Comparison.js     ← Step 4: pension vs ISA comparison
│       │   └── Step4Results.js        ← Step 5: full results dashboard
│       └── lib/
│           ├── taxEngine.js           ← PRIMARY: all tax/NI/sacrifice logic
│           ├── projectionEngine.js    ← Pension/ISA growth projections
│           ├── insightsEngine.js      ← Smart insight rules and messages
│           ├── formatters.js          ← Currency formatting and input helpers
│           └── urlParams.js           ← Share link URL encoding/decoding
└── backend/               ← exists in repo but NOT used by the app, ignore
```

---

## Critical rules

**Never duplicate tax calculation logic.** All tax, NI, sacrifice, and childcare calculations must go through `taxEngine.js`. The pages and components call these functions — they do not implement their own calculations.

**Never add fetch() calls to the app.** The app is entirely client-side. Any attempt to fetch external data will fail in production. All constants (tax bands, NI rates, thresholds) are hardcoded in taxEngine.js.

**The ANI banner must always use calculateTotalSacrifice() from taxEngine.js.** Do not inline sacrifice calculations in AdjustedNetIncomeBanner.js — this caused a previous bug where the banner and core engine drifted.

**Never break the shareable URL.** Any new wizard state fields must be added to both `encodeStateToURL()` and `decodeURLToState()` in urlParams.js, with appropriate fallback defaults for missing params.

**Always install with --legacy-peer-deps.** The project has a date-fns peer dependency conflict. All npm install commands must use `npm install --legacy-peer-deps`.

**Build command:** `npm run build` (runs craco build). Always verify with `npm run build` before committing.

---

## Wizard state

All state lives in `WizardContext.js`. The reducer handles these action types:

- `SET_STEP` — navigate between steps
- `UPDATE_SITUATION` — Step 1 fields
- `UPDATE_SACRIFICE` — Step 2 scheme toggles and values
- `UPDATE_BONUS` — Step 3 bonus inputs and saved scenarios
- `UPDATE_COMPARISON` — Step 4 ISA/pension comparison inputs
- `HYDRATE` — load state from share link URL params
- `RESET` — return to blank Step 1 state

**Step numbers:**
- Step 1 = Your Situation
- Step 2 = Salary Sacrifice
- Step 3 = Bonus Sacrifice (StepBonusSacrifice.js)
- Step 4 = Pension vs ISA (Step3Comparison.js — note the filename mismatch)
- Step 5 = Results (Step4Results.js — note the filename mismatch)

The page filenames do not match the step numbers. Step3Comparison.js is wizard step 4, Step4Results.js is wizard step 5. This is a known naming quirk — do not rename these files.

---

## Tax engine structure (taxEngine.js)

Key functions and what they do:

| Function | Purpose |
|----------|---------|
| `calculateIncomeTax(income, region, taxYear)` | Income tax by band for rUK or Scotland |
| `calculateEmployeeNI(income, taxYear)` | Employee NI at 8% / 2% |
| `calculateEmployerNI(income, taxYear)` | Employer NI at 15% |
| `calculateStudentLoan(income, plan, postgrad)` | Plan 1/2/4 + postgrad repayments |
| `calculateTotalSacrifice(sacrifice, salary)` | Sum of all active scheme values |
| `calculateChildcareEntitlements(income, children, monthlyCost)` | TFC + 30 free hours value |
| `calculateFullBreakdown(state)` | MAIN FUNCTION — full before/after results |
| `calculateBonusSacrifice(bonus, sacrificePct, state)` | Bonus scenario modelling |
| `calculate2029NICapImpact(pensionSacrifice, state)` | Post-2029 NI saving change |
| `calculateMortgageImpact(state)` | Gross vs post-sacrifice borrowing capacity |
| `calculateCarryForward(contributions, taxYear)` | Unused pension allowance |

**Tax years supported:** `2024/25`, `2025/26`, `2026/27`

**Regions supported:** `england` (covers England, Wales, NI), `scotland`

---

## Salary sacrifice schemes

All schemes are stored in wizard state under `sacrifice` and processed by `calculateTotalSacrifice()`. Each scheme has:
- `enabled: boolean`
- `value: number` (monthly £ or annual £ depending on scheme)
- scheme-specific fields (e.g. pension has `method`, EV has `monthlyLease`)

Current schemes: `pension`, `ev`, `cycleToWork`, `childcareVouchers`, `technology`, `healthcare`, `gym`

To add a new scheme:
1. Add to initial state in WizardContext.js
2. Add toggle and input UI in Step2Sacrifice.js
3. Add calculation in calculateTotalSacrifice() in taxEngine.js
4. Add to before/after breakdown in calculateFullBreakdown()
5. Add to encodeStateToURL() and decodeURLToState() in urlParams.js

---

## Known issues and pending work

These are known issues — do not reintroduce them:

- **Leading zeros in numeric inputs** — fixed. All onChange handlers parse with parseInt/parseFloat before storing in state.
- **ANI banner drift** — fixed. Banner now calls calculateTotalSacrifice() directly.
- **Pension method ignored** — fixed. Net pay vs relief at source now affects calculation and labels.
- **Childcare cost not used** — fixed. monthlyCostPerChild from Step 1 is now passed to calculateChildcareEntitlements().

Pending features (not yet built):
- Mortgage toggle should appear directly under the toggle button, not at the bottom of the page
- Employer pension basis toggle (base salary vs post-sacrifice salary)
- FAQ section at the bottom of Step4Results.js
- Bonus scenarios should recalculate results when user returns to Step 3 after visiting results
- Self-assessment reminder for relief at source users

---

## Deployment

- **Hosting:** Vercel, auto-deploys on push to `main`
- **Node version:** 20.x (set in vercel.json, frontend/package.json engines, frontend/.nvmrc)
- **Root directory:** `frontend/` (set in Vercel project settings)
- **Build command:** `npm run build`
- **Install command:** `npm install --legacy-peer-deps`
- **Output directory:** `build`
- **Team:** accelerate-ys
- **Project ID:** prj_igcvEGnWzqyMPlaGcEnNenQwc8qF

After committing and pushing to main, Vercel deploys automatically. Use the Vercel connector to trigger a deployment manually if needed.

---

## Coding conventions

- All components are functional React with hooks
- Tailwind CSS for styling — use core utility classes only
- Radix UI for accessible primitives
- No inline styles except where Tailwind doesn't cover the use case
- All monetary values stored as integers (pence) internally, formatted with formatters.js for display
- Tax year passed as string: `"2025/26"` not `2025`
- Region passed as string: `"england"` or `"scotland"` (lowercase)
- Sentence case for all UI labels — never Title Case or ALL CAPS
- No console.log, TODO, or FIXME comments in committed code

---

## Testing

There is no automated test suite. Verify changes by:
1. Running `npm run build` — must pass with no errors
2. Running through the wizard manually with the standard test scenario (see below)
3. Checking the before/after table figures match expected values

**Standard test scenario:**
- Salary: £120,000, England, Age 40, Employer pension 3%
- Children: 2, ages 3 and 5, £800/month
- Pension sacrifice: £1,667/month
- Expected: Tax saved ~£10,002, NI saved ~£400, Total saved ~£10,402, Childcare preserved ~£13,600/yr
