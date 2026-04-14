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
- [x] Full 4-step wizard with state management (React Context)
- [x] Complete UK tax engine (2024/25 bands, PA taper, NI, student loans)
- [x] All 6 salary sacrifice schemes with real-time savings
- [x] Pension vs ISA comparison with simple/advanced views
- [x] Recharts charts (stacked bar, pie, line projections)
- [x] Smart insights engine (60% trap, HICBC, annual allowance warnings)
- [x] Old Money aesthetic (Cormorant Garamond, IBM Plex, Heritage Green/Brass)
- [x] Print-to-PDF via window.print()
- [x] Mobile responsive
- [x] data-testid attributes on all interactive elements

## Prioritized Backlog
### P0 (Done)
- All core wizard functionality
- Tax calculations
- Charts and visualizations

### P1 (Next)
- Monthly/annual toggle throughout
- Shareable link generation
- Improve chart responsiveness during tab transitions

### P2 (Future)
- User accounts and saved scenarios
- Full PDF generation (server-side)
- 2025/26 tax year rates
- Real investment fund selection
- Employer NI pass-back modelling
