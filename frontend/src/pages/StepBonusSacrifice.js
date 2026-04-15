import { useMemo, useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, AlertTriangle, Lightbulb, PiggyBank, Banknote, Save, Star } from 'lucide-react';
import { calculateBonusTaxation } from '@/lib/taxEngine';
import { formatCurrency, parseSalaryInput } from '@/lib/formatters';

function buildScenarioSnapshot({ name, bonusAmount, sacrificePct, result }) {
  const sacrificed = result.afterSacrifice.pensionIn;
  const cashPortion = bonusAmount - sacrificed;
  const adjustedNetIncome = result.adjustedAfterSacrifice;

  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    bonusAmount,
    sacrificePct,
    metrics: {
      grossBonus: bonusAmount,
      amountToPension: sacrificed,
      amountAsCash: cashPortion,
      incomeTaxOnCash: result.afterSacrifice.tax,
      employeeNIOnCash: result.afterSacrifice.ni,
      effectiveTaxRate: result.afterSacrifice.rate,
      netCashReceived: result.afterSacrifice.net,
      totalPensionContribution: result.afterSacrifice.pensionIn,
      maintainsChildcare: adjustedNetIncome <= 100000,
      triggersPersonalAllowanceTrap: adjustedNetIncome > 100000 && adjustedNetIncome <= 125140,
    },
  };
}

