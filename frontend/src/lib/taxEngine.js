// UK Tax Engine — supports 2024/25 and 2025/26

const TAX_YEARS = {
  '2024/25': {
    PERSONAL_ALLOWANCE: 12570,
    PA_TAPER_START: 100000,
    PA_TAPER_END: 125140,
    NI_PRIMARY_THRESHOLD: 12570,
    NI_UPPER_LIMIT: 50270,
    NI_LOWER_RATE: 0.08,
    NI_UPPER_RATE: 0.02,
    EMPLOYER_NI_THRESHOLD: 9100,
    EMPLOYER_NI_RATE: 0.138,
    PENSION_ANNUAL_ALLOWANCE: 60000,
    ISA_ANNUAL_ALLOWANCE: 20000,
    LISA_ANNUAL_ALLOWANCE: 4000,
    LISA_BONUS_RATE: 0.25,
    HICBC_START: 60000,
    HICBC_END: 80000,
    STUDENT_LOANS: {
      plan1: { threshold: 22015, rate: 0.09 },
      plan2: { threshold: 27295, rate: 0.09 },
      plan4: { threshold: 27660, rate: 0.09 },
      postgrad: { threshold: 21000, rate: 0.06 },
    },
    SCOTLAND_BANDS: [
      { name: 'Starter Rate (19%)', rate: 0.19, upper: 14876 },
      { name: 'Basic Rate (20%)', rate: 0.20, upper: 26561 },
      { name: 'Intermediate Rate (21%)', rate: 0.21, upper: 43662 },
      { name: 'Higher Rate (42%)', rate: 0.42, upper: 75000 },
      { name: 'Advanced Rate (45%)', rate: 0.45, upper: 125140 },
      { name: 'Top Rate (48%)', rate: 0.48, upper: Infinity },
    ],
    SCOTLAND_MARGINAL: [
      { threshold: 125140, rate: 0.48 },
      { threshold: 75000, rate: 0.45 },
      { threshold: 43662, rate: 0.42 },
      { threshold: 26561, rate: 0.21 },
      { threshold: 14876, rate: 0.20 },
      { threshold: 12570, rate: 0.19 },
    ],
  },
  '2025/26': {
    PERSONAL_ALLOWANCE: 12570,
    PA_TAPER_START: 100000,
    PA_TAPER_END: 125140,
    NI_PRIMARY_THRESHOLD: 12570,
    NI_UPPER_LIMIT: 50270,
    NI_LOWER_RATE: 0.08,
    NI_UPPER_RATE: 0.02,
    EMPLOYER_NI_THRESHOLD: 5000,
    EMPLOYER_NI_RATE: 0.15,
    PENSION_ANNUAL_ALLOWANCE: 60000,
    ISA_ANNUAL_ALLOWANCE: 20000,
    LISA_ANNUAL_ALLOWANCE: 4000,
    LISA_BONUS_RATE: 0.25,
    HICBC_START: 60000,
    HICBC_END: 80000,
    STUDENT_LOANS: {
      plan1: { threshold: 26065, rate: 0.09 },
      plan2: { threshold: 28470, rate: 0.09 },
      plan4: { threshold: 32745, rate: 0.09 },
      postgrad: { threshold: 21000, rate: 0.06 },
    },
    SCOTLAND_BANDS: [
      { name: 'Starter Rate (19%)', rate: 0.19, upper: 15397 },
      { name: 'Basic Rate (20%)', rate: 0.20, upper: 27491 },
      { name: 'Intermediate Rate (21%)', rate: 0.21, upper: 43662 },
      { name: 'Higher Rate (42%)', rate: 0.42, upper: 75000 },
      { name: 'Advanced Rate (45%)', rate: 0.45, upper: 125140 },
      { name: 'Top Rate (48%)', rate: 0.48, upper: Infinity },
    ],
    SCOTLAND_MARGINAL: [
      { threshold: 125140, rate: 0.48 },
      { threshold: 75000, rate: 0.45 },
      { threshold: 43662, rate: 0.42 },
      { threshold: 27491, rate: 0.21 },
      { threshold: 15397, rate: 0.20 },
      { threshold: 12570, rate: 0.19 },
    ],
  },
};

export const DEFAULT_TAX_YEAR = '2025/26';
export const AVAILABLE_TAX_YEARS = Object.keys(TAX_YEARS);

export function getConstants(taxYear = DEFAULT_TAX_YEAR) {
  return TAX_YEARS[taxYear] || TAX_YEARS[DEFAULT_TAX_YEAR];
}

