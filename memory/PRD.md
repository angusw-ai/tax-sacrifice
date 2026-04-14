# UK Salary Sacrifice & Savings Optimiser — PRD

## Problem Statement
Build a multi-step wizard web app for UK high earners (£50k-£200k+) to model salary sacrifice, tax impact, and pension vs ISA savings comparison. Premium "old money" aesthetic.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI (minimal — health check only)
- **Database**: MongoDB (available but unused for v1 — no auth/data persistence)
- **Calculations**: All client-side in JavaScript

## User Persona
UK employees, particularly higher/additional rate taxpayers, wanting to optimise take-home pay via salary sacrifice and savings vehicles.

## Core Requirements (Static)
1. 4-step wizard: Situation → Salary Sacrifice → Pension vs ISA → Results
2. UK 2024/25 tax engine (England/Wales/NI + Scotland bands)
3. Personal Allowance taper (£100k–£125,140)
4. Employee NI, Employer NI, Student Loan calculations
5. 6 salary sacrifice schemes (Pension, EV, Cycle, Childcare, Tech, Healthcare)
6. Pension vs ISA comparison with projections
7. Smart insights engine (60% trap, HICBC, tax relief messaging)
8. Charts (stacked bar, pie, line)
9. Print-to-PDF via browser

## What's Been Implemented (April 2026)
- [x] Full 5-step wizard with state management (React Context)
- [x] Complete UK tax engine (PA taper, NI, student loans)
- [x] 2024/25 AND 2025/26 tax year support with dropdown selector
- [x] Monthly/Annual toggle throughout the entire wizard
- [x] **Bonus Sacrifice Calculator** (Step 3) — model cash vs sacrifice with threshold warnings
- [x] **Children & Childcare** — Tax-Free Childcare (£2k/child) and 30 Free Hours modelling with £100k cliff-edge warning
- [x] **Mortgage Impact Warning** — gross vs post-sacrifice borrowing capacity with lender-specific advice
- [x] **Pension Carry Forward** — 3-year unused allowance calculator
- [x] **2029 NI Cap Impact** — current vs post-2029 NI savings comparison
- [x] **Adjusted Net Income Banner** — persistent real-time indicator with colour-coded threshold warnings (£60k, £80k, £100k, £125,140)
- [x] **Employer NI Pass-back Toggle** — models employer rebating their NI saving
- [x] **Statutory Pay Warning** — flags risk to SMP/SPP and state pension
- [x] All 6 salary sacrifice schemes with real-time savings
- [x] Pension vs ISA comparison with simple/advanced views
- [x] Recharts charts (stacked bar, pie, line projections)
- [x] Smart insights engine (60% trap, HICBC, annual allowance warnings)
- [x] Old Money aesthetic
- [x] Print-to-PDF via window.print()
- [x] Mobile responsive + data-testid attributes

## Prioritized Backlog
### P0 (Done)
- All core wizard functionality
- Tax calculations
- Charts and visualizations

### P1 (Next)
- Shareable link generation
- Scenario comparison (save multiple configurations side-by-side)
- Improve chart responsiveness during tab transitions

### P2 (Future)
- User accounts and saved scenarios
- Full PDF generation (server-side)
- 2025/26 tax year rates
- Real investment fund selection
- Employer NI pass-back modelling
