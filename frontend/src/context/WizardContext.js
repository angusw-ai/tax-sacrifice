import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { decodeURLToState } from '@/lib/urlParams';

const WizardContext = createContext(null);
const VALID_REGIONS = new Set(['england', 'scotland']);
const VALID_STUDENT_LOANS = new Set(['none', 'plan1', 'plan2', 'plan4', 'postgrad']);
const VALID_TAX_YEARS = new Set(['2024/25', '2025/26']);
const VALID_PENSION_INPUT_TYPES = new Set(['percentage', 'fixed']);
const VALID_PENSION_METHODS = new Set(['netpay', 'relief']);
const VALID_PENSION_METHOD_PARAMS = new Set(['salary-sacrifice', 'relief']);
const VALID_STEP3_VEHICLES = new Set(['pension', 'stocksISA', 'cashISA', 'lisa']);

function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isNumericString(value) {
  return typeof value === 'string' && /^[0-9]+$/.test(value);
}

function isValidHydratedState(payload, rawSearch = '') {
  if (!payload?.step1?.grossSalary || !isNumericString(payload.step1.grossSalary) || parseInt(payload.step1.grossSalary, 10) <= 0) {
    return false;
  }

  const params = new URLSearchParams(rawSearch);

  if (params.has('salary') && !isNumericString(params.get('salary'))) return false;
  if (params.has('region') && !VALID_REGIONS.has(params.get('region'))) return false;
  if (params.has('age') && !isIntegerInRange(parseInt(params.get('age'), 10), 16, 75)) return false;
  if (params.has('loan') && !VALID_STUDENT_LOANS.has(params.get('loan'))) return false;
  if (params.has('empPension')) {
    const employerPensionPct = Number(params.get('empPension'));
    if (!isNonNegativeNumber(employerPensionPct) || employerPensionPct > 100) return false;
  }

  if (params.has('children')) {
    const children = parseInt(params.get('children'), 10);
    if (!isIntegerInRange(children, 1, 6)) return false;
  }
  if (params.has('childCost') && !isNonNegativeNumber(Number(params.get('childCost')))) return false;

  if (params.has('pension') && params.has('pensionFixed')) return false;
  if (params.has('pensionMethod') && !VALID_PENSION_METHOD_PARAMS.has(params.get('pensionMethod'))) return false;
  if (params.has('pension') && (!isNonNegativeNumber(Number(params.get('pension'))) || !VALID_PENSION_INPUT_TYPES.has(payload.step2?.pension?.inputType) || !VALID_PENSION_METHODS.has(payload.step2?.pension?.method))) return false;
  if (params.has('pensionFixed') && (!isNonNegativeNumber(Number(params.get('pensionFixed'))) || !VALID_PENSION_INPUT_TYPES.has(payload.step2?.pension?.inputType) || !VALID_PENSION_METHODS.has(payload.step2?.pension?.method))) return false;
  if (params.has('ev') && !isNonNegativeNumber(Number(params.get('ev')))) return false;
  if (params.has('evPrice') && !isNonNegativeNumber(Number(params.get('evPrice')))) return false;
  if (params.has('cycle') && !isNonNegativeNumber(Number(params.get('cycle')))) return false;
  if (params.has('childcareV') && !isNonNegativeNumber(Number(params.get('childcareV')))) return false;
  if (params.has('tech') && !isNonNegativeNumber(Number(params.get('tech')))) return false;
  if (params.has('health') && !isNonNegativeNumber(Number(params.get('health')))) return false;

  if (params.has('bonus') && !isNumericString(params.get('bonus'))) return false;
  if (params.has('bonusPct')) {
    const sacrificePct = Number(params.get('bonusPct'));
    if (!isIntegerInRange(sacrificePct, 0, 100)) return false;
  }

  if (params.has('save') && !isNonNegativeNumber(Number(params.get('save')))) return false;
  if (params.has('growth') && !isNonNegativeNumber(Number(params.get('growth')))) return false;
  if (params.has('cashRate') && !isNonNegativeNumber(Number(params.get('cashRate')))) return false;
  if (params.has('horizon') && !isIntegerInRange(parseInt(params.get('horizon'), 10), 1, 40)) return false;
  if (params.has('pensionPot') && !isNonNegativeNumber(Number(params.get('pensionPot')))) return false;
  if (params.has('isaBal') && !isNonNegativeNumber(Number(params.get('isaBal')))) return false;
  if (params.has('vehicles')) {
    const vehicleList = params.get('vehicles').split(',').filter(Boolean);
    if (vehicleList.some((vehicle) => !VALID_STEP3_VEHICLES.has(vehicle))) return false;
  }
  const splitValues = [];
  for (const vehicle of VALID_STEP3_VEHICLES) {
    const paramName = `split_${vehicle}`;
    if (params.has(paramName)) {
      const splitValue = parseInt(params.get(paramName), 10);
      if (!isIntegerInRange(splitValue, 0, 100)) return false;
      splitValues.push(splitValue);
    }
  }
  if (splitValues.length > 0) {
    const splitSum = Object.values(payload.step3?.splits || {}).reduce((sum, value) => sum + value, 0);
    if (splitSum !== 100) return false;
  }

  if (params.has('taxYear') && !VALID_TAX_YEARS.has(params.get('taxYear'))) return false;
  if (params.has('passback') && params.get('passback') !== '1') return false;

  return true;
}

