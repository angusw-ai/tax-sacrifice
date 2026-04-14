// UK Tax Engine 2024/25

export const TAX_CONSTANTS = {
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
};

const STUDENT_LOANS = {
  plan1: { threshold: 22015, rate: 0.09 },
  plan2: { threshold: 27295, rate: 0.09 },
  plan4: { threshold: 27660, rate: 0.09 },
  postgrad: { threshold: 21000, rate: 0.06 },
};

export function calculatePersonalAllowance(income) {
  if (income <= TAX_CONSTANTS.PA_TAPER_START) return TAX_CONSTANTS.PERSONAL_ALLOWANCE;
  const reduction = Math.floor((income - TAX_CONSTANTS.PA_TAPER_START) / 2);
  return Math.max(0, TAX_CONSTANTS.PERSONAL_ALLOWANCE - reduction);
}

export function calculateIncomeTax(income, region = 'england') {
  const pa = calculatePersonalAllowance(income);

  let bands;
  if (region === 'scotland') {
    bands = [
      { name: 'Personal Allowance', rate: 0, upper: pa },
      { name: 'Starter Rate (19%)', rate: 0.19, upper: 14876 },
      { name: 'Basic Rate (20%)', rate: 0.20, upper: 26561 },
      { name: 'Intermediate Rate (21%)', rate: 0.21, upper: 43662 },
      { name: 'Higher Rate (42%)', rate: 0.42, upper: 75000 },
      { name: 'Advanced Rate (45%)', rate: 0.45, upper: 125140 },
      { name: 'Top Rate (48%)', rate: 0.48, upper: Infinity },
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

export function calculateEmployeeNI(income) {
  let ni = 0;
  if (income > TAX_CONSTANTS.NI_PRIMARY_THRESHOLD) {
    const band = Math.min(income, TAX_CONSTANTS.NI_UPPER_LIMIT) - TAX_CONSTANTS.NI_PRIMARY_THRESHOLD;
    ni += Math.max(0, band) * TAX_CONSTANTS.NI_LOWER_RATE;
  }
  if (income > TAX_CONSTANTS.NI_UPPER_LIMIT) {
    ni += (income - TAX_CONSTANTS.NI_UPPER_LIMIT) * TAX_CONSTANTS.NI_UPPER_RATE;
  }
  return ni;
}

export function calculateEmployerNI(income) {
  if (income <= TAX_CONSTANTS.EMPLOYER_NI_THRESHOLD) return 0;
  return (income - TAX_CONSTANTS.EMPLOYER_NI_THRESHOLD) * TAX_CONSTANTS.EMPLOYER_NI_RATE;
}

export function calculateStudentLoan(income, plan) {
  if (!plan || plan === 'none') return 0;
  const config = STUDENT_LOANS[plan];
  if (!config || income <= config.threshold) return 0;
  return (income - config.threshold) * config.rate;
}

export function getMarginalTaxRate(income, region) {
  if (income > TAX_CONSTANTS.PA_TAPER_START && income <= TAX_CONSTANTS.PA_TAPER_END) {
    return region === 'scotland' ? 0.63 : 0.60;
  }
  if (region === 'scotland') {
    if (income > 125140) return 0.48;
    if (income > 75000) return 0.45;
    if (income > 43662) return 0.42;
    if (income > 26561) return 0.21;
    if (income > 14876) return 0.20;
    if (income > 12570) return 0.19;
    return 0;
  }
  if (income > 125140) return 0.45;
  if (income > 50270) return 0.40;
  if (income > 12570) return 0.20;
  return 0;
}

export function getMarginalNIRate(income) {
  if (income > TAX_CONSTANTS.NI_UPPER_LIMIT) return TAX_CONSTANTS.NI_UPPER_RATE;
  if (income > TAX_CONSTANTS.NI_PRIMARY_THRESHOLD) return TAX_CONSTANTS.NI_LOWER_RATE;
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

export function calculateFullBreakdown(salary, region, studentLoan, schemes, employerPensionPct = 0) {
  const { totalAnnual, bikValue, details } = calculateTotalSacrifice(salary, schemes);

  // Before sacrifice
  const beforeTax = calculateIncomeTax(salary, region);
  const beforeNI = calculateEmployeeNI(salary);
  const beforeEmployerNI = calculateEmployerNI(salary);
  const beforeStudentLoan = calculateStudentLoan(salary, studentLoan);
  const beforeTakeHome = salary - beforeTax.totalTax - beforeNI - beforeStudentLoan;

  // After sacrifice
  const adjustedSalary = Math.max(0, salary - totalAnnual);
  const taxableIncome = adjustedSalary + bikValue;
  const afterTax = calculateIncomeTax(taxableIncome, region);
  const afterNI = calculateEmployeeNI(adjustedSalary);
  const afterEmployerNI = calculateEmployerNI(adjustedSalary);
  const afterStudentLoan = calculateStudentLoan(adjustedSalary, studentLoan);
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
