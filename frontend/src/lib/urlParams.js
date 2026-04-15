// URL parameter encoding/decoding for shareable results

const PENSION_METHOD_PARAM_MAP = {
  relief: 'relief',
  netpay: 'salary-sacrifice',
};
const STEP3_VEHICLE_KEYS = ['pension', 'stocksISA', 'cashISA', 'lisa'];

function decodePensionMethod(value) {
  return value === 'relief' ? 'relief' : 'netpay';
}

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
  if (state.step1.hasPostgraduateLoan) params.set('postgrad', '1');
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
    params.set('pensionMethod', PENSION_METHOD_PARAM_MAP[s.pension.method] || 'salary-sacrifice');
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

  // Step 3 - Comparison
  if (state.step3.monthlySaving !== 500) params.set('save', state.step3.monthlySaving);
  if (state.step3.growthRate !== 5) params.set('growth', state.step3.growthRate);
  if (state.step3.cashISARate !== 4) params.set('cashRate', state.step3.cashISARate);
  if (state.step3.horizon !== 20) params.set('horizon', state.step3.horizon);
  if (state.step3.currentPensionPot) params.set('pensionPot', state.step3.currentPensionPot);
  if (state.step3.currentISABalance) params.set('isaBal', state.step3.currentISABalance);
  params.set('vehicles', STEP3_VEHICLE_KEYS.filter((key) => state.step3.vehicles[key]).join(','));
  STEP3_VEHICLE_KEYS.forEach((key) => {
    params.set(`split_${key}`, state.step3.splits[key]);
  });

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
  if (params.get('postgrad') === '1') overrides.step1.hasPostgraduateLoan = true;
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
  const pensionMethod = decodePensionMethod(params.get('pensionMethod'));
  if (params.has('pension')) {
    overrides.step2.pension = { enabled: true, inputType: 'percentage', value: parseFloat(params.get('pension')) || 5, method: pensionMethod };
  }
  if (params.has('pensionFixed')) {
    overrides.step2.pension = { enabled: true, inputType: 'fixed', value: parseFloat(params.get('pensionFixed')) || 500, method: pensionMethod };
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

  // Step 3 - Comparison
  overrides.step3 = {};
  if (params.has('save')) overrides.step3.monthlySaving = parseFloat(params.get('save')) || 500;
  if (params.has('growth')) overrides.step3.growthRate = parseFloat(params.get('growth')) || 5;
  if (params.has('cashRate')) overrides.step3.cashISARate = parseFloat(params.get('cashRate')) || 4;
  if (params.has('horizon')) overrides.step3.horizon = parseInt(params.get('horizon')) || 20;
  if (params.has('pensionPot')) overrides.step3.currentPensionPot = parseFloat(params.get('pensionPot')) || 0;
  if (params.has('isaBal')) overrides.step3.currentISABalance = parseFloat(params.get('isaBal')) || 0;
  if (params.has('vehicles')) {
    const enabledVehicles = new Set(params.get('vehicles').split(',').filter(Boolean));
    overrides.step3.vehicles = {
      pension: enabledVehicles.has('pension'),
      stocksISA: enabledVehicles.has('stocksISA'),
      cashISA: enabledVehicles.has('cashISA'),
      lisa: enabledVehicles.has('lisa'),
    };
  }
  const splitParams = STEP3_VEHICLE_KEYS.reduce((result, key) => {
    if (params.has(`split_${key}`)) {
      result[key] = parseInt(params.get(`split_${key}`), 10) || 0;
    }
    return result;
  }, {});
  if (Object.keys(splitParams).length > 0) overrides.step3.splits = splitParams;

  // Settings
  if (params.has('taxYear')) overrides.taxYear = params.get('taxYear');
  if (params.get('passback') === '1') overrides.employerNIPassback = true;

  return overrides;
}

export function buildShareURL(state) {
  const encoded = encodeStateToURL(state);
  return `${window.location.origin}${window.location.pathname}?${encoded}`;
}
