import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchPrintPayload } from '@/api/registrations';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/status';
import { useAuth } from '@/context/AuthContext';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-avoid-break mt-6">
      <h2 className="mb-2 border-b-2 border-[#145AE2] pb-1 text-sm font-bold uppercase tracking-wide text-[#145AE2]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="font-semibold text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PrintReportPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['print', id],
    queryFn: () => fetchPrintPayload(id),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { registration: reg, dispatches, totals } = data;
  const { progress, schemeSnapshot: snap } = reg;
  const benefitAmount = reg.status === 'EXPIRED' ? 0 : progress.benefitAmount;

  return (
    <div className="min-h-screen bg-gray-100 py-8 dark:bg-gray-950 print:bg-white print:py-0">
      {/* Toolbar (hidden in print) */}
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] items-center justify-between px-4">
        <Button variant="outline" onClick={() => navigate(`/registrations/${reg._id}`)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print Report
        </Button>
      </div>

      {/* A4 sheet */}
      <div className="print-page mx-auto max-w-[210mm] rounded-xl bg-white p-10 text-gray-900 shadow-lg print:rounded-none">
        {/* Header */}
        <header className="flex items-start justify-between border-b-4 border-[#145AE2] pb-4">
          <div>
            <img src="/purosoul-logo.png" alt="Puro Soul" className="h-12 w-auto" />
            <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
              Amarjit Fiscal Ventures Pvt. Ltd.
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-xl font-bold text-[#145AE2]">Scheme Performance Report</h1>
            <p className="text-xs text-gray-500">Generated on {formatDateTime(new Date().toISOString())}</p>
            <p className="text-xs text-gray-500">Status: {STATUS_LABELS[reg.status]}</p>
          </div>
        </header>

        <Section title="Party Details">
          <InfoGrid
            rows={[
              ['Party Name', reg.partyName],
              ['Registration Date', formatDate(reg.registrationDate)],
              ['Advance Paid', formatCurrency(reg.advanceAmount)],
              ['Payment Mode', reg.paymentMode],
              ['UTR / Reference No.', reg.utrNumber || '—'],
              ['Created By', reg.createdBy?.name ?? '—'],
            ]}
          />
        </Section>

        <Section title="Scheme Details">
          <InfoGrid
            rows={[
              ['Scheme', snap.name],
              ['Benefit Per Case', formatCurrency(snap.benefitPerCase)],
              ['Sales Target', `${formatNumber(snap.targetCases)} cases`],
              ['Validity', `${snap.validityDays} days`],
              ['Activation Date', formatDateTime(reg.activationDate)],
              ['Expiry Date', formatDate(reg.expiryDate)],
            ]}
          />
        </Section>

        <Section title="Progress">
          <div className="mb-2 grid grid-cols-4 gap-4 text-center">
            {[
              ['Target', formatNumber(progress.targetCases)],
              ['Achieved', formatNumber(progress.achievedCases)],
              ['Remaining', formatNumber(progress.remainingCases)],
              ['Completion', `${progress.completionPercent}%`],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-gray-200 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#145AE2]"
              style={{ width: `${Math.min(100, progress.completionPercent)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="text-xs text-gray-500">Eligible for Benefit</p>
              <p className="font-bold">{progress.eligibleForBenefit ? 'YES' : 'NO'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Benefit Earned</p>
              <p className="text-xl font-bold text-[#145AE2]">{formatCurrency(benefitAmount)}</p>
            </div>
          </div>
        </Section>

        <Section title="Dispatch History">
          {dispatches.length ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {['#', 'Date', 'Bill No.', 'Vehicle', '250 ml', '500 ml', '1 L', 'Total'].map((h) => (
                    <th key={h} className="border border-gray-300 px-2 py-1.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d, i) => (
                  <tr key={d._id}>
                    <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1">{formatDate(d.dispatchDate)}</td>
                    <td className="border border-gray-300 px-2 py-1">{d.billNumber}</td>
                    <td className="border border-gray-300 px-2 py-1">{d.vehicleNumber || '—'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(d.cases250ml)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(d.cases500ml)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(d.cases1l)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                      {formatNumber(d.totalCases)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1.5">
                    Case Summary ({totals.trips} trip{totals.trips === 1 ? '' : 's'})
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{formatNumber(totals.cases250ml)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{formatNumber(totals.cases500ml)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{formatNumber(totals.cases1l)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{formatNumber(totals.totalCases)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">No dispatches recorded yet.</p>
          )}
        </Section>

        {/* Signatures */}
        <section className="print-avoid-break mt-12 grid grid-cols-2 gap-16">
          {['Party Signature', 'Authorized Signatory'].map((label) => (
            <div key={label} className="text-center">
              <div className="border-t border-gray-400 pt-2 text-sm text-gray-600">{label}</div>
            </div>
          ))}
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
          Printed by {user?.name ?? '—'} · Puro Soul Scheme Tracker · purosoul.in · This is a system generated
          report.
        </footer>
      </div>
    </div>
  );
}
