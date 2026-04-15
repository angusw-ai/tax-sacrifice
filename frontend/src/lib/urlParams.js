// URL parameter encoding/decoding for shareable results

const PARAM_MAP = {
  salary: { path: 'step1.grossSalary' },
  region: { path: 'step1.taxRegion' },
  age: { path: 'step1.age' },
  loan: { path: 'step1.studentLoan' },
  empPension: { path: 'step1.employerPensionPct' },
  children: { path: 'step1.numberOfChildren', implies: { 'step1.hasChildren': true } },
  childAges: { path: 'step1.childAges' },
  childCost: { path: 'step1.monthlyCostPerChild', type: 'number' },
  pension: { path: 'step2.pension.value', type: 'number', implies: { 'step2.pension.enabled': true, 'step2.pension.inputType': 'percentage' } },
  pensionFixed: { path: 'step2.pension.value', type: 'number', implies: { 'step2.pension.enabled': true, 'step2.pension.inputType': 'fixed' } },
  ev: { path: 'step2.ev.monthlyCost', type: 'number', implies: { 'step2.ev.enabled': true } },
  evPrice: { path: 'step2.ev.listPrice', type: 'number' },
  cycle: { path: 'step2.cycle.value', type: 'number', implies: { 'step2.cycle.enabled': true } },
  childcareV: { path: 'step2.childcare.monthlyAmount', type: 'number', implies: { 'step2.childcare.enabled': true } },
  tech: { path: 'step2.tech.value', type: 'number', implies: { 'step2.tech.enabled': true } },
  health: { path: 'step2.healthcare.monthlyPremium', type: 'number', implies: { 'step2.healthcare.enabled': true } },
  bonus: { path: 'bonus.amount' },
  bonusPct: { path: 'bonus.sacrificePct', type: 'number' },
  taxYear: { path: 'taxYear' },
  passback: { path: 'employerNIPassback', type: 'boolean' },
};

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = obj;
  for (const key of keys) {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  }
  target[last] = value;
}

export function encodeStateToURL(state) {
  const params = new URLSearchParams();

  // Core fields
  if (state.step1.grossSalary) params.set('salary', state.step1.grossSalary);
  if (state.step1.taxRegion !== 'england') params.set('region', state.step1.taxRegion);
  if (state.step1.age) params.set('age', state.step1.age);
  if (state.step1.studentLoan !== 'none') params.set('loan', state.step1.studentLoan);
  if (state.step1.employerPensionPct) params.set('empPension', state.step1.employerPensionPct);

  // Children
  if (state.step1.hasChildren) {
    params.set('children', state.step1.numberOfChildren);
    if (state.step1.childAges !== '3') params.set('childAges', state.step1.childAges);
    if (state.step1.monthlyCostPerChild !== 800) params.set('childCost', state.step1.monthlyCostPerChild);
  }

  // Sacrifice schemes
  const s = state.step2;
  if (s.pension.enabled) {
    if (s.pension.inputType === 'percentage') {
      params.set('pension', s.pension.value);
    } else {
      params.set('pensionFixed', s.pension.value);
    }
  }
  if (s.ev.enabled) {
    params.set('ev', s.ev.monthlyCost);
    if (s.ev.listPrice !== 40000) params.set('evPrice', s.ev.listPrice);
  }
  if (s.cycle.enabled) params.set('cycle', s.cycle.value);
  if (s.childcare.enabled) params.set('childcareV', s.childcare.monthlyAmount);
  if (s.tech.enabled) params.set('tech', s.tech.value);
  if (s.healthcare.enabled) params.set('health', s.healthcare.monthlyPremium);

  // Bonus
  if (state.bonus.amount) {
    params.set('bonus', state.bonus.amount);
    if (state.bonus.sacrificePct !== 100) params.set('bonusPct', state.bonus.sacrificePct);
  }

  // Settings
  if (state.taxYear !== '2025/26') params.set('taxYear', state.taxYear);
  if (state.employerNIPassback) params.set('passback', '1');

  return params.toString();
}

export function decodeURLToState(searchString) {
  const params = new URLSearchParams(searchString);
  if (params.size === 0) return null;

  // Must have at least salary to be a valid share link
  if (!params.has('salary')) return null;

  const overrides = {};

  // Step 1
  overrides.step1 = {};
  if (params.has('salary')) overrides.step1.grossSalary = params.get('salary');
  if (params.has('region')) overrides.step1.taxRegion = params.get('region');
  if (params.has('age')) overrides.step1.age = params.get('age');
  if (params.has('loan')) overrides.step1.studentLoan = params.get('loan');
  if (params.has('empPension')) overrides.step1.employerPensionPct = params.get('empPension');

  // Children
  if (params.has('children')) {
    overrides.step1.hasChildren = true;
    overrides.step1.numberOfChildren = parseInt(params.get('children')) || 1;
    if (params.has('childAges')) overrides.step1.childAges = params.get('childAges');
    if (params.has('childCost')) overrides.step1.monthlyCostPerChild = parseFloat(params.get('childCost')) || 800;
  }

  // Step 2 - Schemes
  overrides.step2 = {};
  if (params.has('pension')) {
    overrides.step2.pension = { enabled: true, inputType: 'percentage', value: parseFloat(params.get('pension')) || 5, method: 'netpay' };
  }
  if (params.has('pensionFixed')) {
    overrides.step2.pension = { enabled: true, inputType: 'fixed', value: parseFloat(params.get('pensionFixed')) || 500, method: 'netpay' };
  }
  if (params.has('ev')) {
    overrides.step2.ev = { enabled: true, monthlyCost: parseFloat(params.get('ev')) || 300, listPrice: parseFloat(params.get('evPrice')) || 40000 };
  }
  if (params.has('cycle')) {
    overrides.step2.cycle = { enabled: true, value: parseFloat(params.get('cycle')) || 1000, cap: 1000 };
  }
  if (params.has('childcareV')) {
    overrides.step2.childcare = { enabled: true, monthlyAmount: parseFloat(params.get('childcareV')) || 243 };
  }
  if (params.has('tech')) {
    overrides.step2.tech = { enabled: true, value: parseFloat(params.get('tech')) || 1000 };
  }
  if (params.has('health')) {
    overrides.step2.healthcare = { enabled: true, monthlyPremium: parseFloat(params.get('health')) || 50 };
  }

  // Bonus
  overrides.bonus = {};
  if (params.has('bonus')) {
    overrides.bonus.amount = params.get('bonus');
    overrides.bonus.sacrificePct = params.has('bonusPct') ? parseInt(params.get('bonusPct')) || 100 : 100;
  }

  // Settings
  if (params.has('taxYear')) overrides.taxYear = params.get('taxYear');
  if (params.get('passback') === '1') overrides.employerNIPassback = true;

  return overrides;
}

export function buildShareURL(state) {
  const encoded = encodeStateToURL(state);
  return `${window.location.origin}${window.location.pathname}?${encoded}`;
}
