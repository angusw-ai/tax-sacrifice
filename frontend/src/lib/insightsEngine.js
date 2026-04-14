export function generateInsights(salary, adjustedSalary, region, age, schemes) {
  const insights = [];

  // 60% effective tax trap
  if (salary > 100000 && salary <= 125140) {
    const sacrificeNeeded = salary - 100000;
    const currentSacrifice = salary - adjustedSalary;
    const additional = Math.max(0, sacrificeNeeded - currentSacrifice);
    if (additional > 0) {
      insights.push({
        type: 'critical',
        title: 'Personal Allowance Trap',
        message: `Your income falls in the 60% effective tax zone (£100k-£125,140). Sacrificing an additional £${Math.ceil(additional).toLocaleString()} into your pension would restore your full Personal Allowance, saving you significantly.`,
      });
    }
  }

  // Already sacrificed into the trap zone
  if (adjustedSalary > 100000 && adjustedSalary <= 125140) {
    const additionalNeeded = adjustedSalary - 100000;
    insights.push({
      type: 'opportunity',
      title: 'Almost Clear of the Trap',
      message: `Your adjusted income is £${adjustedSalary.toLocaleString()}. An additional £${Math.ceil(additionalNeeded).toLocaleString()} sacrifice brings you below £100,000 and recovers your full Personal Allowance.`,
    });
  }

  // Escaped the trap via sacrifice
  if (salary > 100000 && adjustedSalary <= 100000) {
    insights.push({
      type: 'success',
      title: 'Personal Allowance Restored',
      message: `Your salary sacrifice has brought your adjusted income below £100,000, restoring your full £12,570 Personal Allowance. This is the single most powerful tax optimisation for your income.`,
    });
  }

  // HICBC
  if (adjustedSalary >= 60000 && adjustedSalary <= 80000) {
    insights.push({
      type: 'warning',
      title: 'High Income Child Benefit Charge',
      message: `If you or your partner claims Child Benefit, your adjusted income of £${adjustedSalary.toLocaleString()} triggers the HICBC. Additional pension sacrifice could reduce or eliminate this charge.`,
    });
  }

  // Tax relief messaging
  const pensionContrib = schemes.pension?.enabled
    ? (schemes.pension.inputType === 'percentage'
        ? salary * (schemes.pension.value || 0) / 100
        : (schemes.pension.value || 0) * 12)
    : 0;

  if (pensionContrib > 0) {
    if (salary > 125140) {
      insights.push({
        type: 'info',
        title: 'Additional Rate Relief',
        message: `At your income level, each £1 into your pension effectively costs you only ~53p after 45% tax and 2% NI relief.`,
      });
    } else if (salary > 50270) {
      insights.push({
        type: 'info',
        title: 'Higher Rate Relief',
        message: `As a higher rate taxpayer, each £1 into your pension effectively costs you only ~58p after 40% tax and 2% NI relief.`,
      });
    }
  }

  // LISA eligibility
  if (age >= 18 && age <= 39) {
    insights.push({
      type: 'info',
      title: 'LISA Eligible',
      message: `At ${age}, you qualify for a Lifetime ISA with a 25% government bonus on contributions up to £4,000/year — an instant return of up to £1,000/year.`,
    });
  }

  // ISA complement for higher earners
  if (salary > 50270 && pensionContrib > 0) {
    insights.push({
      type: 'info',
      title: 'ISA Complements Pension',
      message: `A Stocks & Shares ISA alongside your pension gives you tax-free growth now with fully flexible, tax-free withdrawals — diversifying your retirement access.`,
    });
  }

  // Pension annual allowance warning
  if (pensionContrib > 60000) {
    insights.push({
      type: 'critical',
      title: 'Annual Allowance Exceeded',
      message: `Your pension contributions of £${pensionContrib.toLocaleString()} exceed the £60,000 annual allowance. You may face a tax charge on the excess.`,
    });
  }

  // Tapered annual allowance
  if (salary > 260000) {
    insights.push({
      type: 'warning',
      title: 'Tapered Annual Allowance',
      message: `With income above £260,000, your pension annual allowance may be reduced below £60,000. Consult a financial adviser.`,
    });
  }

  return insights;
}
