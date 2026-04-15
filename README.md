# UK Salary Sacrifice Optimiser

A free, comprehensive UK salary sacrifice calculator built for higher earners who want to understand exactly how to maximise their salary sacrifice benefits, minimise their tax burden, and make smarter decisions about pension contributions, ISA savings, and bonus sacrifice.

**Live at:** https://tax-sacrifice.vercel.app

---

## Why this exists

Most free salary sacrifice calculators handle basic take-home pay. None of them properly model the personal allowance taper, the childcare cliff edge, bonus sacrifice scenarios, or the 2029 NI cap changes — the things that actually matter for anyone earning over £100k.

This tool was built to fill that gap. It's free, requires no login, and stores nothing.

---

## Features

### Multi-step wizard

The app is structured as a 5-step wizard:

1. **Your Situation** — salary, tax region, student loans, age, employer pension, children
2. **Salary Sacrifice Schemes** — configure active schemes with real-time tax previews
3. **Bonus Sacrifice** — model up to 3 bonus scenarios side by side
4. **Pension vs ISA** — compare savings vehicles with 25-year projections
5. **Results** — full before/after breakdown with smart insights

---

### Tax calculations

**England / Wales / Northern Ireland (2025/26):**
- Personal Allowance: £12,570 (tapered above £100k, withdrawn at £125,140)
- Basic rate: 20% (£12,571–£50,270)
- Higher rate: 40% (£50,271–£125,140)
- Additional rate: 45% (above £125,140)

**Scotland (2025/26) — full 6-band calculation:**
- Starter rate: 19% (£12,571–£14,876)
- Basic rate: 20% (£14,877–£26,561)
- Intermediate rate: 21% (£26,562–£43,662)
- Higher rate: 42% (£43,663–£75,000)
- Advanced rate: 45% (£75,001–£125,140)
- Top rate: 48% (above £125,140)

**National Insurance:**
- Employee: 8% on £12,570–£50,270, 2% above £50,270
- Employer: 15% above £9,100 (secondary threshold)

**Student loans:**
- Plan 1, Plan 2, Plan 4
- Postgraduate loan (separate toggle, can be held simultaneously with a plan)

**Tax years supported:** 2024/25, 2025/26, 2026/27

---

### Salary sacrifice schemes

All schemes reduce gross salary before tax and NI:

| Scheme | Notes |
|--------|-------|
| Pension contributions | Salary sacrifice or relief at source; net pay arrangement |
| Electric Vehicle (EV) lease | 2% BIK applied to adjusted salary |
| Cycle to Work | £1,000 standard cap or £2,500 for bikes |
| Childcare vouchers | Rate-dependent cap (£243 / £124 / £97 per month) |
| Technology scheme | Up to £3,000, spread over 12 months |
| Healthcare / dental | P11D benefit — taxable but NI-free via sacrifice |
| Gym membership / flex benefits | Availability varies by employer |

---

### Personal allowance trap

For incomes between £100,000–£125,140, the personal allowance tapers at £1 for every £2 earned, creating an effective 60% tax rate. The tool:

- Shows the exact sacrifice amount needed to restore the full £12,570 personal allowance
- Calculates the net benefit of sacrificing into this band
- Displays the **Net Cost of Sacrifice** row in the results table, showing: sacrifice amount minus tax/NI saved = true out-of-pocket cost

---

### Childcare cliff edge

Above £100,000 adjusted net income, all childcare entitlements are lost:

- **Tax-Free Childcare:** up to £2,000/child/year (£4,000 for disabled)
- **30 free hours:** worth approximately £3,600/child/year for 3–4 year olds

The tool calculates total entitlement value being lost and shows exactly how much pension sacrifice would restore eligibility — often making the net cost of sacrifice effectively zero or negative.

---

### Bonus sacrifice

Model up to 3 bonus sacrifice scenarios side by side:

- Take all as cash
- Sacrifice a percentage
- Sacrifice all

Each scenario shows: gross bonus, amount sacrificed, amount taken as cash, income tax and NI on cash portion, effective tax rate, net cash received, total pension contribution, and whether Tax-Free Childcare eligibility is maintained.

---

### Pension vs ISA comparison

Model the same monthly contribution across multiple savings vehicles:

| Vehicle | Key features |
|---------|-------------|
| Pension (salary sacrifice) | Tax + NI relief; locked until 55/57; 25% tax-free lump sum |
| Stocks & Shares ISA | Tax-free growth and withdrawals; £20k annual allowance |
| Cash ISA | Tax-free; lower growth assumption; £20k annual allowance |
| Lifetime ISA (LISA) | 25% government bonus; max £4k/year; 25% penalty before 60 |

