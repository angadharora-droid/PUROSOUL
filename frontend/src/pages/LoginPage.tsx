import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/FormControls';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/api';
import { isValidPhone } from '@/lib/credentials';

interface LoginForm {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    setSubmitting(true);
    try {
      await login(values.identifier, values.password);
      toast.success('Welcome back!');
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-gray-50 px-4 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-3 flex justify-center">
          <Logo size={52} withText={false} />
        </div>
        <p className="mb-8 text-center font-display text-sm italic text-primary-700 dark:text-primary-300">
          Where Purity Lives in Every Drop
        </p>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Use your company account to access the scheme tracker.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email or phone number"
              type="text"
              placeholder="you@company.com or 98765 43210"
              autoComplete="username"
              required
              hint="Phone number sign-in is available for admins only."
              error={errors.identifier?.message}
              {...register('identifier', {
                required: 'Email or phone number is required',
                validate: (value) => {
                  const v = value.trim();
                  if (v.includes('@')) {
                    return /^\S+@\S+\.\S+$/.test(v) || 'Enter a valid email address';
                  }
                  return isValidPhone(v) || 'Enter a valid email address or phone number';
                },
              })}
            />
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <Button type="submit" className="w-full" loading={submitting}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Roles: Admin manages schemes & users · Sales registers parties and records dispatches.
        </p>
      </div>
    </div>
  );
}
