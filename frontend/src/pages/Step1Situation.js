import { useMemo } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, TrendingUp, Baby } from 'lucide-react';
import { calculateIncomeTax, calculateEmployeeNI, calculateStudentLoan, getMarginalTaxRate } from '@/lib/taxEngine';
import { formatCurrency, parseSalaryInput, formatSalaryInput, normalizeIntegerInput, normalizeFloatInput, dv, dvLabel } from '@/lib/formatters';

export default function Step1Situation() {
  const { state, dispatch } = useWizard();
  const { step1, taxYear, displayMode } = state;

  const update = (field, value) => {
    dispatch({ type: 'UPDATE_STEP1', payload: { [field]: value } });
  };

  const salary = parseSalaryInput(step1.grossSalary);
  const age = parseInt(step1.age) || 0;
  const canProceed = salary > 0 && age > 0;

  const taxSummary = useMemo(() => {
    if (salary <= 0) return null;
    const tax = calculateIncomeTax(salary, step1.taxRegion, taxYear);
    const ni = calculateEmployeeNI(salary, taxYear);
    const studentLoan = calculateStudentLoan(salary, step1.studentLoan, taxYear);
    const takeHome = salary - tax.totalTax - ni - studentLoan;
    const marginalRate = getMarginalTaxRate(salary, step1.taxRegion, taxYear);
    return { tax: tax.totalTax, ni, studentLoan, takeHome, marginalRate, pa: tax.personalAllowance };
  }, [salary, step1.taxRegion, step1.studentLoan, taxYear]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-primary tracking-tight">
          Your Situation
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          Enter your employment details to begin optimising your salary.
        </p>
      </div>

      <Card className="rounded-sm border shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Gross Salary */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
              Gross Annual Salary
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                £
              </span>
              <Input
                data-testid="input-gross-salary"
                className="pl-7 font-mono rounded-sm h-11"
                placeholder="75,000"
                value={formatSalaryInput(step1.grossSalary)}
                onChange={(e) => {
                  update('grossSalary', normalizeIntegerInput(e.target.value));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Tax Region */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Tax Region
              </Label>
              <Select
                value={step1.taxRegion}
                onValueChange={(v) => update('taxRegion', v)}
              >
                <SelectTrigger data-testid="select-tax-region" className="rounded-sm h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="england">England / Wales / NI</SelectItem>
                  <SelectItem value="scotland">Scotland</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Student Loan */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Student Loan
              </Label>
              <Select
                value={step1.studentLoan}
                onValueChange={(v) => update('studentLoan', v)}
              >
                <SelectTrigger data-testid="select-student-loan" className="rounded-sm h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="plan1">Plan 1</SelectItem>
                  <SelectItem value="plan2">Plan 2</SelectItem>
                  <SelectItem value="plan4">Plan 4</SelectItem>
                  <SelectItem value="postgrad">Postgraduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Age
              </Label>
              <Input
                data-testid="input-age"
                className="font-mono rounded-sm h-11"
                type="number"
                min={16}
                max={75}
                placeholder="35"
                value={step1.age}
                onChange={(e) => update('age', normalizeIntegerInput(e.target.value))}
              />
            </div>

            {/* Employer Pension */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Employer Pension (% of salary)
              </Label>
              <div className="relative">
                <Input
                  data-testid="input-employer-pension"
                  className="pr-8 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="3"
                  value={step1.employerPensionPct}
                  onChange={(e) => update('employerPensionPct', normalizeFloatInput(e.target.value))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                  %
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children & Childcare Section */}
      <Card className="rounded-sm border shadow-sm">
        <div className="flex items-center justify-between p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Baby className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Children & Childcare</h3>
              <p className="text-xs text-muted-foreground">For Tax-Free Childcare and 30 Free Hours modelling</p>
            </div>
          </div>
          <Switch
            data-testid="toggle-has-children"
            checked={step1.hasChildren}
            onCheckedChange={(v) => update('hasChildren', v)}
          />
        </div>
        {step1.hasChildren && (
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 border-t border-border">
            <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  Number of Children (under 12)
                </Label>
                <Input
                  data-testid="input-num-children"
                  className="font-mono rounded-sm h-11"
                  type="number"
                  min={1}
                  max={6}
                  value={step1.numberOfChildren}
                  onChange={(e) => update('numberOfChildren', normalizeIntegerInput(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  Ages (comma-separated)
                </Label>
                <Input
                  data-testid="input-child-ages"
                  className="font-mono rounded-sm h-11"
                  placeholder="3, 5"
                  value={step1.childAges}
                  onChange={(e) => update('childAges', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  Monthly Childcare Cost/Child
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                  <Input
                    data-testid="input-childcare-cost"
                    className="pl-7 font-mono rounded-sm h-11"
                    type="number"
                    min={0}
                    value={step1.monthlyCostPerChild}
                    onChange={(e) => update('monthlyCostPerChild', normalizeFloatInput(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Tax Summary Preview */}
      {taxSummary && (
        <Card className="rounded-sm border border-primary/20 bg-primary/[0.02] shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-primary">
                Current Tax Position
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryItem label="Income Tax" value={formatCurrency(dv(taxSummary.tax, displayMode))} sub={dvLabel(displayMode)} testId="preview-income-tax" />
              <SummaryItem label="Employee NI" value={formatCurrency(dv(taxSummary.ni, displayMode))} sub={dvLabel(displayMode)} testId="preview-ni" />
              <SummaryItem label="Take-Home" value={formatCurrency(dv(taxSummary.takeHome, displayMode))} sub={dvLabel(displayMode)} accent testId="preview-take-home" />
              <SummaryItem label="Marginal Rate" value={`${(taxSummary.marginalRate * 100).toFixed(0)}%`} testId="preview-marginal-rate" />
            </div>
            {salary > 100000 && salary <= 125140 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                <p className="text-sm text-amber-900 font-medium">
                  Your income is in the 60% effective tax trap zone (£100k-£125,140).
                  Salary sacrifice can help you escape this.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button
          data-testid="btn-next-step1"
          disabled={!canProceed}
          onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}
          className="rounded-sm px-8 py-6 text-sm uppercase tracking-wider font-semibold"
        >
          Continue to Salary Sacrifice
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, sub, accent, testId }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
      <p data-testid={testId} className={`font-mono text-lg font-medium ${accent ? 'text-primary' : 'text-foreground'}`}>
        {value}{sub && <span className="text-xs text-muted-foreground ml-0.5">{sub}</span>}
      </p>
    </div>
  );
}