Features:
- Adjustable growth rate (default 5%) and time horizon (default 20 years)
- Combination split — allocate monthly saving across multiple vehicles
- Simple comparison cards and advanced projection line chart
- Pension carry forward calculator — 3-year unused allowance lookup

---

### 2029 NI cap modeller

From April 2029, only the first £2,000 of pension salary sacrifice per year will be exempt from NI. The tool:

- Shows current NI saving vs post-2029 NI saving
- Calculates the additional annual NI cost
- Confirms whether sacrifice remains worthwhile (income tax relief continues in full)

---

### Mortgage impact warning

When the mortgage toggle is enabled:

- Shows estimated borrowing capacity on gross salary (4.5x) vs post-sacrifice salary
- Flags that EV salary sacrifice is a fixed-term commitment (2–4 years) which some lenders treat as a permanent income reduction
- Notes that pension sacrifice is generally treated more favourably by lenders due to flexibility

---

### Smart insights engine

Throughout the results page, contextual callouts surface automatically based on the user's inputs:

- "Your salary sacrifice has restored your full Personal Allowance — the single most powerful tax optimisation for your income"
- "Each £1 into your pension costs you only ~58p after tax and NI relief"
- "You are £X above the £100k threshold — sacrificing £X more would restore £Y/year in childcare entitlements"
- "Your bonus pushes your adjusted net income above £100k — consider sacrificing £X to stay below the threshold"
- "LISA eligible — 25% government bonus on up to £4,000/year is an instant return"
- "After April 2029, your NI saving on sacrifice above £2,000 will be removed — income tax relief continues"

---

### Adjusted Net Income banner

A persistent banner below the nav shows the user's adjusted net income in real time, with colour-coded threshold indicators at £60k, £80k, £100k, and £125,140.

---

### Shareable results URL

Results can be shared via a URL that encodes all wizard state as query parameters. When opened, the app pre-fills all inputs and jumps directly to the results page. Includes a "Start over" link for recipients who want to model their own scenario.

---

## Tech stack

- **Frontend:** React 19 (Create React App via CRACO)
- **Styling:** Tailwind CSS + Radix UI primitives
- **Charts:** Recharts
- **Analytics:** Vercel Analytics
- **Hosting:** Vercel
- **CI/CD:** GitHub → Vercel auto-deploy on push to main

All tax calculations are performed entirely client-side in JavaScript. No backend, no API calls, no data stored.

---

## Project structure

```
frontend/
├── src/
│   ├── App.js                    # Root component, WizardProvider
│   ├── context/
│   │   └── WizardContext.js      # Central wizard state and reducer
│   ├── components/
│   │   ├── WizardShell.js        # Shell, header, step navigation
│   │   └── AdjustedNetIncomeBanner.js
│   ├── pages/
│   │   ├── Step1Situation.js     # Salary, region, loans, children
│   │   ├── Step2Sacrifice.js     # Scheme selection and configuration
│   │   ├── StepBonusSacrifice.js # Bonus sacrifice scenarios
│   │   ├── Step3Comparison.js    # Pension vs ISA comparison
│   │   └── Step4Results.js       # Results dashboard
│   └── lib/
│       ├── taxEngine.js          # All tax and NI calculation logic
│       ├── projectionEngine.js   # Pension/ISA growth projections
│       ├── insightsEngine.js     # Smart insight rules
│       ├── formatters.js         # Currency and input helpers
│       └── urlParams.js          # Share link encoding/decoding
└── public/
    └── index.html
```

---

## Running locally

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

App runs at `http://localhost:3000`

Note: requires Node.js 20.x

---

## Disclaimer

This calculator provides estimates for guidance only and does not constitute financial advice. Tax rules are subject to change. Always consult a qualified financial adviser before making decisions about your salary, pension, or savings.

---

## Roadmap

- [ ] Mortgage section moved to appear directly under toggle
- [ ] Gym flex / flexible benefits scheme
- [ ] 2026/27 tax year
- [ ] Employer pension basis toggle (base salary vs post-sacrifice)
- [ ] FAQ section on results page
- [ ] Bonus month timing (affects which tax period bonus falls in)
- [ ] Self-assessment reminder for relief at source users
- [ ] Mobile optimisation improvements

---

## Support

If this tool has saved you money, you can support its development at [buymeacoffee.com](https://buymeacoffee.com).

Built by Angus Wilkinson. If you're working on something interesting in fintech, property, or AI tools — or just want to connect — feel free to reach out.