// Backward-compatible export pointing to default year
export const TAX_CONSTANTS = TAX_YEARS[DEFAULT_TAX_YEAR];

export function calculatePersonalAllowance(income, taxYear) {
  const c = getConstants(taxYear);
  if (income <= c.PA_TAPER_START) return c.PERSONAL_ALLOWANCE;
  const reduction = Math.floor((income - c.PA_TAPER_START) / 2);
  return Math.max(0, c.PERSONAL_ALLOWANCE - reduction);
}

export function calculateIncomeTax(income, region = 'england', taxYear) {
  const c = getConstants(taxYear);
  const pa = calculatePersonalAllowance(income, taxYear);

  let bands;
  if (region === 'scotland') {
    bands = [
      { name: 'Personal Allowance', rate: 0, upper: pa },
      ...c.SCOTLAND_BANDS,
    ];
  } else {
    bands = [
      { name: 'Personal Allowance', rate: 0, upper: pa },
      { name: 'Basic Rate (20%)', rate: 0.20, upper: 50270 },
      { name: 'Higher Rate (40%)', rate: 0.40, upper: 125140 },
      { name: 'Additional Rate (45%)', rate: 0.45, upper: Infinity },
    ];
  }

  let totalTax = 0;
  const breakdown = [];
  let prevUpper = 0;

  for (const band of bands) {
    if (band.upper <= prevUpper) continue;
    const lower = prevUpper;
    const effectiveUpper = band.upper === Infinity ? income : Math.min(band.upper, income);
    const amount = Math.max(0, effectiveUpper - lower);
    if (amount > 0) {
      const tax = amount * band.rate;
      totalTax += tax;
      breakdown.push({ name: band.name, rate: band.rate, amount, tax });
    }
    prevUpper = band.upper;
    if (income <= band.upper) break;
  }

  return { totalTax, breakdown, personalAllowance: pa };
}

export function calculateEmployeeNI(income, taxYear) {
  const c = getConstants(taxYear);
  let ni = 0;
  if (income > c.NI_PRIMARY_THRESHOLD) {
    const band = Math.min(income, c.NI_UPPER_LIMIT) - c.NI_PRIMARY_THRESHOLD;
    ni += Math.max(0, band) * c.NI_LOWER_RATE;
  }
  if (income > c.NI_UPPER_LIMIT) {
    ni += (income - c.NI_UPPER_LIMIT) * c.NI_UPPER_RATE;
  }
  return ni;
}

export function calculateEmployerNI(income, taxYear) {
  const c = getConstants(taxYear);
  if (income <= c.EMPLOYER_NI_THRESHOLD) return 0;
  return (income - c.EMPLOYER_NI_THRESHOLD) * c.EMPLOYER_NI_RATE;
}

export function calculateStudentLoan(income, plan, taxYear) {
  if (!plan || plan === 'none') return 0;
  const c = getConstants(taxYear);
  const config = c.STUDENT_LOANS[plan];
  if (!config || income <= config.threshold) return 0;
  return (income - config.threshold) * config.rate;
}

export function getMarginalTaxRate(income, region, taxYear) {
  const c = getConstants(taxYear);
  if (income > c.PA_TAPER_START && income <= c.PA_TAPER_END) {
    return region === 'scotland' ? 0.63 : 0.60;
  }
  if (region === 'scotland') {
    for (const { threshold, rate } of c.SCOTLAND_MARGINAL) {
      if (income > threshold) return rate;
    }
    return 0;
  }
  if (income > 125140) return 0.45;
  if (income > 50270) return 0.40;
  if (income > 12570) return 0.20;
  return 0;
}

export function getMarginalNIRate(income, taxYear) {
  const c = getConstants(taxYear);
  if (income > c.NI_UPPER_LIMIT) return c.NI_UPPER_RATE;
  if (income > c.NI_PRIMARY_THRESHOLD) return c.NI_LOWER_RATE;
  return 0;
}

export function getChildcareVoucherCap(income, region) {
  // Based on income band, not effective marginal rate (PA taper doesn't affect this)
  if (income > 125140) return 97;  // Additional rate
  if (region === 'scotland') {
    if (income > 43662) return 124; // Higher rate in Scotland
  } else {
    if (income > 50270) return 124; // Higher rate in England
  }
  return 243; // Basic rate
}

