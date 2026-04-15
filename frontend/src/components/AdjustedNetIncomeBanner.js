import { useMemo } from 'react';
import { useWizard } from '@/context/WizardContext';
import { formatCurrency, parseSalaryInput, dv, dvLabel } from '@/lib/formatters';
import { calculateTotalSacrifice } from '@/lib/taxEngine';

const THRESHOLDS = [
  { value: 60000, label: '£60k HICBC', color: 'text-amber-600', bg: 'bg-amber-500' },
  { value: 80000, label: '£80k Full HICBC', color: 'text-amber-600', bg: 'bg-amber-500' },
  { value: 100000, label: '£100k PA taper + childcare', color: 'text-orange-600', bg: 'bg-orange-500' },
  { value: 125140, label: '£125,140 PA lost', color: 'text-red-700', bg: 'bg-red-600' },
];

export default function AdjustedNetIncomeBanner() {
  const { state } = useWizard();
  const salary = parseSalaryInput(state.step1.grossSalary);
  const dm = state.displayMode;

  const ani = useMemo(() => {
    if (salary <= 0) return null;
    const { totalAnnual: totalSacrifice } = calculateTotalSacrifice(salary, state.step2);

    const bonusAmount = parseSalaryInput(state.bonus.amount);
    const bonusSacrifice = bonusAmount * ((state.bonus.sacrificePct || 0) / 100);

    const adjusted = salary + bonusAmount - totalSacrifice - bonusSacrifice;
    return { adjusted, totalSacrifice, bonusSacrifice };
  }, [salary, state.step2, state.bonus]);

  if (!ani || salary <= 0) return null;

  const { adjusted } = ani;
  let statusColor = 'text-primary';
  let activeWarning = null;

  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (adjusted > THRESHOLDS[i].value) {
      statusColor = THRESHOLDS[i].color;
      activeWarning = THRESHOLDS[i].label;
      break;
    }
  }

  return (
    <div data-testid="ani-banner" className="border-b border-border bg-card">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground whitespace-nowrap">
            Adjusted Net Income
          </span>
          <span data-testid="ani-value" className={`font-mono text-sm font-semibold ${statusColor}`}>
            {formatCurrency(dv(adjusted, dm))}{dvLabel(dm)}
          </span>
          {activeWarning && (
            <span className={`hidden sm:inline text-[10px] uppercase tracking-wider font-semibold ${statusColor} px-2 py-0.5 rounded-sm bg-current/5`}>
              {activeWarning}
            </span>
          )}
        </div>
        {/* Mini threshold bar */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {THRESHOLDS.map((t) => (
            <div key={t.value} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${adjusted > t.value ? t.bg : 'bg-border'}`} />
              <span className="text-[9px] text-muted-foreground font-mono">{t.value >= 100000 ? `${t.value / 1000}k` : `${t.value / 1000}k`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
