import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/FormControls';
import { createDispatch, type DispatchInput } from '@/api/dispatches';
import { getApiErrorMessage } from '@/lib/api';
import { toInputDate } from '@/lib/format';
import type { Registration } from '@/types';

interface DispatchFormValues {
  dispatchDate: string;
  billNumber: string;
  vehicleNumber: string;
  cases250ml: number | '';
  cases500ml: number | '';
  cases1l: number | '';
  remarks: string;
}

interface DispatchFormProps {
  registration: Registration;
  onSuccess?: () => void;
}

export default function DispatchForm({ registration, onSuccess }: DispatchFormProps) {
  const queryClient = useQueryClient();

  const minDate = registration.activationDate ? toInputDate(new Date(registration.activationDate)) : undefined;
  const maxDate = registration.expiryDate ? toInputDate(new Date(registration.expiryDate)) : undefined;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DispatchFormValues>({
    defaultValues: {
      dispatchDate: toInputDate(),
      cases250ml: '',
      cases500ml: '',
      cases1l: '',
    },
  });

  const [c250, c500, c1l] = [watch('cases250ml'), watch('cases500ml'), watch('cases1l')];
  const totalCases = (Number(c250) || 0) + (Number(c500) || 0) + (Number(c1l) || 0);

  const mutation = useMutation({
    mutationFn: (payload: DispatchInput) => createDispatch(payload),
    onSuccess: ({ registration: updated }) => {
      toast.success(
        updated.status === 'COMPLETED'
          ? '🎉 Dispatch added — sales target achieved!'
          : 'Dispatch entry added'
      );
      queryClient.invalidateQueries({ queryKey: ['registration', registration._id] });
      queryClient.invalidateQueries({ queryKey: ['dispatches', registration._id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', registration._id] });
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      reset({ dispatchDate: toInputDate(), billNumber: '', vehicleNumber: '', cases250ml: '', cases500ml: '', cases1l: '', remarks: '' });
      onSuccess?.();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const onSubmit = (values: DispatchFormValues) => {
    if (totalCases <= 0) {
      toast.error('Enter at least one case to dispatch');
      return;
    }
    mutation.mutate({
      registration: registration._id,
      dispatchDate: values.dispatchDate,
      billNumber: values.billNumber,
      vehicleNumber: values.vehicleNumber || undefined,
      cases250ml: Number(values.cases250ml) || 0,
      cases500ml: Number(values.cases500ml) || 0,
      cases1l: Number(values.cases1l) || 0,
      remarks: values.remarks || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Dispatch Date"
          type="date"
          min={minDate}
          max={maxDate}
          required
          hint="Must be within the scheme validity window"
          error={errors.dispatchDate?.message}
          {...register('dispatchDate', { required: 'Dispatch date is required' })}
        />
        <Input
          label="Sales Bill Number"
          placeholder="e.g. INV-00123"
          required
          hint="Bill numbers cannot repeat"
          error={errors.billNumber?.message}
          {...register('billNumber', { required: 'Bill number is required' })}
        />
      </div>

      <Input
        label="Vehicle Number (optional)"
        placeholder="e.g. MH12 AB 1234"
        error={errors.vehicleNumber?.message}
        {...register('vehicleNumber')}
      />

      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          Cases <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Input label="250 ml" type="number" min={0} error={errors.cases250ml?.message} {...register('cases250ml', { min: 0 })} />
          <Input label="500 ml" type="number" min={0} error={errors.cases500ml?.message} {...register('cases500ml', { min: 0 })} />
          <Input label="1 Litre" type="number" min={0} error={errors.cases1l?.message} {...register('cases1l', { min: 0 })} />
        </div>
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
          Total cases:{' '}
          <span className="font-bold text-primary-600 dark:text-primary-400">{totalCases.toLocaleString('en-IN')}</span>
        </p>
      </div>

      <Textarea label="Remarks" placeholder="Optional notes…" {...register('remarks')} />

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>
          Add Dispatch
        </Button>
      </div>
    </form>
  );
}