export function calculatePensionContribution(salary, pensionScheme) {
  if (!pensionScheme?.enabled) {
    return {
      method: 'netpay',
      inputAmount: 0,
      salaryReduction: 0,
      netContribution: 0,
      taxReliefAtSource: 0,
      grossContribution: 0,
    };
  }

  const inputAmount = pensionScheme.inputType === 'percentage'
    ? salary * ((pensionScheme.value || 0) / 100)
    : (pensionScheme.value || 0) * 12;

  if (pensionScheme.method === 'relief') {
    const taxReliefAtSource = inputAmount * 0.25;
    return {
      method: 'relief',
      inputAmount,
      salaryReduction: 0,
      netContribution: inputAmount,
      taxReliefAtSource,
      grossContribution: inputAmount + taxReliefAtSource,
    };
  }

  return {
    method: 'netpay',
    inputAmount,
    salaryReduction: inputAmount,
    netContribution: inputAmount,
    taxReliefAtSource: 0,
    grossContribution: inputAmount,
  };
}

export function calculateTotalSacrifice(salary, schemes) {
  let totalAnnual = 0;
  let bikValue = 0;
  const details = {};

  if (schemes.pension?.enabled) {
    details.pension = calculatePensionContribution(salary, schemes.pension);
    totalAnnual += details.pension.salaryReduction;
  }

  if (schemes.ev?.enabled) {
    const annual = (schemes.ev.monthlyCost || 0) * 12;
    details.ev = annual;
    totalAnnual += annual;
    bikValue += (schemes.ev.listPrice || 0) * 0.02;
  }

  if (schemes.cycle?.enabled) {
    details.cycle = Math.min(schemes.cycle.value || 0, schemes.cycle.cap || 1000);
    totalAnnual += details.cycle;
  }

  if (schemes.childcare?.enabled) {
    const annual = (schemes.childcare.monthlyAmount || 0) * 12;
    details.childcare = annual;
    totalAnnual += annual;
  }

  if (schemes.tech?.enabled) {
    details.tech = Math.min(schemes.tech.value || 0, 3000);
    totalAnnual += details.tech;
  }

  if (schemes.healthcare?.enabled) {
    const annual = (schemes.healthcare.monthlyPremium || 0) * 12;
    details.healthcare = annual;
    totalAnnual += annual;
    bikValue += annual;
  }

  return { totalAnnual, bikValue, details };
}

export function calculateFullBreakdown(salary, region, studentLoan, schemes, employerPensionPct = 0, taxYear) {
  const { totalAnnual, bikValue, details } = calculateTotalSacrifice(salary, schemes);
  const pensionDetails = details.pension || calculatePensionContribution(salary, schemes.pension);

  // Before sacrifice
  const beforeTax = calculateIncomeTax(salary, region, taxYear);
  const beforeNI = calculateEmployeeNI(salary, taxYear);
  const beforeEmployerNI = calculateEmployerNI(salary, taxYear);
  const beforeStudentLoan = calculateStudentLoan(salary, studentLoan, taxYear);
  const beforeTakeHome = salary - beforeTax.totalTax - beforeNI - beforeStudentLoan;

  // After sacrifice
  const adjustedSalary = Math.max(0, salary - totalAnnual);
  const taxableIncome = adjustedSalary + bikValue;
  const afterTax = calculateIncomeTax(taxableIncome, region, taxYear);
  const afterNI = calculateEmployeeNI(adjustedSalary, taxYear);
  const afterEmployerNI = calculateEmployerNI(adjustedSalary, taxYear);
  const afterStudentLoan = calculateStudentLoan(adjustedSalary, studentLoan, taxYear);
  const postTaxDeductions = pensionDetails.method === 'relief' ? pensionDetails.netContribution : 0;
  const afterTakeHome = adjustedSalary - afterTax.totalTax - afterNI - afterStudentLoan - postTaxDeductions;

  const employerPension = salary * (employerPensionPct / 100);
  const employerNISaved = beforeEmployerNI - afterEmployerNI;
  const taxSaved = beforeTax.totalTax - afterTax.totalTax;
  const niSaved = beforeNI - afterNI;
  const studentLoanSaved = beforeStudentLoan - afterStudentLoan;

  return {
    before: {
      grossSalary: salary,
      incomeTax: beforeTax,
      employeeNI: beforeNI,
      employerNI: beforeEmployerNI,
      studentLoan: beforeStudentLoan,
      takeHome: beforeTakeHome,
    },
    after: {
      grossSalary: salary,
      adjustedSalary,
      totalSacrifice: totalAnnual,
      bikValue,
      incomeTax: afterTax,
      employeeNI: afterNI,
      employerNI: afterEmployerNI,
      studentLoan: afterStudentLoan,
      takeHome: afterTakeHome,
    },
    savings: {
      taxSaved,
      niSaved,
      studentLoanSaved,
      totalSaved: taxSaved + niSaved + studentLoanSaved,
      employerNISaved,
    },
    pension: {
      method: pensionDetails.method,
      salarySacrificeContribution: pensionDetails.salaryReduction,
      netContribution: pensionDetails.netContribution,
      taxReliefAtSource: pensionDetails.taxReliefAtSource,
      employeeContribution: pensionDetails.grossContribution,
      employerContribution: employerPension,
      totalContribution: pensionDetails.grossContribution + employerPension,
    },
    sacrificeDetails: details,
  };
}


