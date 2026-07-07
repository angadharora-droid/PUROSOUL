import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, FilterX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { FieldWrapper, Input, Select } from '@/components/ui/FormControls';
import { fetchRegistrations } from '@/api/registrations';
import { fetchSchemes } from '@/api/schemes';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { STATUSES, type Registration } from '@/types';

export default function RegistrationsPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState('');
  const [bill, setBill] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [scheme, setScheme] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const debouncedQ = useDebounce(q);
  const debouncedBill = useDebounce(bill);

  const filters = {
    q: debouncedQ,
    bill: debouncedBill,
    status,
    scheme,
    from,
    to,
    page,
    limit: 10,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['registrations', filters],
    queryFn: () => fetchRegistrations(filters),
    placeholderData: keepPreviousData,
  });

  const { data: schemes = [] } = useQuery({ queryKey: ['schemes'], queryFn: () => fetchSchemes() });

  const hasFilters = q || bill || status || scheme || from || to;

  const clearFilters = () => {
    setQ('');
    setBill('');
    setStatus('');
    setScheme('');
    setFrom('');
    setTo('');
    setPage(1);
    setSearchParams({});
  };

  const columns = useMemo<ColumnDef<Registration, any>[]>(
    () => [
      {
        accessorKey: 'partyName',
        header: 'Party',
        cell: ({ getValue }) => (
          <p className="font-medium text-gray-900 dark:text-white">{getValue<string>()}</p>
        ),
      },
      {
        id: 'scheme',
        header: 'Scheme',
        accessorFn: (row) => row.schemeSnapshot?.name,
      },
      {
        accessorKey: 'registrationDate',
        header: 'Registered',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        accessorKey: 'advanceAmount',
        header: 'Advance',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        id: 'progress',
        header: 'Progress',
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original.progress;
          if (!['ACTIVE', 'COMPLETED', 'EXPIRED'].includes(row.original.status)) {
            return <span className="text-xs text-gray-400">—</span>;
          }
          return (
            <div className="w-36">
              <ProgressBar percent={p.completionPercent} size="sm" showLabel />
              <p className="mt-0.5 text-[11px] text-gray-400">
                {formatNumber(p.achievedCases)} / {formatNumber(p.targetCases)} cases
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<Registration['status']>()} short />,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Registrations"
        description="Search and track all party scheme registrations."
        breadcrumbs={[{ label: 'Registrations' }]}
        actions={
          hasRole('sales', 'admin') && (
            <Button onClick={() => navigate('/registrations/new')}>
              <Plus className="h-4 w-4" /> New Registration
            </Button>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 md:col-span-2 xl:col-span-2">
            <FieldWrapper label="Search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Party name…"
                  className="input-base pl-9"
                />
              </div>
            </FieldWrapper>
          </div>
          <Input
            label="Bill number"
            placeholder="e.g. INV-00123"
            value={bill}
            onChange={(e) => {
              setBill(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Select
            label="Scheme"
            value={scheme}
            onChange={(e) => {
              setScheme(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All schemes</option>
            {schemes.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            label="From date"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To date"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex items-end">
            <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
              <FilterX className="h-4 w-4" /> Clear filters
            </Button>
          </div>
        </div>
      </Card>

      <Card
        className={`overflow-hidden ${isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}`}
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyTitle="No registrations found"
          emptyDescription={hasFilters ? 'Try adjusting your search or filters.' : 'Create the first registration to get started.'}
          onRowClick={(row) => navigate(`/registrations/${row._id}`)}
          maxHeight="max(420px, calc(100vh - 480px))"
        />
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
