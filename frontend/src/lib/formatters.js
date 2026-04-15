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

export function normalizeIntegerInput(value) {
  const digits = String(value).replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  return digits ? parseInt(digits, 10) : '';
}

export function normalizeFloatInput(value) {
  const cleaned = String(value)
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1');

  if (!cleaned) return '';

  const [integerPart = '', decimalPart] = cleaned.split('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';
  const normalized = decimalPart !== undefined
    ? `${normalizedInteger}.${decimalPart}`
    : normalizedInteger;
  const parsed = parseFloat(normalized);

  return Number.isNaN(parsed) ? '' : parsed;
}

export function formatSalaryInput(value) {
  if (!value && value !== 0) return '';
  return Number(value).toLocaleString('en-GB');
}

export function formatPercent(value, decimals = 0) {
  return `${Number(value).toFixed(decimals)}%`;
}

export function dv(annualValue, displayMode) {
  if (displayMode === 'monthly') return annualValue / 12;
  return annualValue;
}

export function dvLabel(displayMode) {
  return displayMode === 'monthly' ? '/mo' : '/yr';
}