// ===== BONUS SACRIFICE CALCULATOR =====
export function calculateBonusTaxation(salary, bonus, region, studentLoan, sacrificeAmount, taxYear) {
  if (!bonus || bonus <= 0) return null;
  const safeS = Math.min(sacrificeAmount || 0, bonus);

  // Base: salary only
  const baseTax = calculateIncomeTax(salary, region, taxYear);
  const baseNI = calculateEmployeeNI(salary, taxYear);
  const baseSL = calculateStudentLoan(salary, studentLoan, taxYear);
  const baseTakeHome = salary - baseTax.totalTax - baseNI - baseSL;

  // Scenario A: full bonus as cash
  const totalCash = salary + bonus;
  const cashTax = calculateIncomeTax(totalCash, region, taxYear);
  const cashNI = calculateEmployeeNI(totalCash, taxYear);
  const cashSL = calculateStudentLoan(totalCash, studentLoan, taxYear);
  const cashTakeHome = totalCash - cashTax.totalTax - cashNI - cashSL;

  // Scenario B: sacrifice portion
  const totalAfter = salary + bonus - safeS;
  const afterTax = calculateIncomeTax(totalAfter, region, taxYear);
  const afterNI = calculateEmployeeNI(totalAfter, taxYear);
  const afterSL = calculateStudentLoan(totalAfter, studentLoan, taxYear);
  const afterTakeHome = totalAfter - afterTax.totalTax - afterNI - afterSL;

  const bonusTaxAsCash = cashTax.totalTax - baseTax.totalTax;
  const bonusNIAsCash = cashNI - baseNI;
  const bonusSLAsCash = cashSL - baseSL;
  const netBonusCash = bonus - bonusTaxAsCash - bonusNIAsCash - bonusSLAsCash;

  const splitTax = afterTax.totalTax - baseTax.totalTax;
  const splitNI = afterNI - baseNI;
  const splitSL = afterSL - baseSL;
  const cashPortion = bonus - safeS;
  const netCashPortion = cashPortion - splitTax - splitNI - splitSL;

  const effectiveRateCash = bonus > 0 ? (bonusTaxAsCash + bonusNIAsCash + bonusSLAsCash) / bonus : 0;
  const effectiveRateSplit = cashPortion > 0 ? (splitTax + splitNI + splitSL) / cashPortion : 0;

  const thresholds = [];
  if (totalCash > 125140 && salary <= 125140) thresholds.push({ threshold: 125140, label: '£125,140 — PA fully lost', needed: totalCash - 125140 });
  if (totalCash > 100000 && salary <= 100000) thresholds.push({ threshold: 100000, label: '£100k — PA taper + childcare lost', needed: totalCash - 100000 });
  if (totalCash > 80000 && salary <= 80000) thresholds.push({ threshold: 80000, label: '£80k — Full HICBC', needed: totalCash - 80000 });
  if (totalCash > 60000 && salary <= 60000) thresholds.push({ threshold: 60000, label: '£60k — HICBC starts', needed: totalCash - 60000 });

  return {
    totalWithBonus: totalCash,
    adjustedAfterSacrifice: totalAfter,
    asCash: { net: netBonusCash, tax: bonusTaxAsCash, ni: bonusNIAsCash, sl: bonusSLAsCash, rate: effectiveRateCash },
    afterSacrifice: { net: netCashPortion, tax: splitTax, ni: splitNI, sl: splitSL, pensionIn: safeS, rate: effectiveRateSplit },
    saved: { tax: bonusTaxAsCash - splitTax, ni: bonusNIAsCash - splitNI, sl: bonusSLAsCash - splitSL, total: (bonusTaxAsCash + bonusNIAsCash + bonusSLAsCash) - (splitTax + splitNI + splitSL) },
    thresholds,
  };
}

