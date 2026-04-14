import { useMemo } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, AlertTriangle, Lightbulb, PiggyBank, Banknote } from 'lucide-react';
import { calculateBonusTaxation, getMarginalTaxRate, getMarginalNIRate } from '@/lib/taxEngine';
import { formatCurrency, parseSalaryInput, dv, dvLabel } from '@/lib/formatters';

export default function StepBonusSacrifice() {
  const { state, dispatch } = useWizard();
  const { bonus, step1, taxYear, displayMode } = state;
  const salary = parseSalaryInput(step1.grossSalary);
  const bonusAmt = parseSalaryInput(bonus.amount);
  const sacrificeAmt = bonusAmt * ((bonus.sacrificePct || 0) / 100);
  const dm = displayMode;

  const updateBonus = (p) => dispatch({ type: 'UPDATE_BONUS', payload: p });

  const result = useMemo(() => {
    if (salary <= 0 || bonusAmt <= 0) return null;
    return calculateBonusTaxation(salary, bonusAmt, step1.taxRegion, step1.studentLoan, sacrificeAmt, taxYear);
  }, [salary, bonusAmt, step1.taxRegion, step1.studentLoan, sacrificeAmt, taxYear]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-primary tracking-tight">
          Bonus Sacrifice
        </h2>
        <p className="text-muted-foreground mt-2">
          Model the tax impact of taking your bonus as cash vs sacrificing into pension.
        </p>
      </div>

      {/* Bonus Input */}
      <Card className="rounded-sm border shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
              Expected Gross Bonus
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
              <Input
                data-testid="input-bonus-amount"
                className="pl-7 font-mono rounded-sm h-11"
                placeholder="25,000"
                value={bonus.amount ? Number(bonus.amount).toLocaleString('en-GB') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  updateBonus({ amount: raw || '' });
                }}
              />
            </div>
          </div>
          {bonusAmt > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Sacrifice into Pension: {bonus.sacrificePct}% ({formatCurrency(sacrificeAmt)})
              </Label>
              <Slider
                data-testid="slider-bonus-sacrifice"
                value={[bonus.sacrificePct]}
                onValueChange={([v]) => updateBonus({ sacrificePct: v })}
                min={0}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>0% — All cash</span>
                <span>100% — All pension</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Warnings */}
      {result?.thresholds?.length > 0 && (
        <div className="space-y-2">
          {result.thresholds.map((t, i) => (
            <div key={i} className="p-4 rounded-sm border border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Bonus crosses {t.label}</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Salary + bonus = {formatCurrency(result.totalWithBonus)}. Sacrifice at least{' '}
                    <span className="font-mono font-semibold">{formatCurrency(t.needed)}</span> to stay under this threshold.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Cards */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Take as Cash */}
          <Card className="rounded-sm border shadow-sm overflow-hidden">
            <div className="h-1 bg-muted-foreground" />
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-serif text-lg font-medium">Take as Cash</h3>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Gross bonus" value={formatCurrency(bonusAmt)} />
                <Row label="Income tax on bonus" value={`-${formatCurrency(result.asCash.tax)}`} muted />
                <Row label="NI on bonus" value={`-${formatCurrency(result.asCash.ni)}`} muted />
                {result.asCash.sl > 0 && <Row label="Student loan" value={`-${formatCurrency(result.asCash.sl)}`} muted />}
                <div className="border-t border-border pt-2">
                  <Row label="Net bonus received" value={formatCurrency(result.asCash.net)} bold />
                </div>
                <div className="p-3 bg-muted/50 rounded-sm mt-2">
                  <p className="text-xs text-muted-foreground">Effective tax rate on bonus</p>
                  <p data-testid="bonus-cash-rate" className="font-mono text-xl font-semibold text-foreground">
                    {(result.asCash.rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sacrifice Strategy */}
          <Card className="rounded-sm border border-primary/30 shadow-sm overflow-hidden">
            <div className="h-1 bg-primary" />
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-primary" />
                <h3 className="font-serif text-lg font-medium">
                  {bonus.sacrificePct === 100 ? 'Full Sacrifice' : 'Split Strategy'}
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Into pension" value={formatCurrency(result.afterSacrifice.pensionIn)} accent />
                {result.afterSacrifice.pensionIn < bonusAmt && (
                  <>
                    <Row label="Cash portion" value={formatCurrency(bonusAmt - result.afterSacrifice.pensionIn)} />
                    <Row label="Tax on cash" value={`-${formatCurrency(result.afterSacrifice.tax)}`} muted />
                    <Row label="NI on cash" value={`-${formatCurrency(result.afterSacrifice.ni)}`} muted />
                  </>
                )}
                <div className="border-t border-border pt-2">
                  <Row label="Net cash received" value={formatCurrency(result.afterSacrifice.net)} bold />
                </div>
                <div className="p-3 bg-primary/[0.04] rounded-sm mt-2 border border-primary/10">
                  <p className="text-xs text-muted-foreground">Tax + NI saved vs cash</p>
                  <p data-testid="bonus-saved" className="font-mono text-xl font-semibold text-primary">
                    {formatCurrency(result.saved.total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Smart Insight */}
      {result && result.saved.total > 0 && (
        <div className="p-4 rounded-sm border border-primary/20 bg-primary/[0.03]">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-primary">Bonus Sacrifice Insight</h4>
              <p className="text-sm mt-1">
                {bonus.sacrificePct === 100
                  ? `Sacrificing your entire £${bonusAmt.toLocaleString()} bonus saves ${formatCurrency(result.saved.total)} in tax and NI. Your adjusted net income drops to ${formatCurrency(result.adjustedAfterSacrifice)}.`
                  : `Sacrificing ${formatCurrency(sacrificeAmt)} (${bonus.sacrificePct}%) and taking ${formatCurrency(bonusAmt - sacrificeAmt)} as cash saves ${formatCurrency(result.saved.total)} vs taking it all as cash. Each £1 taken as cash costs you ${(result.asCash.rate * 100).toFixed(0)}p in deductions.`
                }
                {result.thresholds.length > 0 && result.adjustedAfterSacrifice <= 100000 &&
                  ' This also restores your full Personal Allowance and childcare entitlements.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Skip note */}
      {bonusAmt <= 0 && (
        <p className="text-sm text-muted-foreground">
          No bonus? Skip this step — it's only relevant if you receive a discretionary bonus.
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          data-testid="btn-back-bonus"
          variant="outline"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}
          className="rounded-sm px-6 py-5 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          data-testid="btn-next-bonus"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}
          className="rounded-sm px-8 py-6 text-sm uppercase tracking-wider font-semibold"
        >
          Continue to Pension vs ISA
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted, accent }) {
  return (
    <div className="flex justify-between items-center">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span className={`font-mono ${bold ? 'font-semibold text-base' : 'text-sm'} ${accent ? 'text-primary font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}
