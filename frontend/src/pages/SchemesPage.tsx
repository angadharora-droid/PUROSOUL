import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { BooleanBadge } from '@/components/ui/Badge';
import { Input, Select, Textarea } from '@/components/ui/FormControls';
import { fetchSchemes, createScheme, updateScheme, deleteScheme, type SchemeInput } from '@/api/schemes';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Scheme } from '@/types';

interface SchemeFormValues {
  name: string;
  advanceAmount: number;
  benefitPerCase: number;
  targetCases: number;
  validityDays: number;
  description: string;
  isActive: string;
}

export default function SchemesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Scheme | null>(null);
  const [deleting, setDeleting] = useState<Scheme | null>(null);

  const { data: schemes = [], isLoading } = useQuery({ queryKey: ['schemes'], queryFn: () => fetchSchemes() });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeFormValues>();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schemes'] });

  const saveMutation = useMutation({
    mutationFn: (values: SchemeInput) =>
      editing ? updateScheme(editing._id, values) : createScheme(values),
    onSuccess: () => {
      toast.success(editing ? 'Scheme updated' : 'Scheme created');
      invalidate();
      closeForm();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheme(id),
    onSuccess: () => {
      toast.success('Scheme deleted');
      invalidate();
      setDeleting(null);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      name: '',
      advanceAmount: 0,
      benefitPerCase: 1,
      targetCases: 1000,
      validityDays: 60,
      description: '',
      isActive: 'true',
    });
    setFormOpen(true);
  };

  const openEdit = (scheme: Scheme) => {
    setEditing(scheme);
    reset({
      name: scheme.name,
      advanceAmount: scheme.advanceAmount,
      benefitPerCase: scheme.benefitPerCase,
      targetCases: scheme.targetCases,
      validityDays: scheme.validityDays,
      description: scheme.description ?? '',
      isActive: String(scheme.isActive),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const onSubmit = (values: SchemeFormValues) => {
    saveMutation.mutate({
      name: values.name,
      advanceAmount: Number(values.advanceAmount),
      benefitPerCase: Number(values.benefitPerCase),
      targetCases: Number(values.targetCases),
      validityDays: Number(values.validityDays),
      description: values.description,
      isActive: values.isActive === 'true',
    });
  };

  const columns = useMemo<ColumnDef<Scheme, any>[]>(
    () => [
      { accessorKey: 'name', header: 'Scheme' },
      {
        accessorKey: 'advanceAmount',
        header: 'Advance',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'benefitPerCase',
        header: 'Benefit / Case',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'targetCases',
        header: 'Target (Cases)',
        cell: ({ getValue }) => formatNumber(getValue<number>()),
      },
      {
        accessorKey: 'validityDays',
        header: 'Validity',
        cell: ({ getValue }) => `${getValue<number>()} days`,
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ getValue }) => <BooleanBadge value={getValue<boolean>()} yes="Active" no="Inactive" />,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <button
              onClick={() => openEdit(row.original)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30"
              aria-label="Edit scheme"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(row.original)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              aria-label="Delete scheme"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Scheme Master"
        description="Create and manage dealer/distributor schemes."
        breadcrumbs={[{ label: 'Scheme Master' }]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Scheme
          </Button>
        }
      />

      <Card>
        <DataTable
          columns={columns}
          data={schemes}
          isLoading={isLoading}
          emptyTitle="No schemes yet"
          emptyDescription="Create your first scheme to start registering parties."
        />
      </Card>

      <Modal open={formOpen} onClose={closeForm} title={editing ? `Edit ${editing.name}` : 'New Scheme'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Scheme Name"
            placeholder="e.g. Scheme A"
            required
            error={errors.name?.message}
            {...register('name', { required: 'Scheme name is required' })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Advance Payment (₹)"
              type="number"
              min={0}
              step="0.01"
              required
              error={errors.advanceAmount?.message}
              {...register('advanceAmount', {
                required: 'Advance payment is required',
                min: { value: 0, message: 'Must be 0 or more' },
              })}
            />
            <Input
              label="Extra Benefit Per Case (₹)"
              type="number"
              min={0}
              step="0.01"
              required
              error={errors.benefitPerCase?.message}
              {...register('benefitPerCase', {
                required: 'Benefit per case is required',
                min: { value: 0, message: 'Must be 0 or more' },
              })}
            />
            <Input
              label="Sales Target (Cases)"
              type="number"
              min={1}
              required
              error={errors.targetCases?.message}
              {...register('targetCases', {
                required: 'Sales target is required',
                min: { value: 1, message: 'Must be at least 1' },
              })}
            />
            <Input
              label="Validity (Days)"
              type="number"
              min={1}
              required
              error={errors.validityDays?.message}
              {...register('validityDays', {
                required: 'Validity is required',
                min: { value: 1, message: 'Must be at least 1 day' },
              })}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Short description of the scheme terms…"
            error={errors.description?.message}
            {...register('description')}
          />
          <Select label="Status" {...register('isActive')}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save Changes' : 'Create Scheme'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting._id)}
        title="Delete scheme"
        message={`Delete "${deleting?.name}" permanently? Schemes with registrations cannot be deleted — mark them inactive instead.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
