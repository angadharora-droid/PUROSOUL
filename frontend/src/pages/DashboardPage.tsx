import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Hourglass,
  Trophy,
  CalendarX2,
  Truck,
  IndianRupee,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { fetchDashboard } from '@/api/dashboard';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

/* Chart colors validated (dataviz six-checks) per surface: light on #fff, dark on #111827. */
const CHART_COLORS = {
  light: { registrations: '#145AE2', cases: '#0D9488', grid: '#e5e7eb', tick: '#6b7280' },
  dark: { registrations: '#578FF2', cases: '#0D9488', grid: '#374151', tick: '#9ca3af' },
};

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
      <p className="text-gray-500 dark:text-gray-400">
        {formatNumber(payload[0].value)} {unit}
      </p>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  iconClass: string;
  to?: string;
}

function StatCard({ label, value, sub, icon: Icon, iconClass, to }: StatCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={to ? () => navigate(to) : undefined}
      className={`card p-5 text-left transition ${to ? 'hover:border-primary-300 hover:shadow-md dark:hover:border-primary-700' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <span className={`rounded-xl p-2.5 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}

/** SVG completion gauge — hero number in the center, brand ring around it. */
function CompletionGauge({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = 62;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`Average completion ${clamped}%`}>
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-gray-200 dark:stroke-gray-800" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          transform="rotate(-90 80 80)"
        />
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-gray-900 text-3xl font-bold dark:fill-white"
        >
          {clamped}%
        </text>
        <text x="80" y="98" textAnchor="middle" className="fill-gray-400 text-[11px]">
          avg. completion
        </text>
      </svg>
      <p className="mt-1 max-w-[220px] text-center text-xs text-gray-400">
        Average target completion across activated schemes
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const colors = dark ? CHART_COLORS.dark : CHART_COLORS.light;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60_000, // live updates
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Company-wide scheme performance at a glance." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const { cards, monthly, completionAvg, recent } = data;

  const axisProps = {
    tickLine: false,
    axisLine: false,
    tick: { fill: colors.tick, fontSize: 12 },
  };

  return (
    <div>
      <PageHeader title="Dashboard" description="Company-wide scheme performance at a glance." />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Active Schemes"
          value={formatNumber(cards.active)}
          icon={Activity}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10"
          to="/registrations?status=ACTIVE"
        />
        <StatCard
          label="Expiring in 7 Days"
          value={formatNumber(cards.expiringSoon)}
          sub="active schemes nearing expiry"
          icon={Hourglass}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/10"
          to="/registrations?status=ACTIVE"
        />
        <StatCard
          label="Completed Schemes"
          value={formatNumber(cards.completed)}
          icon={Trophy}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10"
          to="/registrations?status=COMPLETED"
        />
        <StatCard
          label="Expired Schemes"
          value={formatNumber(cards.expired)}
          icon={CalendarX2}
          iconClass="bg-gray-200 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300"
          to="/registrations?status=EXPIRED"
        />
        <StatCard
          label="Today's Dispatch"
          value={`${formatNumber(cards.todayDispatchCases)} cases`}
          sub={`${cards.todayDispatchTrips} trip${cards.todayDispatchTrips === 1 ? '' : 's'} today`}
          icon={Truck}
          iconClass="bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300"
        />
        <StatCard
          label="Total Benefits Earned"
          value={formatCurrency(cards.totalBenefits)}
          sub="across completed schemes"
          icon={IndianRupee}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10"
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Monthly Registrations" description="New registrations, last 6 months" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip content={<ChartTooltip unit="registrations" />} cursor={{ fill: colors.grid, opacity: 0.35 }} />
                <Bar dataKey="registrations" fill={colors.registrations} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Monthly Dispatch" description="Cases dispatched, last 6 months" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip content={<ChartTooltip unit="cases" />} cursor={{ fill: colors.grid, opacity: 0.35 }} />
                <Bar dataKey="cases" fill={colors.cases} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Completion" description="How close schemes are to target" />
          <CardBody>
            <CompletionGauge percent={completionAvg} color={colors.registrations} />
          </CardBody>
        </Card>
      </div>

      {/* Recent registrations */}
      <Card className="mt-6">
        <CardHeader
          title="Recent Registrations"
          actions={
            <Link to="/registrations" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          }
        />
        {recent.length ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recent.map((reg) => (
              <li
                key={reg._id}
                onClick={() => navigate(`/registrations/${reg._id}`)}
                className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-primary-50/50 dark:hover:bg-gray-800/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">{reg.partyName}</p>
                  <p className="text-xs text-gray-500">
                    {reg.schemeSnapshot?.name} · {formatDate(reg.registrationDate)}
                  </p>
                </div>
                {['ACTIVE', 'COMPLETED', 'EXPIRED'].includes(reg.status) && (
                  <div className="hidden w-40 sm:block">
                    <ProgressBar percent={reg.progress.completionPercent} size="sm" showLabel />
                  </div>
                )}
                <StatusBadge status={reg.status} short />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No registrations yet"
            description="Newly created registrations will show up here."
          />
        )}
      </Card>
    </div>
  );
}
