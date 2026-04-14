import { useMemo } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, TrendingUp, Shield, Banknote, Gift, Layers, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMarginalTaxRate, getMarginalNIRate, TAX_CONSTANTS, calculateCarryForward, calculate2029NImpact, calculateTotalSacrifice, getConstants } from '@/lib/taxEngine';
import { projectPension, projectISA, projectLISA, estimatePensionDrawdown, getEffectivePensionCost } from '@/lib/projectionEngine';
import { formatCurrency, parseSalaryInput, dv, dvLabel } from '@/lib/formatters';

const CHART_COLORS = { pension: '#1E3F20', stocksISA: '#C19D60', cashISA: '#9CA3AF', lisa: '#1E293B', combined: '#6B21A8' };

export default function Step3Comparison() {
  const { state, dispatch } = useWizard();
  const { step3, step1, taxYear, displayMode } = state;
  const salary = parseSalaryInput(step1.grossSalary);
  const age = parseInt(step1.age) || 30;
  const region = step1.taxRegion;
  const marginalTax = getMarginalTaxRate(salary, region, taxYear);
  const marginalNI = getMarginalNIRate(salary, taxYear);
  const effectivePensionCost = getEffectivePensionCost(marginalTax, marginalNI);
  const showLISA = age >= 18 && age <= 39;

  const update = (payload) => dispatch({ type: 'UPDATE_STEP3', payload });
  const toggleVehicle = (payload) => dispatch({ type: 'UPDATE_STEP3_VEHICLES', payload });
  const updateSplit = (payload) => dispatch({ type: 'UPDATE_STEP3_SPLITS', payload });

  // Auto-balance splits when toggling vehicles
  const activeVehicles = Object.entries(step3.vehicles).filter(([k, v]) => v && (k !== 'lisa' || showLISA));
  const activeCount = activeVehicles.length;

  const projections = useMemo(() => {
    const results = {};
    const monthly = step3.monthlySaving;

    if (step3.vehicles.pension) {
      const pensionMonthly = monthly * (step3.splits.pension / 100);
      results.pension = projectPension(pensionMonthly, step3.growthRate, step3.horizon, step3.currentPensionPot);
    }
    if (step3.vehicles.stocksISA) {
      const isaMonthly = monthly * (step3.splits.stocksISA / 100);
      results.stocksISA = projectISA(isaMonthly, step3.growthRate, step3.horizon, step3.currentISABalance);
    }
    if (step3.vehicles.cashISA) {
      const cashMonthly = monthly * (step3.splits.cashISA / 100);
      results.cashISA = projectISA(cashMonthly, step3.cashISARate, step3.horizon, 0);
    }
    if (step3.vehicles.lisa && showLISA) {
      const lisaMonthly = monthly * (step3.splits.lisa / 100);
      results.lisa = projectLISA(lisaMonthly, step3.growthRate, step3.horizon, 0, age);
    }
    return results;
  }, [step3, age, showLISA]);

  // Build chart data
  const chartData = useMemo(() => {
    const maxYears = step3.horizon;
    const data = [];
    for (let y = 0; y <= maxYears; y++) {
      const point = { year: y };
      if (projections.pension?.[y]) point.Pension = projections.pension[y].balance;
      if (projections.stocksISA?.[y]) point['S&S ISA'] = projections.stocksISA[y].balance;
      if (projections.cashISA?.[y]) point['Cash ISA'] = projections.cashISA[y].balance;
      if (projections.lisa?.[y]) point.LISA = projections.lisa[y].balance;
      // Combined
      point.Combined = (point.Pension || 0) + (point['S&S ISA'] || 0) + (point['Cash ISA'] || 0) + (point.LISA || 0);
      data.push(point);
    }
    return data;
  }, [projections, step3.horizon]);

  const getFinalValue = (key) => {
    const proj = projections[key];
    return proj ? proj[proj.length - 1]?.balance || 0 : 0;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-primary tracking-tight">
          Pension vs ISA Comparison
        </h2>
        <p className="text-muted-foreground mt-2">
          Model the same monthly amount across different savings vehicles and compare outcomes.
        </p>
      </div>

      {/* Input Controls */}
      <Card className="rounded-sm border shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Monthly Amount to Save
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                <Input
                  data-testid="input-monthly-saving"
                  className="pl-7 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  value={step3.monthlySaving}
                  onChange={(e) => update({ monthlySaving: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Growth Rate: {step3.growthRate}%
              </Label>
              <Slider
                data-testid="slider-growth-rate"
                value={[step3.growthRate]}
                onValueChange={([v]) => update({ growthRate: v })}
                min={1}
                max={10}
                step={0.5}
                className="mt-3"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Time Horizon: {step3.horizon} years
              </Label>
              <Slider
                data-testid="slider-horizon"
                value={[step3.horizon]}
                onValueChange={([v]) => update({ horizon: v })}
                min={1}
                max={40}
                step={1}
                className="mt-3"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                Cash ISA Rate: {step3.cashISARate}%
              </Label>
              <Slider
                data-testid="slider-cash-rate"
                value={[step3.cashISARate]}
                onValueChange={([v]) => update({ cashISARate: v })}
                min={1}
                max={8}
                step={0.25}
                className="mt-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">Current Pension Pot</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                <Input
                  data-testid="input-current-pension"
                  className="pl-7 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  value={step3.currentPensionPot}
                  onChange={(e) => update({ currentPensionPot: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">Current ISA Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                <Input
                  data-testid="input-current-isa"
                  className="pl-7 font-mono rounded-sm h-11"
                  type="number"
                  min={0}
                  value={step3.currentISABalance}
                  onChange={(e) => update({ currentISABalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Selection & Allocation */}
      <div>
        <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-4">
          Select & Allocate Savings Vehicles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <VehicleToggle
            icon={TrendingUp}
            label="Pension (Salary Sacrifice)"
            testId="toggle-vehicle-pension"
            active={step3.vehicles.pension}
            onToggle={(v) => toggleVehicle({ pension: v })}
            splitPct={step3.splits.pension}
            onSplitChange={(v) => updateSplit({ pension: v })}
            color={CHART_COLORS.pension}
            detail={`Effective cost: ${(effectivePensionCost * 100).toFixed(0)}p per £1`}
          />
          <VehicleToggle
            icon={Shield}
            label="Stocks & Shares ISA"
            testId="toggle-vehicle-stocks-isa"
            active={step3.vehicles.stocksISA}
            onToggle={(v) => toggleVehicle({ stocksISA: v })}
            splitPct={step3.splits.stocksISA}
            onSplitChange={(v) => updateSplit({ stocksISA: v })}
            color={CHART_COLORS.stocksISA}
            detail="Tax-free growth & withdrawals"
          />
          <VehicleToggle
            icon={Banknote}
            label="Cash ISA"
            testId="toggle-vehicle-cash-isa"
            active={step3.vehicles.cashISA}
            onToggle={(v) => toggleVehicle({ cashISA: v })}
            splitPct={step3.splits.cashISA}
            onSplitChange={(v) => updateSplit({ cashISA: v })}
            color={CHART_COLORS.cashISA}
            detail={`Interest rate: ${step3.cashISARate}%`}
          />
          {showLISA && (
            <VehicleToggle
              icon={Gift}
              label="Lifetime ISA"
              testId="toggle-vehicle-lisa"
              active={step3.vehicles.lisa}
              onToggle={(v) => toggleVehicle({ lisa: v })}
              splitPct={step3.splits.lisa}
              onSplitChange={(v) => updateSplit({ lisa: v })}
              color={CHART_COLORS.lisa}
              detail="25% government bonus (max £4k/yr)"
              warning="25% penalty on early withdrawal before 60"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Allocation total: {Object.entries(step3.splits).filter(([k]) => step3.vehicles[k]).reduce((s, [, v]) => s + v, 0)}%
          {Object.entries(step3.splits).filter(([k]) => step3.vehicles[k]).reduce((s, [, v]) => s + v, 0) !== 100 &&
            <span className="text-amber-600 ml-1">(should total 100%)</span>
          }
        </p>
      </div>

      {/* Comparison View */}
      <Tabs value={step3.viewMode} onValueChange={(v) => update({ viewMode: v })}>
        <TabsList className="rounded-sm">
          <TabsTrigger data-testid="tab-simple-view" value="simple" className="rounded-sm text-xs uppercase tracking-wider">
            Simple Comparison
          </TabsTrigger>
          <TabsTrigger data-testid="tab-advanced-view" value="advanced" className="rounded-sm text-xs uppercase tracking-wider">
            Projection Chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {step3.vehicles.pension && (
              <ComparisonCard
                testId="card-pension-comparison"
                title="Pension"
                color={CHART_COLORS.pension}
                monthly={step3.monthlySaving * step3.splits.pension / 100}
                effectiveCost={step3.monthlySaving * step3.splits.pension / 100 * effectivePensionCost}
                projected={getFinalValue('pension')}
                horizon={step3.horizon}
                pros={['Tax + NI relief on contributions', '25% tax-free lump sum', 'Employer may match']}
                cons={['Locked until age 55/57', 'Withdrawals taxed as income']}
                drawdown={estimatePensionDrawdown(getFinalValue('pension'))}
              />
            )}
            {step3.vehicles.stocksISA && (
              <ComparisonCard
                testId="card-isa-comparison"
                title="Stocks & Shares ISA"
                color={CHART_COLORS.stocksISA}
                monthly={step3.monthlySaving * step3.splits.stocksISA / 100}
                effectiveCost={step3.monthlySaving * step3.splits.stocksISA / 100}
                projected={getFinalValue('stocksISA')}
                horizon={step3.horizon}
                pros={['Tax-free growth & withdrawals', 'Fully flexible access', '£20k annual allowance']}
                cons={['No tax relief on contributions', 'From post-tax income']}
              />
            )}
            {step3.vehicles.cashISA && (
              <ComparisonCard
                testId="card-cash-isa-comparison"
                title="Cash ISA"
                color={CHART_COLORS.cashISA}
                monthly={step3.monthlySaving * step3.splits.cashISA / 100}
                effectiveCost={step3.monthlySaving * step3.splits.cashISA / 100}
                projected={getFinalValue('cashISA')}
                horizon={step3.horizon}
                pros={['Capital protected', 'Tax-free interest', 'Instant access']}
                cons={['Lower returns than equities', 'Inflation risk']}
              />
            )}
            {step3.vehicles.lisa && showLISA && (
              <ComparisonCard
                testId="card-lisa-comparison"
                title="Lifetime ISA"
                color={CHART_COLORS.lisa}
                monthly={Math.min(step3.monthlySaving * step3.splits.lisa / 100, 4000 / 12)}
                effectiveCost={Math.min(step3.monthlySaving * step3.splits.lisa / 100, 4000 / 12)}
                projected={getFinalValue('lisa')}
                horizon={step3.horizon}
                pros={['25% government bonus', 'Tax-free growth', 'Good for first home or retirement']}
                cons={['£4k/yr max contribution', '25% penalty before 60', 'Must be 18-39 to open']}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <Card className="rounded-sm border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg font-medium">Projected Growth Over {step3.horizon} Years</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] sm:h-[400px]" style={{ minWidth: 0, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200} debounce={100}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E0D8' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                      tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                    {step3.vehicles.pension && <Line type="monotone" dataKey="Pension" stroke={CHART_COLORS.pension} strokeWidth={2} dot={false} />}
                    {step3.vehicles.stocksISA && <Line type="monotone" dataKey="S&S ISA" stroke={CHART_COLORS.stocksISA} strokeWidth={2} dot={false} />}
                    {step3.vehicles.cashISA && <Line type="monotone" dataKey="Cash ISA" stroke={CHART_COLORS.cashISA} strokeWidth={2} dot={false} />}
                    {step3.vehicles.lisa && showLISA && <Line type="monotone" dataKey="LISA" stroke={CHART_COLORS.lisa} strokeWidth={2} dot={false} />}
                    {activeCount > 1 && <Line type="monotone" dataKey="Combined" stroke="#6B21A8" strokeWidth={2} strokeDasharray="6 3" dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Carry Forward Section */}
      <Card className="rounded-sm border shadow-sm">
        <div className="flex items-center justify-between p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <h3 className="font-medium text-sm">Pension Carry Forward</h3>
              <p className="text-xs text-muted-foreground">Use unused allowance from the last 3 years</p>
            </div>
          </div>
          <Switch
            data-testid="toggle-carry-forward"
            checked={step3.carryForward}
            onCheckedChange={(v) => update({ carryForward: v })}
          />
        </div>
        {step3.carryForward && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-border">
            <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[['cfYear1', '3 years ago'], ['cfYear2', '2 years ago'], ['cfYear3', 'Last year']].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{label} — contributions</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">£</span>
                    <Input
                      data-testid={`input-${key}`}
                      className="pl-7 font-mono rounded-sm h-10"
                      type="number"
                      min={0}
                      value={step3[key]}
                      onChange={(e) => update({ [key]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const cf = calculateCarryForward(step3.cfYear1, step3.cfYear2, step3.cfYear3);
              return (
                <div className="mt-4 p-4 bg-primary/[0.04] rounded-sm border border-primary/10">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Unused Allowance</p>
                      <p className="font-mono font-semibold text-primary">{formatCurrency(cf.totalUnused)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max This Year (incl. carry forward)</p>
                      <p className="font-mono font-semibold text-primary">{formatCurrency(cf.maxThisYear)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    You must have been a member of a registered pension scheme in each year being carried forward from.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {/* 2029 NI Cap Section */}
      {(() => {
        const { totalAnnual } = calculateTotalSacrifice(salary, state.step2);
        if (totalAnnual <= 0) return null;
        const impact = calculate2029NImpact(totalAnnual, salary, taxYear);
        return (
          <Card className="rounded-sm border shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">2029 NI Cap Impact</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                From April 2029, only the first £2,000 of salary sacrifice pension contributions will be exempt from NI.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Current NI Saving</p>
                  <p className="font-mono font-medium">{formatCurrency(dv(impact.currentEmployeeSaving, displayMode))}{dvLabel(displayMode)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Post-2029 NI Saving</p>
                  <p className="font-mono font-medium">{formatCurrency(dv(impact.post2029EmployeeSaving, displayMode))}{dvLabel(displayMode)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Additional NI Cost</p>
                  <p className="font-mono font-medium text-amber-600">{formatCurrency(dv(impact.additionalEmployeeCost, displayMode))}{dvLabel(displayMode)}</p>
                </div>
              </div>
              {impact.stillWorthIt && (
                <div className="mt-3 p-3 bg-primary/[0.04] rounded-sm border border-primary/10">
                  <p className="text-xs text-primary font-medium">
                    Still worth it — income tax relief of {formatCurrency(dv(impact.incomeTaxRelief, displayMode))}{dvLabel(displayMode)} continues in full. Net saving drops from {formatCurrency(dv(impact.currentTotal, displayMode))} to {formatCurrency(dv(impact.post2029Total, displayMode))}{dvLabel(displayMode)}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          data-testid="btn-back-step3"
          variant="outline"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
          className="rounded-sm px-6 py-5 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          data-testid="btn-next-step3"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 5 })}
          className="rounded-sm px-8 py-6 text-sm uppercase tracking-wider font-semibold"
        >
          View Full Results
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function VehicleToggle({ icon: Icon, label, testId, active, onToggle, splitPct, onSplitChange, color, detail, warning }) {
  return (
    <div className={`p-4 rounded-sm border transition-all duration-200 ${active ? 'border-border shadow-sm bg-card' : 'border-border/50 bg-muted/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Switch data-testid={testId} checked={active} onCheckedChange={onToggle} />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
      {warning && <p className="text-xs text-amber-600 mt-1">{warning}</p>}
      {active && (
        <div className="mt-3 flex items-center gap-3">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Allocation:</Label>
          <Input
            className="w-20 h-8 font-mono text-xs rounded-sm text-center"
            type="number"
            min={0}
            max={100}
            value={splitPct}
            onChange={(e) => onSplitChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ testId, title, color, monthly, effectiveCost, projected, horizon, pros, cons, drawdown }) {
  return (
    <Card data-testid={testId} className="rounded-sm border shadow-sm overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <CardContent className="p-5 space-y-4">
        <h3 className="font-serif text-lg font-medium">{title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly contribution</span>
            <span className="font-mono font-medium">{formatCurrency(monthly)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effective cost/month</span>
            <span className="font-mono font-medium">{formatCurrency(effectiveCost)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="text-muted-foreground">Projected at {horizon}yr</span>
            <span className="font-mono font-medium text-primary text-lg">{formatCurrency(projected)}</span>
          </div>
          {drawdown && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">25% tax-free lump sum</span>
                <span className="font-mono text-xs">{formatCurrency(drawdown.taxFreeLump)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. annual drawdown</span>
                <span className="font-mono text-xs">{formatCurrency(drawdown.annualDrawdown)}/yr</span>
              </div>
            </>
          )}
        </div>
        <div className="pt-2 border-t border-border space-y-1">
          {pros.map((p, i) => (
            <p key={i} className="text-xs text-primary flex items-start gap-1">
              <span className="mt-0.5">+</span> {p}
            </p>
          ))}
          {cons.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="mt-0.5">-</span> {c}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-3 rounded-sm shadow-md">
      <p className="font-serif text-sm font-medium mb-1">Year {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}
