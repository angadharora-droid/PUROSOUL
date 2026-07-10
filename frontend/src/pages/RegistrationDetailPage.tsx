import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, Truck, ExternalLink, CalendarClock } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge, BooleanBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import Timeline from '@/components/registration/Timeline';
import { fetchRegistration, fetchTimeline } from '@/api/registrations';
import { fetchDispatches } from '@/api/dispatches';
import { fileUrl } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/lib/format';
import type { Dispatch } from '@/types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

export default function RegistrationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  const { data: registration, isLoading } = useQuery({
    queryKey: ['registration', id],
    queryFn: () => fetchRegistration(id),
    refetchInterval: 60_000, // live progress updates
  });

  const { data: dispatches = [], isLoading: dispatchesLoading } = useQuery({
    queryKey: ['dispatches', id],
    queryFn: () => fetchDispatches(id),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => fetchTimeline(id),
  });

  const dispatchColumns = useMemo<ColumnDef<Dispatch, any>[]>(
    () => [
      { accessorKey: 'dispatchDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue<string>()) },
      { accessorKey: 'billNumber', header: 'Bill No.' },
      {
        accessorKey: 'totalCases',
        header: 'Total',
        cell: ({ getValue }) => (
          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(getValue<number>())}</span>
        ),
      },
    ],
    []
  );

  if (isLoading || !registration) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const { progress, schemeSnapshot: snap } = registration;
  const screenshot = fileUrl(registration.screenshotUrl);
  const isPdf = registration.screenshotUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div>
      <PageHeader
        title={registration.partyName}
        description={snap.name}
        breadcrumbs={[{ label: 'Registrations', to: '/registrations' }, { label: registration.partyName }]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/print/${registration._id}`)}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={registration.status} />
        {registration.status === 'ACTIVE' && progress.daysLeft !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <CalendarClock className="h-3.5 w-3.5" />
            {progress.daysLeft} day{progress.daysLeft === 1 ? '' : 's'} until expiry
          </span>
        )}
      </div>

      {['ACTIVE', 'COMPLETED', 'EXPIRED'].includes(registration.status) && (
        <Card className="mb-6">
          <CardBody>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Target</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(progress.targetCases)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Achieved</p>
                  <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatNumber(progress.achievedCases)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Remaining</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(progress.remainingCases)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Benefit Earned</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(registration.status === 'EXPIRED' ? 0 : progress.benefitAmount)}
                  </p>
                </div>
              </div>
              <BooleanBadge value={progress.eligibleForBenefit} yes="Eligible for Benefit" no="Not Yet Eligible" />
            </div>
            <ProgressBar percent={progress.completionPercent} showLabel />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Dispatch History"
              description={`${dispatches.length} trip${dispatches.length === 1 ? '' : 's'} · ${formatNumber(registration.currentCases)} cases dispatched`}
            />
            <DataTable
              columns={dispatchColumns}
              data={dispatches}
              isLoading={dispatchesLoading}
              emptyTitle="No dispatches yet"
              emptyDescription="Dispatches are imported automatically from the daily sales report email."
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Scheme Details" />
            <CardBody>
              <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                <DetailRow label="Scheme" value={snap.name} />
                <DetailRow label="Benefit / Case" value={formatCurrency(snap.benefitPerCase)} />
                <DetailRow label="Target" value={`${formatNumber(snap.targetCases)} cases`} />
                <DetailRow label="Validity" value={`${snap.validityDays} days`} />
                <DetailRow label="Registered On" value={formatDate(registration.registrationDate)} />
                <DetailRow label="Activation" value={formatDateTime(registration.activationDate)} />
                <DetailRow label="Expiry" value={formatDate(registration.expiryDate)} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment Details" />
            <CardBody>
              <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                <DetailRow label="Advance Paid" value={formatCurrency(registration.advanceAmount)} />
                <DetailRow label="Payment Mode" value={registration.paymentMode} />
                <DetailRow label="UTR Number" value={registration.utrNumber || '—'} />
                <DetailRow label="Created By" value={registration.createdBy?.name ?? '—'} />
              </dl>
              {screenshot && (
                <button
                  onClick={() => (isPdf ? window.open(screenshot, '_blank') : setScreenshotOpen(true))}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-primary-600 transition hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:hover:bg-primary-900/20"
                >
                  <ExternalLink className="h-4 w-4" /> View Payment Screenshot
                </button>
              )}
              {registration.remarks && (
                <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {registration.remarks}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity Timeline" />
            <CardBody>
              <Timeline logs={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={screenshotOpen} onClose={() => setScreenshotOpen(false)} title="Payment Screenshot" size="lg">
        {screenshot && <img src={screenshot} alt="Payment screenshot" className="mx-auto max-h-[70vh] rounded-lg" />}
      </Modal>

      {registration.status === 'ACTIVE' && (
        <p className="mt-6 flex items-center gap-2 text-sm text-gray-400">
          <Truck className="h-4 w-4" /> Dispatches are imported automatically from the daily sales report email.
        </p>
      )}
    </div>
  );
}
