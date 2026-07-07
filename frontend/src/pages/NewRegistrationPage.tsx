import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/FormControls';
import FileUpload from '@/components/ui/FileUpload';
import { fetchSchemes } from '@/api/schemes';
import { createRegistration } from '@/api/registrations';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatNumber, toInputDate } from '@/lib/format';
import { PAYMENT_MODES, type PaymentMode } from '@/types';

interface RegistrationFormValues {
  partyName: string;
  scheme: string;
  registrationDate: string;
  advanceAmount: number | '';
  paymentMode: PaymentMode;
  utrNumber: string;
  remarks: string;
}

export default function NewRegistrationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string>();

  const { data: schemes = [] } = useQuery({
    queryKey: ['schemes', 'active'],
    queryFn: () => fetchSchemes(true),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    defaultValues: {
      registrationDate: toInputDate(),
      paymentMode: 'UPI',
      advanceAmount: '',
    },
  });

  const selectedSchemeId = watch('scheme');
  const selectedScheme = schemes.find((s) => s._id === selectedSchemeId);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => createRegistration(formData),
    onSuccess: (registration) => {
      toast.success('Registration saved — validation email sent');
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/registrations/${registration._id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const onSubmit = (values: RegistrationFormValues) => {
    if (!screenshot) {
      setScreenshotError('A payment screenshot/attachment is required');
      return;
    }
    setScreenshotError(undefined);

    const formData = new FormData();
    formData.append('partyName', values.partyName);
    formData.append('scheme', values.scheme);
    formData.append('registrationDate', values.registrationDate);
    formData.append('advanceAmount', String(values.advanceAmount));
    formData.append('paymentMode', values.paymentMode);
    if (values.utrNumber) formData.append('utrNumber', values.utrNumber);
    if (values.remarks) formData.append('remarks', values.remarks);
    formData.append('screenshot', screenshot);

    mutation.mutate(formData);
  };

  return (
    <div>
      <PageHeader
        title="New Registration"
        description="Register a party for a scheme. The scheme becomes active immediately and the payment details are emailed automatically to the configured recipients."
        breadcrumbs={[{ label: 'Registrations', to: '/registrations' }, { label: 'New' }]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Party Details" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Party Name"
                placeholder="e.g. Sharma Traders"
                required
                error={errors.partyName?.message}
                {...register('partyName', { required: 'Party name is required' })}
              />
              <Select
                label="Scheme"
                required
                error={errors.scheme?.message}
                {...register('scheme', {
                  required: 'Select a scheme',
                  onChange: (e) => {
                    const s = schemes.find((sc) => sc._id === e.target.value);
                    if (s) setValue('advanceAmount', s.advanceAmount);
                  },
                })}
              >
                <option value="">Select a scheme…</option>
                {schemes.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — {formatCurrency(s.advanceAmount)} advance
                  </option>
                ))}
              </Select>
              <Input
                label="Registration Date"
                type="date"
                min={toInputDate()}
                required
                hint="Previous dates cannot be selected"
                error={errors.registrationDate?.message}
                {...register('registrationDate', {
                  required: 'Registration date is required',
                  validate: (v) => v >= toInputDate() || 'Registration date cannot be in the past',
                })}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Advance Payment" />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Advance Amount (₹)"
                  type="number"
                  min={selectedScheme?.advanceAmount ?? 0}
                  step="0.01"
                  required
                  hint={
                    selectedScheme
                      ? `Minimum ${formatCurrency(selectedScheme.advanceAmount)} for ${selectedScheme.name}`
                      : undefined
                  }
                  error={errors.advanceAmount?.message}
                  {...register('advanceAmount', {
                    required: 'Advance amount is required',
                    validate: (v) => {
                      if (selectedScheme && Number(v) < selectedScheme.advanceAmount) {
                        return `Advance cannot be less than ${formatCurrency(selectedScheme.advanceAmount)} for ${selectedScheme.name}`;
                      }
                      return Number(v) >= 0 || 'Must be 0 or more';
                    },
                  })}
                />
                <Select label="Payment Mode" required {...register('paymentMode')}>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="UTR / Reference Number"
                placeholder="Transaction UTR, cheque no. or receipt reference (optional)"
                error={errors.utrNumber?.message}
                {...register('utrNumber')}
              />
              <FileUpload
                label="Payment Screenshot / Attachment"
                required
                hint="Mandatory for all payment modes"
                value={screenshot}
                onChange={(f) => {
                  setScreenshot(f);
                  if (f) setScreenshotError(undefined);
                }}
                error={screenshotError}
              />

              <Textarea
                label="Remarks"
                placeholder="Any additional notes…"
                error={errors.remarks?.message}
                {...register('remarks')}
              />
            </CardBody>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/registrations')}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Submit Registration
            </Button>
          </div>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader title="Scheme Summary" />
            <CardBody>
              {selectedScheme ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Scheme</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">{selectedScheme.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Advance Payment</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(selectedScheme.advanceAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Benefit</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(selectedScheme.benefitPerCase)} / case
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Sales Target</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {formatNumber(selectedScheme.targetCases)} cases
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Validity</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">{selectedScheme.validityDays} days</dd>
                  </div>
                  {selectedScheme.description && (
                    <p className="border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      {selectedScheme.description}
                    </p>
                  )}
                  <p className="rounded-lg bg-primary-50 p-3 text-xs text-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                    The scheme activates as soon as it is submitted — the expiry date is calculated
                    automatically from today plus the scheme validity.
                  </p>
                </dl>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a scheme to preview its terms here.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
