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

export function calculateTotalSacrifice(salary, schemes) {
  let totalAnnual = 0;
  let bikValue = 0;
  const details = {};

  if (schemes.pension?.enabled) {
    const annual = schemes.pension.inputType === 'percentage'
      ? salary * ((schemes.pension.value || 0) / 100)
      : (schemes.pension.value || 0) * 12;
    details.pension = annual;
    totalAnnual += annual;
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
  const afterTakeHome = adjustedSalary - afterTax.totalTax - afterNI - afterStudentLoan;

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
      employeeContribution: details.pension || 0,
      employerContribution: employerPension,
      totalContribution: (details.pension || 0) + employerPension,
    },
    sacrificeDetails: details,
  };
}
