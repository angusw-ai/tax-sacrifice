import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { decodeURLToState } from '@/lib/urlParams';

const WizardContext = createContext(null);

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
    case 'HYDRATE': {
      const p = action.payload;
      const next = { ...state, currentStep: 5 };
      if (p.step1) next.step1 = { ...state.step1, ...p.step1 };
      if (p.step2) {
        next.step2 = { ...state.step2 };
        for (const [k, v] of Object.entries(p.step2)) {
          next.step2[k] = { ...state.step2[k], ...v };
        }
      }
      if (p.bonus) next.bonus = { ...state.bonus, ...p.bonus };
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
      dispatch({ type: 'HYDRATE', payload: overrides });
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
