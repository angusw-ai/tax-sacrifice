import { useMemo } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, AlertTriangle, Lightbulb, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  calculateFullBreakdown, calculateIncomeTax, calculateEmployeeNI,
  getMarginalTaxRate, getMarginalNIRate, TAX_CONSTANTS
} from '@/lib/taxEngine';
import { projectPension, projectISA, projectLISA, estimatePensionDrawdown } from '@/lib/projectionEngine';
import { generateInsights } from '@/lib/insightsEngine';
import { formatCurrency, parseSalaryInput, dv, dvLabel } from '@/lib/formatters';

const COLORS = {
  takeHome: '#1E3F20',
  tax: '#9CA3AF',
  ni: '#D1D5DB',
  sacrifice: '#C19D60',
  studentLoan: '#6B7280',
  pension: '#1E3F20',
  isa: '#C19D60',
  cashIsa: '#9CA3AF',
  lisa: '#1E293B',
};

export default function Step4Results() {
  const { state, dispatch } = useWizard();
  const { step1, step2, step3, taxYear, displayMode } = state;
  const salary = parseSalaryInput(step1.grossSalary);
  const region = step1.taxRegion;
  const age = parseInt(step1.age) || 30;
  const employerPct = parseFloat(step1.employerPensionPct) || 0;
  const dm = displayMode;

  const breakdown = useMemo(() => {
    if (salary <= 0) return null;
    return calculateFullBreakdown(salary, region, step1.studentLoan, step2, employerPct, taxYear);
  }, [salary, region, step1.studentLoan, step2, employerPct, taxYear]);

  const insights = useMemo(() => {
    if (!breakdown) return [];
    return generateInsights(salary, breakdown.after.adjustedSalary, region, age, step2);
  }, [salary, breakdown, region, age, step2]);

  const projections = useMemo(() => {
    const results = {};
    const monthly = step3.monthlySaving;
    if (step3.vehicles.pension) {
      results.pension = projectPension(monthly * step3.splits.pension / 100, step3.growthRate, step3.horizon, step3.currentPensionPot);
    }
    if (step3.vehicles.stocksISA) {
      results.stocksISA = projectISA(monthly * step3.splits.stocksISA / 100, step3.growthRate, step3.horizon, step3.currentISABalance);
    }
    if (step3.vehicles.cashISA) {
      results.cashISA = projectISA(monthly * step3.splits.cashISA / 100, step3.cashISARate, step3.horizon, 0);
    }
    if (step3.vehicles.lisa && age >= 18 && age <= 39) {
      results.lisa = projectLISA(monthly * step3.splits.lisa / 100, step3.growthRate, step3.horizon, 0, age);
    }
    return results;
  }, [step3, age]);

  if (!breakdown) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please complete the previous steps first.</p>
        <Button className="mt-4 rounded-sm" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
          Go to Step 1
        </Button>
      </div>
    );
  }

  const { before, after, savings, pension: pensionData } = breakdown;

  // Chart data
  const barData = [
    {
      name: 'Before',
      'Take-Home': Math.round(before.takeHome),
      'Income Tax': Math.round(before.incomeTax.totalTax),
      'Employee NI': Math.round(before.employeeNI),
      'Student Loan': Math.round(before.studentLoan),
      'Sacrifice': 0,
    },
    {
      name: 'After',
      'Take-Home': Math.round(after.takeHome),
      'Income Tax': Math.round(after.incomeTax.totalTax),
      'Employee NI': Math.round(after.employeeNI),
      'Student Loan': Math.round(after.studentLoan),
      'Sacrifice': Math.round(after.totalSacrifice),
    },
  ];

  const pieData = [
    { name: 'Take-Home', value: Math.round(Math.max(0, after.takeHome)), color: COLORS.takeHome },
    { name: 'Income Tax', value: Math.round(after.incomeTax.totalTax), color: COLORS.tax },
    { name: 'Employee NI', value: Math.round(after.employeeNI), color: COLORS.ni },
    { name: 'Sacrifice', value: Math.round(after.totalSacrifice), color: COLORS.sacrifice },
    ...(after.studentLoan > 0 ? [{ name: 'Student Loan', value: Math.round(after.studentLoan), color: COLORS.studentLoan }] : []),
  ].filter(d => d.value > 0);

  // Projection chart data
  const projChartData = [];
  for (let y = 0; y <= step3.horizon; y++) {
    const point = { year: y };
    let combined = 0;
    if (projections.pension?.[y]) { point.Pension = projections.pension[y].balance; combined += point.Pension; }
    if (projections.stocksISA?.[y]) { point['S&S ISA'] = projections.stocksISA[y].balance; combined += point['S&S ISA']; }
    if (projections.cashISA?.[y]) { point['Cash ISA'] = projections.cashISA[y].balance; combined += point['Cash ISA']; }
    if (projections.lisa?.[y]) { point.LISA = projections.lisa[y].balance; combined += point.LISA; }
    point.Combined = combined;
    projChartData.push(point);
  }

  const totalProjected = projChartData.length > 0 ? projChartData[projChartData.length - 1].Combined : 0;
  const marginalTax = getMarginalTaxRate(salary, region, taxYear);
  const marginalNI = getMarginalNIRate(salary, taxYear);

  return (
    <div className="space-y-8" id="results-dashboard">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-primary tracking-tight">
            Your Optimised Position
          </h2>
          <p className="text-muted-foreground mt-2">
            Complete breakdown of your salary sacrifice and savings strategy.
          </p>
        </div>
        <Button
          data-testid="btn-print-pdf"
          variant="outline"
          onClick={() => window.print()}
          className="rounded-sm hidden sm:flex items-center gap-2 no-print"
        >
          <Printer className="w-4 h-4" />
          Export to PDF
        </Button>
      </div>

      {/* Key Savings Highlight */}
      <Card className="rounded-sm border-2 border-primary/20 bg-primary/[0.02] shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <ResultStat testId="result-tax-saved" label="Tax Saved" value={formatCurrency(dv(savings.taxSaved, dm))} sub={dvLabel(dm)} accent />
            <ResultStat testId="result-ni-saved" label="NI Saved" value={formatCurrency(dv(savings.niSaved, dm))} sub={dvLabel(dm)} accent />
            <ResultStat testId="result-total-saved" label="Total Saved" value={formatCurrency(dv(savings.totalSaved, dm))} sub={dvLabel(dm)} accent large />
            <ResultStat testId="result-employer-ni-saved" label="Employer NI Saved" value={formatCurrency(dv(savings.employerNISaved, dm))} sub={dvLabel(dm)} />
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
            Smart Insights
          </h3>
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Before vs After Table */}
      <Card className="rounded-sm border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-lg font-medium">Before & After Salary Sacrifice</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="before-after-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Item</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Before</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">After</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody>
                <TableRow label="Gross Salary" before={salary} after={salary} dm={dm} />
                <TableRow label="Salary Sacrifice" before={0} after={-after.totalSacrifice} isSacrifice dm={dm} />
                <TableRow label="Adjusted Salary" before={salary} after={after.adjustedSalary} bold dm={dm} />
                <TableRow label="Personal Allowance" before={before.incomeTax.personalAllowance} after={after.incomeTax.personalAllowance} dm={dm} />
                <TableRow label="Income Tax" before={-before.incomeTax.totalTax} after={-after.incomeTax.totalTax} dm={dm} />
                <TableRow label="Employee NI" before={-before.employeeNI} after={-after.employeeNI} dm={dm} />
                {(before.studentLoan > 0 || after.studentLoan > 0) && (
                  <TableRow label="Student Loan" before={-before.studentLoan} after={-after.studentLoan} dm={dm} />
                )}
                <TableRow label={`Take-Home Pay ${dvLabel(dm)}`} before={dv(before.takeHome, dm)} after={dv(after.takeHome, dm)} bold accent dm="annual" />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Band Breakdown */}
      <Card className="rounded-sm border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-lg font-medium">Income Tax by Band (After Sacrifice)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {after.incomeTax.breakdown.map((band, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{band.name}</span>
                <div className="flex gap-6">
                  <span className="font-mono text-xs text-muted-foreground">{formatCurrency(band.amount)} @ {(band.rate * 100).toFixed(0)}%</span>
                  <span className="font-mono font-medium w-24 text-right">{formatCurrency(band.tax)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
              <span className="font-medium">Total Income Tax</span>
              <span className="font-mono font-medium">{formatCurrency(after.incomeTax.totalTax)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pension Summary */}
      {pensionData.totalContribution > 0 && (
        <Card className="rounded-sm border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg font-medium">Pension Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your Contribution</p>
                <p className="font-mono text-lg font-medium">{formatCurrency(dv(pensionData.employeeContribution, dm))}{dvLabel(dm)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Employer Contribution</p>
                <p className="font-mono text-lg font-medium">{formatCurrency(dv(pensionData.employerContribution, dm))}{dvLabel(dm)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total into Pension</p>
                <p data-testid="result-total-pension" className="font-mono text-lg font-medium text-primary">{formatCurrency(dv(pensionData.totalContribution, dm))}{dvLabel(dm)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Effective cost per £1 into pension: <span className="font-mono font-medium">{((1 - marginalTax - marginalNI) * 100).toFixed(0)}p</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Bar Chart */}
        <Card className="rounded-sm border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg font-medium">Salary Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" style={{ minWidth: 0, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200} debounce={100}>
                <BarChart data={barData} barGap={8} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "'IBM Plex Sans'" }} tickLine={false} axisLine={{ stroke: '#E5E0D8' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono'" }} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} width={55} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Sans'" }} />
                  <Bar dataKey="Take-Home" stackId="a" fill={COLORS.takeHome} />
                  <Bar dataKey="Income Tax" stackId="a" fill={COLORS.tax} />
                  <Bar dataKey="Employee NI" stackId="a" fill={COLORS.ni} />
                  {barData.some(d => d['Student Loan'] > 0) && <Bar dataKey="Student Loan" stackId="a" fill={COLORS.studentLoan} />}
                  <Bar dataKey="Sacrifice" stackId="a" fill={COLORS.sacrifice} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="rounded-sm border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg font-medium">Where Your Money Goes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" style={{ minWidth: 0, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200} debounce={100}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Sans'" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projected Wealth Chart */}
      {projChartData.length > 1 && (
        <Card className="rounded-sm border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg font-medium">Projected Wealth Over {step3.horizon} Years</CardTitle>
              <span data-testid="result-total-projected" className="font-mono text-sm font-medium text-primary">{formatCurrency(totalProjected)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]" style={{ minWidth: 0, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200} debounce={100}>
                <LineChart data={projChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono'" }} tickLine={false} axisLine={{ stroke: '#E5E0D8' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono'" }} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} width={60} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'IBM Plex Sans'" }} />
                  {projections.pension && <Line type="monotone" dataKey="Pension" stroke={COLORS.pension} strokeWidth={2} dot={false} />}
                  {projections.stocksISA && <Line type="monotone" dataKey="S&S ISA" stroke={COLORS.isa} strokeWidth={2} dot={false} />}
                  {projections.cashISA && <Line type="monotone" dataKey="Cash ISA" stroke={COLORS.cashIsa} strokeWidth={2} dot={false} />}
                  {projections.lisa && <Line type="monotone" dataKey="LISA" stroke={COLORS.lisa} strokeWidth={2} dot={false} />}
                  {Object.keys(projections).length > 1 && <Line type="monotone" dataKey="Combined" stroke="#6B21A8" strokeWidth={2} strokeDasharray="6 3" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings Efficiency Summary */}
      <Card className="rounded-sm border-2 border-brass/30 bg-brass/[0.03] shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brass" />
            <h3 className="font-serif text-lg font-medium">Savings Efficiency</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tax + NI saved by sacrificing</span>
              <p className="font-mono text-xl font-medium text-primary mt-1">{formatCurrency(dv(savings.totalSaved, dm))}{dvLabel(dm)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Projected wealth at {step3.horizon} years</span>
              <p className="font-mono text-xl font-medium text-primary mt-1">{formatCurrency(totalProjected)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Take-home reduction</span>
              <p className="font-mono text-lg font-medium mt-1">{formatCurrency(dv(before.takeHome - after.takeHome, dm))}{dvLabel(dm)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Employer NI saved (potential pass-back)</span>
              <p className="font-mono text-lg font-medium mt-1">{formatCurrency(dv(savings.employerNISaved, dm))}{dvLabel(dm)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4 no-print">
        <Button
          data-testid="btn-back-step4"
          variant="outline"
          onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
          className="rounded-sm px-6 py-5 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          data-testid="btn-print-pdf-bottom"
          onClick={() => window.print()}
          className="rounded-sm px-8 py-6 text-sm uppercase tracking-wider font-semibold"
        >
          <Printer className="w-4 h-4 mr-2" />
          Export to PDF
        </Button>
      </div>
    </div>
  );
}

function ResultStat({ testId, label, value, sub, accent, large }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
      <p data-testid={testId} className={`font-mono font-medium ${large ? 'text-2xl' : 'text-lg'} ${accent ? 'text-primary' : 'text-foreground'}`}>
        {value}<span className="text-xs text-muted-foreground ml-1">{sub}</span>
      </p>
    </div>
  );
}

function TableRow({ label, before, after, bold, accent, isSacrifice, dm = 'annual' }) {
  const b = dv(before, dm);
  const a = dv(after, dm);
  const diff = (a || 0) - (b || 0);
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className={`p-4 ${bold ? 'font-medium' : ''}`}>{label}</td>
      <td className={`p-4 text-right font-mono text-sm ${accent ? 'text-primary font-medium' : ''}`}>{formatCurrency(Math.abs(b))}</td>
      <td className={`p-4 text-right font-mono text-sm ${accent ? 'text-primary font-medium' : ''}`}>
        {isSacrifice ? `-${formatCurrency(Math.abs(a))}` : formatCurrency(Math.abs(a))}
      </td>
      <td className={`p-4 text-right font-mono text-sm ${diff > 0 ? 'text-primary' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
        {diff !== 0 ? (diff > 0 ? '+' : '') + formatCurrency(diff) : '-'}
      </td>
    </tr>
  );
}

function InsightCard({ insight }) {
  const iconMap = {
    critical: AlertTriangle,
    warning: AlertTriangle,
    opportunity: Lightbulb,
    success: CheckCircle2,
    info: Info,
  };
  const colorMap = {
    critical: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    opportunity: 'border-brass/30 bg-brass/5 text-foreground',
    success: 'border-primary/30 bg-primary/5 text-primary',
    info: 'border-border bg-muted/30 text-foreground',
  };
  const Icon = iconMap[insight.type] || Info;
  const color = colorMap[insight.type] || colorMap.info;

  return (
    <div className={`p-4 rounded-sm border ${color}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-medium">{insight.title}</h4>
          <p className="text-sm mt-1 opacity-90">{insight.message}</p>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-3 rounded-sm shadow-md">
      {label !== undefined && <p className="font-serif text-sm font-medium mb-1">{typeof label === 'number' ? `Year ${label}` : label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-xs" style={{ color: entry.color || entry.payload?.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}