// ===== CHILDCARE ENTITLEMENTS =====
export function calculateChildcareEntitlements(adjustedIncome, numChildren, childAges) {
  const TFC_PER_CHILD = 2000;
  const FREE_HOURS_MONTHLY = 300;
  let tfcValue = 0;
  let freeHoursValue = 0;
  for (let i = 0; i < numChildren; i++) {
    const age = (childAges && childAges[i]) || 3;
    if (age < 12) tfcValue += TFC_PER_CHILD;
    if (age >= 2 && age <= 4) freeHoursValue += FREE_HOURS_MONTHLY * 12;
  }
  const eligible = adjustedIncome < 100000;
  const totalValue = eligible ? tfcValue + freeHoursValue : 0;
  const totalAtRisk = tfcValue + freeHoursValue;
  return {
    eligible,
    tfcValue: eligible ? tfcValue : 0,
    freeHoursValue: eligible ? freeHoursValue : 0,
    totalValue,
    totalAtRisk,
    amountOver: Math.max(0, adjustedIncome - 100000),
    sacrificeToRestore: Math.max(0, adjustedIncome - 100000),
  };
}

// ===== CARRY FORWARD =====
export function calculateCarryForward(y1 = 0, y2 = 0, y3 = 0, aa = 60000) {
  const unused1 = Math.max(0, aa - y1);
  const unused2 = Math.max(0, aa - y2);
  const unused3 = Math.max(0, aa - y3);
  const totalUnused = unused1 + unused2 + unused3;
  return {
    years: [
      { label: '3 years ago', contributed: y1, unused: unused1 },
      { label: '2 years ago', contributed: y2, unused: unused2 },
      { label: 'Last year', contributed: y3, unused: unused3 },
    ],
    totalUnused,
    maxThisYear: aa + totalUnused,
  };
}

// ===== 2029 NI CAP IMPACT =====
export function calculate2029NImpact(annualSacrifice, salary, taxYear) {
  const c = getConstants(taxYear);
  const NI_CAP = 2000;
  const niRate = salary > c.NI_UPPER_LIMIT ? c.NI_UPPER_RATE : c.NI_LOWER_RATE;
  const currentEmpNISaving = annualSacrifice * niRate;
  const exemptPortion = Math.min(annualSacrifice, NI_CAP);
  const nonExempt = Math.max(0, annualSacrifice - NI_CAP);
  const post2029EmpNISaving = exemptPortion * niRate;
  const additionalNICost = nonExempt * niRate;
  const currentErNISaving = annualSacrifice * c.EMPLOYER_NI_RATE;
  const post2029ErNISaving = exemptPortion * c.EMPLOYER_NI_RATE;
  const additionalErNICost = nonExempt * c.EMPLOYER_NI_RATE;
  const margTax = getMarginalTaxRate(salary, 'england', taxYear);
  const taxRelief = annualSacrifice * margTax;
  return {
    currentEmployeeSaving: currentEmpNISaving,
    post2029EmployeeSaving: post2029EmpNISaving,
    additionalEmployeeCost: additionalNICost,
    currentEmployerSaving: currentErNISaving,
    post2029EmployerSaving: post2029ErNISaving,
    additionalEmployerCost: additionalErNICost,
    incomeTaxRelief: taxRelief,
    currentTotal: currentEmpNISaving + taxRelief,
    post2029Total: post2029EmpNISaving + taxRelief,
    annualCostIncrease: additionalNICost + additionalErNICost,
    stillWorthIt: taxRelief > additionalNICost,
  };
}

// ===== MORTGAGE CAPACITY =====
export function calculateMortgageCapacity(gross, postSacrifice) {
  const m = 4.5;
  return { gross: gross * m, postSacrifice: postSacrifice * m, diff: (gross - postSacrifice) * m };
}

// ===== STATUTORY PAY WARNING =====
export function checkStatutoryPayRisk(postSacrificeSalary) {
  const LEL = 6396;
  const NMW = 24334;
  const warnings = [];
  if (postSacrificeSalary < LEL * 1.2) warnings.push('Post-sacrifice salary is near the Lower Earnings Limit (£6,396/yr). This may affect State Pension qualifying years and Statutory Maternity/Paternity Pay.');
  if (postSacrificeSalary < NMW * 1.1) warnings.push('Post-sacrifice salary approaches National Minimum Wage. Your employer cannot reduce pay below NMW via salary sacrifice.');
  return warnings;
}
