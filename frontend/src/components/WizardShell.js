import { useWizard } from '@/context/WizardContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coffee } from 'lucide-react';
import { AVAILABLE_TAX_YEARS } from '@/lib/taxEngine';
import AdjustedNetIncomeBanner from '@/components/AdjustedNetIncomeBanner';
import Step1Situation from '@/pages/Step1Situation';
import Step2Sacrifice from '@/pages/Step2Sacrifice';
import StepBonusSacrifice from '@/pages/StepBonusSacrifice';
import Step3Comparison from '@/pages/Step3Comparison';
import Step4Results from '@/pages/Step4Results';

const STEPS = [
  { num: 1, label: 'Your Situation' },
  { num: 2, label: 'Salary Sacrifice' },
  { num: 3, label: 'Bonus' },
  { num: 4, label: 'Pension vs ISA' },
  { num: 5, label: 'Results' },
];

export default function WizardShell() {
  const { state, dispatch } = useWizard();

  return (
    <div className="min-h-screen bg-background" data-testid="wizard-shell">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-medium text-primary tracking-tight">
              Salary Sacrifice Optimiser
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide mt-0.5">UK Tax Year {state.taxYear}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tax Year Selector */}
            <Select
              value={state.taxYear}
              onValueChange={(v) => dispatch({ type: 'SET_TAX_YEAR', payload: v })}
            >
              <SelectTrigger data-testid="select-tax-year" className="w-[110px] h-8 rounded-sm text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TAX_YEARS.map((yr) => (
                  <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <a
              href="https://buymeacoffee.com/angusw"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 h-8 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Support</span>
            </a>
            {/* Monthly / Annual Toggle */}
            <div className="flex items-center rounded-sm border border-border overflow-hidden">
              <button
                data-testid="toggle-annual"
                onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: 'annual' })}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  state.displayMode === 'annual'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Annual
              </button>
              <button
                data-testid="toggle-monthly"
                onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: 'monthly' })}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  state.displayMode === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <nav className="border-b border-border bg-card no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-0 overflow-x-auto">
            {STEPS.map((step, i) => {
              const isActive = state.currentStep === step.num;
              const isComplete = step.num < state.currentStep;
              const isClickable = step.num < state.currentStep;
              return (
                <button
                  key={step.num}
                  data-testid={`step-nav-${step.num}`}
                  onClick={() => isClickable && dispatch({ type: 'SET_STEP', payload: step.num })}
                  className={`
                    relative flex items-center gap-2 px-4 sm:px-6 py-4 text-xs uppercase tracking-[0.15em] font-semibold whitespace-nowrap
                    transition-colors duration-200
                    ${isActive ? 'text-primary' : isComplete ? 'text-primary/60 cursor-pointer hover:text-primary/80' : 'text-muted-foreground'}
                    ${!isClickable && !isActive ? 'cursor-default' : ''}
                  `}
                >
                  <span className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                    ${isActive ? 'bg-primary text-primary-foreground border-primary' :
                      isComplete ? 'bg-primary/10 text-primary border-primary/30' :
                      'bg-muted text-muted-foreground border-border'}
                  `}>
                    {isComplete ? '\u2713' : step.num}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
            {/* Spacer line */}
            <div className="flex-1 border-b border-transparent" />
          </div>
        </div>
      </nav>

      {/* Adjusted Net Income Banner */}
      <AdjustedNetIncomeBanner />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div key={state.currentStep} className="wizard-step">
          {state.currentStep === 1 && <Step1Situation />}
          {state.currentStep === 2 && <Step2Sacrifice />}
          {state.currentStep === 3 && <StepBonusSacrifice />}
          {state.currentStep === 4 && <Step3Comparison />}
          {state.currentStep === 5 && <Step4Results />}
        </div>
      </main>

      {/* Disclaimer Footer */}
      <footer className="border-t border-border py-6 mt-8 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            This calculator provides estimates for guidance only and does not constitute financial advice.
            Tax rules are subject to change. Always consult a qualified financial adviser before making
            decisions about your salary, pension, or savings. Based on UK HMRC rates for tax year {state.taxYear}.
          </p>
        </div>
      </footer>
    </div>
  );
}