export default function StepBonusSacrifice() {
  const { state, dispatch } = useWizard();
  const { bonus, step1, taxYear } = state;
  const salary = parseSalaryInput(step1.grossSalary);
  const bonusAmt = parseSalaryInput(bonus.amount);
  const sacrificeAmt = bonusAmt * ((bonus.sacrificePct || 0) / 100);
  const savedScenarios = bonus.savedScenarios || [];
  const [editingScenarioId, setEditingScenarioId] = useState(null);
  const [editingScenarioName, setEditingScenarioName] = useState('');

  const updateBonus = (p) => dispatch({ type: 'UPDATE_BONUS', payload: p });

  const result = useMemo(() => {
    if (salary <= 0 || bonusAmt <= 0) return null;
    return calculateBonusTaxation(salary, bonusAmt, step1.taxRegion, step1.studentLoan, sacrificeAmt, taxYear);
  }, [salary, bonusAmt, step1.taxRegion, step1.studentLoan, sacrificeAmt, taxYear]);

  const mostEfficientScenarioId = useMemo(() => {
    if (savedScenarios.length < 2) return null;
    return savedScenarios.reduce((best, scenario) => {
      if (!best || scenario.metrics.effectiveTaxRate < best.metrics.effectiveTaxRate) return scenario;
      return best;
    }, null)?.id || null;
  }, [savedScenarios]);

  const handleSaveScenario = () => {
    if (!result || savedScenarios.length >= 3) return;
    const scenarioName = `Scenario ${savedScenarios.length + 1}`;
    dispatch({
      type: 'SAVE_BONUS_SCENARIO',
      payload: buildScenarioSnapshot({
        name: scenarioName,
        bonusAmount: bonusAmt,
        sacrificePct: bonus.sacrificePct,
        result,
      }),
    });
  };

  const startRenamingScenario = (scenario) => {
    setEditingScenarioId(scenario.id);
    setEditingScenarioName(scenario.name);
  };

  const submitScenarioRename = () => {
    const trimmed = editingScenarioName.trim();
    if (!editingScenarioId) return;
    dispatch({
      type: 'RENAME_BONUS_SCENARIO',
      payload: {
        id: editingScenarioId,
        name: trimmed || 'Scenario',
      },
    });
    setEditingScenarioId(null);
    setEditingScenarioName('');
  };

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
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveScenario}
              disabled={!result || savedScenarios.length >= 3}
              className="rounded-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save scenario
            </Button>
            {savedScenarios.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => dispatch({ type: 'CLEAR_BONUS_SCENARIOS' })}
                className="rounded-sm"
              >
                Clear scenarios
              </Button>
            )}
          </div>
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

      {savedScenarios.length >= 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl font-medium text-primary">Saved Scenario Comparison</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Compare up to three saved bonus approaches side by side.
              </p>
            </div>
          </div>

          <div className="hidden lg:block overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="p-4 text-left font-medium text-muted-foreground">Metric</th>
                  {savedScenarios.map((scenario) => (
                    <th key={scenario.id} className="p-4 text-left align-top min-w-[200px]">
                      <ScenarioNameEditor
                        scenario={scenario}
                        isEditing={editingScenarioId === scenario.id}
                        editingName={editingScenarioName}
                        onChangeName={setEditingScenarioName}
                        onStartEditing={startRenamingScenario}
                        onSubmit={submitScenarioRename}
                        onCancel={() => {
                          setEditingScenarioId(null);
                          setEditingScenarioName('');
                        }}
                      />
                      {mostEfficientScenarioId === scenario.id && (
                        <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          <Star className="w-3 h-3" />
                          Most efficient
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Gross bonus amount" scenarios={savedScenarios} field="grossBonus" format="currency" />
                <ComparisonRow label="Amount sacrificed to pension" scenarios={savedScenarios} field="amountToPension" format="currency" />
                <ComparisonRow label="Amount taken as cash" scenarios={savedScenarios} field="amountAsCash" format="currency" />
                <ComparisonRow label="Income tax paid on cash portion" scenarios={savedScenarios} field="incomeTaxOnCash" format="currency" />
                <ComparisonRow label="Employee NI paid on cash portion" scenarios={savedScenarios} field="employeeNIOnCash" format="currency" />
                <ComparisonRow label="Effective tax rate on cash portion" scenarios={savedScenarios} field="effectiveTaxRate" format="percent" />
                <ComparisonRow label="Net cash received after tax and NI" scenarios={savedScenarios} field="netCashReceived" format="currency" />
                <ComparisonRow label="Total pension contribution including the sacrificed bonus" scenarios={savedScenarios} field="totalPensionContribution" format="currency" />
                <ComparisonRow label="Tax-Free Childcare eligibility maintained" scenarios={savedScenarios} field="maintainsChildcare" format="boolean" />
                <ComparisonRow label="£100k personal allowance trap triggered" scenarios={savedScenarios} field="triggersPersonalAllowanceTrap" format="boolean" />
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {savedScenarios.map((scenario) => (
              <Card key={scenario.id} className="rounded-sm border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <ScenarioNameEditor
                      scenario={scenario}
                      isEditing={editingScenarioId === scenario.id}
                      editingName={editingScenarioName}
                      onChangeName={setEditingScenarioName}
                      onStartEditing={startRenamingScenario}
                      onSubmit={submitScenarioRename}
                      onCancel={() => {
                        setEditingScenarioId(null);
                        setEditingScenarioName('');
                      }}
                    />
                    {mostEfficientScenarioId === scenario.id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        <Star className="w-3 h-3" />
                        Most efficient
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="Gross bonus amount" value={formatCurrency(scenario.metrics.grossBonus)} />
                    <Row label="Amount sacrificed to pension" value={formatCurrency(scenario.metrics.amountToPension)} />
                    <Row label="Amount taken as cash" value={formatCurrency(scenario.metrics.amountAsCash)} />
                    <Row label="Income tax paid on cash portion" value={formatCurrency(scenario.metrics.incomeTaxOnCash)} />
                    <Row label="Employee NI paid on cash portion" value={formatCurrency(scenario.metrics.employeeNIOnCash)} />
                    <Row label="Effective tax rate on cash portion" value={formatPercent(scenario.metrics.effectiveTaxRate)} />
                    <Row label="Net cash received after tax and NI" value={formatCurrency(scenario.metrics.netCashReceived)} bold />
                    <Row label="Total pension contribution including the sacrificed bonus" value={formatCurrency(scenario.metrics.totalPensionContribution)} accent />
                    <Row label="Tax-Free Childcare eligibility maintained" value={formatBoolean(scenario.metrics.maintainsChildcare)} />
                    <Row label="£100k personal allowance trap triggered" value={formatBoolean(scenario.metrics.triggersPersonalAllowanceTrap)} />
                  </div>
                </CardContent>
              </Card>
            ))}
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

function ComparisonRow({ label, scenarios, field, format }) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="p-4 font-medium text-foreground">{label}</td>
      {scenarios.map((scenario) => (
        <td key={scenario.id} className="p-4 font-mono text-sm text-foreground">
          {formatScenarioValue(scenario.metrics[field], format)}
        </td>
      ))}
    </tr>
  );
}

function ScenarioNameEditor({ scenario, isEditing, editingName, onChangeName, onStartEditing, onSubmit, onCancel }) {
  if (isEditing) {
    return (
      <input
        autoFocus
        value={editingName}
        onChange={(e) => onChangeName(e.target.value)}
        onBlur={onSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full rounded-sm border border-border bg-card px-2 py-1 text-sm font-medium text-foreground"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onStartEditing(scenario)}
      className="text-left font-serif text-lg font-medium text-foreground underline-offset-4 hover:underline"
    >
      {scenario.name}
    </button>
  );
}

function formatScenarioValue(value, format) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return formatPercent(value);
  if (format === 'boolean') return formatBoolean(value);
  return String(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBoolean(value) {
  return value ? 'Yes' : 'No';
}