const initialState = {
  currentStep: 1,
  taxYear: '2025/26',
  displayMode: 'annual',
  employerNIPassback: false,
  step1: {
    grossSalary: '',
    taxRegion: 'england',
    studentLoan: 'none',
    employerPensionPct: '',
    age: '',
    hasChildren: false,
    numberOfChildren: 1,
    childAges: '3',
    monthlyCostPerChild: 800,
  },
  step2: {
    pension: { enabled: false, inputType: 'percentage', value: 5, method: 'netpay' },
    ev: { enabled: false, monthlyCost: 300, listPrice: 40000 },
    cycle: { enabled: false, value: 1000, cap: 1000 },
    childcare: { enabled: false, monthlyAmount: 243 },
    tech: { enabled: false, value: 1000 },
    healthcare: { enabled: false, monthlyPremium: 50 },
  },
  bonus: {
    amount: '',
    sacrificePct: 100,
  },
  step3: {
    monthlySaving: 500,
    growthRate: 5,
    cashISARate: 4,
    horizon: 20,
    currentPensionPot: 0,
    currentISABalance: 0,
    vehicles: { pension: true, stocksISA: true, cashISA: false, lisa: false },
    splits: { pension: 50, stocksISA: 50, cashISA: 0, lisa: 0 },
    viewMode: 'simple',
    carryForward: false,
    cfYear1: 0,
    cfYear2: 0,
    cfYear3: 0,
  },
  mortgagePlanning: false,
};

function wizardReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_TAX_YEAR':
      return { ...state, taxYear: action.payload };
    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.payload };
    case 'SET_EMPLOYER_NI_PASSBACK':
      return { ...state, employerNIPassback: action.payload };
    case 'SET_MORTGAGE_PLANNING':
      return { ...state, mortgagePlanning: action.payload };
    case 'UPDATE_STEP1':
      return { ...state, step1: { ...state.step1, ...action.payload } };
    case 'UPDATE_BONUS':
      return { ...state, bonus: { ...state.bonus, ...action.payload } };
    case 'UPDATE_STEP2_SCHEME':
      return {
        ...state,
        step2: {
          ...state.step2,
          [action.payload.scheme]: {
            ...state.step2[action.payload.scheme],
            ...action.payload.data,
          },
        },
      };
    case 'UPDATE_STEP3':
      return { ...state, step3: { ...state.step3, ...action.payload } };
    case 'UPDATE_STEP3_VEHICLES':
      return {
        ...state,
        step3: {
          ...state.step3,
          vehicles: { ...state.step3.vehicles, ...action.payload },
        },
      };
    case 'UPDATE_STEP3_SPLITS':
      return {
        ...state,
        step3: {
          ...state.step3,
          splits: { ...state.step3.splits, ...action.payload },
        },
      };
    case 'RESET':
      return { ...initialState };
    case 'HYDRATE': {
      const p = action.payload;
      if (!isValidHydratedState(p, action.rawSearch)) {
        return { ...initialState };
      }
      const next = { ...initialState, currentStep: 5 };
      if (p.step1) next.step1 = { ...initialState.step1, ...p.step1 };
      if (p.step2) {
        next.step2 = { ...initialState.step2 };
        for (const [k, v] of Object.entries(p.step2)) {
          next.step2[k] = { ...initialState.step2[k], ...v };
        }
      }
      if (p.bonus) next.bonus = { ...initialState.bonus, ...p.bonus };
      if (p.step3) {
        next.step3 = { ...initialState.step3, ...p.step3 };
        if (p.step3.vehicles) next.step3.vehicles = { ...initialState.step3.vehicles, ...p.step3.vehicles };
        if (p.step3.splits) next.step3.splits = { ...initialState.step3.splits, ...p.step3.splits };
      }
      if (p.taxYear) next.taxYear = p.taxYear;
      if (p.employerNIPassback !== undefined) next.employerNIPassback = p.employerNIPassback;
      return next;
    }
    default:
      return state;
  }
}

export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const overrides = decodeURLToState(window.location.search);
    if (overrides) {
      dispatch({ type: 'HYDRATE', payload: overrides, rawSearch: window.location.search });
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error('useWizard must be used within WizardProvider');
  return context;
}
