export function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) return '£0';
  const absVal = Math.abs(Math.round(value));
  const formatted = absVal.toLocaleString('en-GB');
  return value < 0 ? `-£${formatted}` : `£${formatted}`;
}

export function formatCurrencyDetailed(value) {
  if (value === undefined || value === null || isNaN(value)) return '£0.00';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseSalaryInput(value) {
  const cleaned = String(value).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function formatSalaryInput(value) {
  if (!value && value !== 0) return '';
  return Number(value).toLocaleString('en-GB');
}

export function formatPercent(value, decimals = 0) {
  return `${Number(value).toFixed(decimals)}%`;
}
