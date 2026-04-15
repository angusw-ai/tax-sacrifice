import { useMemo } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, PiggyBank, Car, Bike, Baby, Laptop, HeartPulse, Info, AlertTriangle, Gift } from 'lucide-react';
import { getMarginalTaxRate, getMarginalNIRate, getChildcareVoucherCap, calculateFullBreakdown, calculateTotalSacrifice, calculatePensionContribution, checkStatutoryPayRisk, getConstants } from '@/lib/taxEngine';
import { formatCurrency, parseSalaryInput, dv, dvLabel } from '@/lib/formatters';

export default function Step2Sacrifice() {
  const { state, dispatch } = useWizard();
  const { step2, taxYear, displayMode, employerNIPassback } = state;
  const salary = parseSalaryInput(state.step1.grossSalary);
  const region = state.step1.taxRegion;

  const marginalTax = getMarginalTaxRate(salary, region, taxYear);
  const marginalNI = getMarginalNIRate(salary, taxYear);
  const c = getConstants(taxYear);
  const childcareCap = getChildcareVoucherCap(salary, region);

  const updateScheme = (scheme, data) => {
    dispatch({ type: 'UPDATE_STEP2_SCHEME', payload: { scheme, data } });
  };

  const totals = useMemo(() => {
    const { totalAnnual } = calculateTotalSacrifice(salary, step2);
    const breakdown = salary > 0
      ? calculateFullBreakdown(salary, region, state.step1.studentLoan, step2, parseFloat(state.step1.employerPensionPct) || 0, taxYear)
      : null;
    const estTaxSaved = breakdown ? breakdown.savings.taxSaved : 0;
    const estNISaved = breakdown ? breakdown.savings.niSaved : 0;
    return { totalAnnual, estTaxSaved, estNISaved, totalSaved: estTaxSaved + estNISaved };
  }, [salary, step2, region, state.step1.studentLoan, state.step1.employerPensionPct, taxYear]);

  const pensionPreview = useMemo(() => calculatePensionContribution(salary, step2.pension), [salary, step2.pension]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-primary tracking-tight">
          Salary Sacrifice Schemes
        </h2>
        <p className="text-muted-foreground mt-2">
          Toggle on the schemes available to you and adjust values. Savings update in real time.
        </p>
      </div>

      {/* Summary Bar */}
      {totals.totalAnnual > 0 && (
        <div className="p-4 bg-primary/[0.04] border border-primary/20 rounded-sm">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total Sacrifice</p>
              <p data-testid="total-sacrifice" className="font-mono text-lg font-medium">{formatCurrency(dv(totals.totalAnnual, displayMode))}{dvLabel(displayMode)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Est. Tax + NI Saved</p>
              <p data-testid="est-tax-saved" className="font-mono text-lg font-medium text-primary">{formatCurrency(dv(totals.totalSaved, displayMode))}{dvLabel(displayMode)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Pension */}
        <SchemeCard
          icon={PiggyBank}
          title="Pension Contributions"
          description={step2.pension.method === 'relief'
            ? 'Paid from net pay with 20% basic-rate relief added to your pension'
            : 'Reduces gross salary before tax and NI'}
          testId="toggle-pension"
          enabled={step2.pension.enabled}
          onToggle={(v) => updateScheme('pension', { enabled: v })}
        >
          <div className="flex gap-2 mb-4">
            <Button
              data-testid="pension-type-pct"
              variant={step2.pension.inputType === 'percentage' ? 'default' : 'outline'}
              size="sm"
              className="rounded-sm text-xs"
              onClick={() => updateScheme('pension', { inputType: 'percentage' })}
            >
              % of salary
            </Button>
            <Button
              data-testid="pension-type-fixed"
              variant={step2.pension.inputType === 'fixed' ? 'default' : 'outline'}
              size="sm"
              className="rounded-sm text-xs"
              onClick={() => updateScheme('pension', { inputType: 'fixed' })}
            >
              £ per month
            </Button>
          </div>
          <div className="relative">
            {step2.pension.inputType === 'fixed' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
            )}
            <Input
              data-testid="input-pension-value"
              className={`font-mono rounded-sm h-11 ${step2.pension.inputType === 'fixed' ? 'pl-7' : 'pr-8'}`}
              type="number"
              min={0}
              value={step2.pension.value}
              onChange={(e) => updateScheme('pension', { value: parseFloat(e.target.value) || 0 })}
            />
            {step2.pension.inputType === 'percentage' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">%</span>
            )}
          </div>
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground mb-1 block">Pension Contribution Method</Label>
            <Select value={step2.pension.method} onValueChange={(v) => updateScheme('pension', { method: v })}>
              <SelectTrigger data-testid="select-pension-method" className="rounded-sm h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="netpay">Net Pay / Salary Sacrifice</SelectItem>
                <SelectItem value="relief">Relief at Source (+20% basic-rate relief)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SavingsNote pension={pensionPreview} marginalTax={marginalTax} marginalNI={marginalNI} />
        </SchemeCard>

        {/* EV Lease */}
        <SchemeCard
          icon={Car}
          title="Electric Vehicle Lease"
          description="Salary sacrifice with only 2% BIK for EVs"
          testId="toggle-ev"
          enabled={step2.ev.enabled}
          onToggle={(v) => updateScheme('ev', { enabled: v })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Monthly Lease Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                <Input
                  data-testid="input-ev-monthly"
                  className="pl-7 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  value={step2.ev.monthlyCost}
                  onChange={(e) => updateScheme('ev', { monthlyCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Car List Price (P11D)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                <Input
                  data-testid="input-ev-list-price"
                  className="pl-7 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  value={step2.ev.listPrice}
                  onChange={(e) => updateScheme('ev', { listPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> BIK at 2%: {formatCurrency((step2.ev.listPrice || 0) * 0.02)}/yr added to taxable income
          </p>
        </SchemeCard>

        {/* Cycle to Work */}
        <SchemeCard
          icon={Bike}
          title="Cycle to Work"
          description="Tax-free bicycle and equipment"
          testId="toggle-cycle"
          enabled={step2.cycle.enabled}
          onToggle={(v) => updateScheme('cycle', { enabled: v })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Equipment Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                <Input
                  data-testid="input-cycle-value"
                  className="pl-7 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  max={step2.cycle.cap}
                  value={step2.cycle.value}
                  onChange={(e) => updateScheme('cycle', { value: Math.min(parseFloat(e.target.value) || 0, step2.cycle.cap) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Scheme Cap</Label>
              <Select value={String(step2.cycle.cap)} onValueChange={(v) => updateScheme('cycle', { cap: parseInt(v), value: Math.min(step2.cycle.value, parseInt(v)) })}>
                <SelectTrigger data-testid="select-cycle-cap" className="rounded-sm h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">£1,000 (Standard)</SelectItem>
                  <SelectItem value="2500">£2,500 (Enhanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Spread over 12 months: {formatCurrency(Math.min(step2.cycle.value, step2.cycle.cap) / 12)}/month</p>
        </SchemeCard>

        {/* Childcare */}
        <SchemeCard
          icon={Baby}
          title="Childcare Vouchers"
          description={`Monthly cap at your rate: £${childcareCap}/month`}
          testId="toggle-childcare"
          enabled={step2.childcare.enabled}
          onToggle={(v) => updateScheme('childcare', { enabled: v })}
        >
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Monthly Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
              <Input
                data-testid="input-childcare-amount"
                className="pl-7 font-mono rounded-sm h-11"
                type="number"
                min={0}
                max={childcareCap}
                value={step2.childcare.monthlyAmount}
                onChange={(e) => updateScheme('childcare', { monthlyAmount: Math.min(parseFloat(e.target.value) || 0, childcareCap) })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cap: £{childcareCap}/month (Basic: £243, Higher: £124, Additional: £97)
          </p>
        </SchemeCard>

        {/* Technology */}
        <SchemeCard
          icon={Laptop}
          title="Technology Scheme"
          description="Laptops, tablets, phones via salary sacrifice"
          testId="toggle-tech"
          enabled={step2.tech.enabled}
          onToggle={(v) => updateScheme('tech', { enabled: v })}
        >
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Annual Equipment Value (max £3,000)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
              <Input
                data-testid="input-tech-value"
                className="pl-7 font-mono rounded-sm h-11"
                type="number"
                min={0}
                max={3000}
                value={step2.tech.value}
                onChange={(e) => updateScheme('tech', { value: Math.min(parseFloat(e.target.value) || 0, 3000) })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Spread over 12 months: {formatCurrency(Math.min(step2.tech.value, 3000) / 12)}/month</p>
        </SchemeCard>

        {/* Healthcare */}
        <SchemeCard
          icon={HeartPulse}
          title="Healthcare / Medical Insurance"
          description="P11D benefit — taxable but NI-free via sacrifice"
          testId="toggle-healthcare"
          enabled={step2.healthcare.enabled}
          onToggle={(v) => updateScheme('healthcare', { enabled: v })}
        >
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Monthly Premium</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
              <Input
                data-testid="input-healthcare-premium"
                className="pl-7 font-mono rounded-sm h-11"
                type="number"
                min={0}
                value={step2.healthcare.monthlyPremium}
                onChange={(e) => updateScheme('healthcare', { monthlyPremium: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> This is a P11D benefit: you save NI but the benefit is still taxable.
          </p>
        </SchemeCard>
      </div>

      {/* Employer NI Pass-back Toggle */}
      {totals.totalAnnual > 0 && (
        <Card className="rounded-sm border shadow-sm">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-brass/10">
                <Gift className="w-4 h-4 text-brass" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Employer NI Pass-back</h3>
                <p className="text-xs text-muted-foreground">
                  Employer adds their {(c.EMPLOYER_NI_RATE * 100).toFixed(1)}% NI saving ({formatCurrency(dv(totals.totalAnnual * c.EMPLOYER_NI_RATE, displayMode))}{dvLabel(displayMode)}) to your pension
                </p>
              </div>
            </div>
            <Switch
              data-testid="toggle-employer-ni-passback"
              checked={employerNIPassback}
              onCheckedChange={(v) => dispatch({ type: 'SET_EMPLOYER_NI_PASSBACK', payload: v })}
            />
          </div>
        </Card>
      )}

      {/* Statutory Pay Warning */}
      {(() => {
        const postSacrifice = salary - totals.totalAnnual;
        const warnings = checkStatutoryPayRisk(postSacrifice);
        if (warnings.length === 0) return null;
        return warnings.map((w, i) => (
          <div key={i} className="p-4 rounded-sm border border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
              <p className="text-sm text-red-900">{w}</p>
            </div>
          </div>
        ));
      })()}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          data-testid="btn-back-step2"
          variant="outline"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}
          className="rounded-sm px-6 py-5 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          data-testid="btn-next-step2"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
          className="rounded-sm px-8 py-6 text-sm uppercase tracking-wider font-semibold"
        >
          Continue to Bonus Sacrifice
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function SchemeCard({ icon: Icon, title, description, testId, enabled, onToggle, children }) {
  return (
    <Card className={`rounded-sm border overflow-hidden transition-all duration-300 ${enabled ? 'border-primary/30 shadow-sm' : ''}`}>
      <div className="flex items-center justify-between p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-sm flex items-center justify-center transition-colors ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon className={`w-4 h-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch data-testid={testId} checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-border">
          <div className="pt-5 space-y-3">
            {children}
          </div>
        </div>
      )}
    </Card>
  );
}

function SavingsNote({ pension, marginalTax, marginalNI }) {
  if (!pension?.inputAmount || pension.inputAmount <= 0) return null;

  if (pension.method === 'relief') {
    return (
      <div className="mt-3 p-3 bg-primary/[0.04] rounded-sm border border-primary/10">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">Your payment: <span className="font-mono font-medium text-foreground">{formatCurrency(pension.netContribution)}</span></span>
          <span className="text-muted-foreground">Tax relief added: <span className="font-mono font-medium text-primary">{formatCurrency(pension.taxReliefAtSource)}</span></span>
          <span className="text-muted-foreground">Total into pension: <span className="font-mono font-medium text-primary">{formatCurrency(pension.grossContribution)}</span></span>
        </div>
      </div>
    );
  }

  const taxSaved = pension.salaryReduction * marginalTax;
  const niSaved = pension.salaryReduction * marginalNI;
  const effectiveCost = pension.salaryReduction - taxSaved - niSaved;
  return (
    <div className="mt-3 p-3 bg-primary/[0.04] rounded-sm border border-primary/10">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className="text-muted-foreground">Salary sacrifice: <span className="font-mono font-medium text-foreground">{formatCurrency(pension.salaryReduction)}</span></span>
        <span className="text-muted-foreground">Tax relief: <span className="font-mono font-medium text-primary">{formatCurrency(taxSaved)}</span></span>
        <span className="text-muted-foreground">NI saved: <span className="font-mono font-medium text-primary">{formatCurrency(niSaved)}</span></span>
        <span className="text-muted-foreground">Effective cost: <span className="font-mono font-medium text-foreground">{formatCurrency(effectiveCost)}</span></span>
      </div>
    </div>
  );
}
