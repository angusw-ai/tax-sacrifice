import React, { createContext, useContext, useReducer } from 'react';

const WizardContext = createContext(null);

const initialState = {
  currentStep: 1,
  step1: {
    grossSalary: '',
    taxRegion: 'england',
    studentLoan: 'none',
    employerPensionPct: '',
    age: '',
  },
  step2: {
    pension: { enabled: false, inputType: 'percentage', value: 5, method: 'netpay' },
    ev: { enabled: false, monthlyCost: 300, listPrice: 40000 },
    cycle: { enabled: false, value: 1000, cap: 1000 },
    childcare: { enabled: false, monthlyAmount: 243 },
    tech: { enabled: false, value: 1000 },
    healthcare: { enabled: false, monthlyPremium: 50 },
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
  },
};

function wizardReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'UPDATE_STEP1':
      return { ...state, step1: { ...state.step1, ...action.payload } };
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
    default:
      return state;
  }
}

export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
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
