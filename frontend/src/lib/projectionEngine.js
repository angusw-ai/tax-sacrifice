// Simple annual compound growth projections

export function projectGrowth(monthlyContribution, annualRate, years, startingBalance = 0) {
  const yearlyContribution = monthlyContribution * 12;
  const rate = annualRate / 100;
  const yearByYear = [];
  let balance = startingBalance;

  for (let year = 0; year <= years; year++) {
    yearByYear.push({
      year,
      balance: Math.round(balance),
      contributions: Math.round(yearlyContribution * year + startingBalance),
      growth: Math.round(balance - (yearlyContribution * year + startingBalance)),
    });
    balance = balance * (1 + rate) + yearlyContribution;
  }

  return yearByYear;
}

export function projectPension(monthlyContribution, annualRate, years, startingBalance = 0) {
  return projectGrowth(monthlyContribution, annualRate, years, startingBalance);
}

export function projectISA(monthlyContribution, annualRate, years, startingBalance = 0) {
  return projectGrowth(monthlyContribution, annualRate, years, startingBalance);
}

export function projectLISA(monthlyContribution, annualRate, years, startingBalance = 0, age = 30) {
  const maxYearly = 4000;
  const yearlyContrib = Math.min(monthlyContribution * 12, maxYearly);
  const yearlyBonus = yearlyContrib * 0.25;
  const effectiveYearly = yearlyContrib + yearlyBonus;
  const rate = annualRate / 100;
  const yearByYear = [];
  let balance = startingBalance;

  for (let year = 0; year <= years; year++) {
    const currentAge = age + year;
    const canContribute = currentAge < 50;

    yearByYear.push({
      year,
      balance: Math.round(balance),
      age: currentAge,
      canContribute,
    });

    if (canContribute && year < years) {
      balance = balance * (1 + rate) + effectiveYearly;
    } else if (year < years) {
      balance = balance * (1 + rate);
    }
  }

  return yearByYear;
}

export function estimatePensionDrawdown(potValue) {
  const taxFreeLump = potValue * 0.25;
  const remainder = potValue - taxFreeLump;
  const annualDrawdown = remainder * 0.04;
  return {
    taxFreeLump: Math.round(taxFreeLump),
    annualDrawdown: Math.round(annualDrawdown),
    monthlyDrawdown: Math.round(annualDrawdown / 12),
  };
}

export function getEffectivePensionCost(marginalTaxRate, marginalNIRate) {
  return 1 - marginalTaxRate - marginalNIRate;
}
