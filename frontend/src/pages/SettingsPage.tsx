import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Moon, Sun, MailPlus, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { BooleanBadge } from '@/components/ui/Badge';
import { Input, PasswordInput, Select } from '@/components/ui/FormControls';
import { changePassword } from '@/api/auth';
import { createUser, fetchUsers, updateUser } from '@/api/users';
import { fetchValidationEmails, updateValidationEmails } from '@/api/settings';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getApiErrorMessage } from '@/lib/api';
import type { Role, User } from '@/types';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  const { dark, toggle } = useTheme();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('admin');
  const [userModalOpen, setUserModalOpen] = useState(false);

  // ----- change password -----
  const pwForm = useForm<PasswordForm>();
  const pwMutation = useMutation({
    mutationFn: (values: PasswordForm) =>
      changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    onSuccess: () => {
      toast.success('Password updated');
      pwForm.reset();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  // ----- validation email recipients (admin) -----
  const { data: savedEmails } = useQuery({
    queryKey: ['settings', 'emails'],
    queryFn: fetchValidationEmails,
    enabled: isAdmin,
  });
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();

  useEffect(() => {
    if (savedEmails) setEmails(savedEmails);
  }, [savedEmails]);

  const emailsMutation = useMutation({
    mutationFn: (list: string[]) => updateValidationEmails(list),
    onSuccess: (list) => {
      toast.success('Validation email recipients saved');
      setEmails(list);
      queryClient.invalidateQueries({ queryKey: ['settings', 'emails'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const addEmail = () => {
    const value = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (emails.includes(value)) {
      setEmailError('This email is already in the list');
      return;
    }
    setEmailError(undefined);
    setEmails((prev) => [...prev, value]);
    setNewEmail('');
  };

  const dirtyEmails =
    JSON.stringify(emails) !== JSON.stringify(savedEmails ?? []);

  // ----- user management (admin) -----
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const newUserForm = useForm<NewUserForm>({ defaultValues: { role: 'sales' } });
  const createUserMutation = useMutation({
    mutationFn: (values: NewUserForm) => createUser(values),
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      newUserForm.reset({ name: '', email: '', password: '', role: 'sales' });
      setUserModalOpen(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateUser(id, { isActive }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const userColumns = useMemo<ColumnDef<User, any>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ getValue }) => <BooleanBadge value={getValue<boolean>()} yes="Active" no="Disabled" />,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) =>
          row.original._id !== user?._id && (
            <Button
              size="sm"
              variant={row.original.isActive ? 'outline' : 'secondary'}
              onClick={() =>
                toggleUserMutation.mutate({ id: row.original._id, isActive: !row.original.isActive })
              }
            >
              {row.original.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          ),
      },
    ],
    [user?._id, toggleUserMutation]
  );

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance and users."
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                <p className="text-xs capitalize text-primary-600 dark:text-primary-400">{user?.role}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <CardBody>
            <button
              onClick={toggle}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm transition hover:border-primary-300 dark:border-gray-700"
            >
              <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {dark ? 'Dark mode' : 'Light mode'}
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition ${dark ? 'bg-primary-600' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? 'left-[22px]' : 'left-0.5'}`}
                />
              </span>
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change Password" />
          <CardBody>
            <form
              onSubmit={pwForm.handleSubmit((v) => pwMutation.mutate(v))}
              className="space-y-4"
              noValidate
            >
              <PasswordInput
                label="Current Password"
                autoComplete="current-password"
                required
                error={pwForm.formState.errors.currentPassword?.message}
                {...pwForm.register('currentPassword', { required: 'Current password is required' })}
              />
              <PasswordInput
                label="New Password"
                autoComplete="new-password"
                required
                error={pwForm.formState.errors.newPassword?.message}
                {...pwForm.register('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
              />
              <PasswordInput
                label="Confirm New Password"
                autoComplete="new-password"
                required
                error={pwForm.formState.errors.confirmPassword?.message}
                {...pwForm.register('confirmPassword', {
                  validate: (v) => v === pwForm.getValues('newPassword') || 'Passwords do not match',
                })}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={pwMutation.isPending}>
                  Update Password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Validation Emails"
              description="These addresses automatically receive the validation email (payment details) every time a registration is saved."
            />
            <CardBody className="space-y-4">
              {emails.length ? (
                <ul className="flex flex-wrap gap-2">
                  {emails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-1.5 text-sm text-primary-800 ring-1 ring-inset ring-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:ring-primary-800"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => setEmails((prev) => prev.filter((e) => e !== email))}
                        className="rounded-full p-0.5 transition hover:bg-primary-100 hover:text-primary-900 dark:hover:bg-primary-800"
                        aria-label={`Remove ${email}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  No recipients configured — the default accounts mailbox from the server settings will be used.
                </p>
              )}

              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="name@company.com"
                    type="email"
                    value={newEmail}
                    error={emailError}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      if (emailError) setEmailError(undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                  />
                </div>
                <Button type="button" variant="outline" onClick={addEmail}>
                  <MailPlus className="h-4 w-4" /> Add
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => emailsMutation.mutate(emails)}
                  disabled={!dirtyEmails}
                  loading={emailsMutation.isPending}
                >
                  Save Recipients
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Users"
              description="Create user accounts and control access for your team."
              actions={
                <Button size="sm" onClick={() => setUserModalOpen(true)}>
                  <Plus className="h-4 w-4" /> New User
                </Button>
              }
            />
            <DataTable columns={userColumns} data={users} isLoading={usersLoading} emptyTitle="No users" />
          </Card>
        )}
      </div>

      <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title="Create User">
        <form
          onSubmit={newUserForm.handleSubmit((v) => createUserMutation.mutate(v))}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Name"
            required
            error={newUserForm.formState.errors.name?.message}
            {...newUserForm.register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email"
            type="email"
            required
            error={newUserForm.formState.errors.email?.message}
            {...newUserForm.register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
            })}
          />
          <PasswordInput
            label="Password"
            required
            error={newUserForm.formState.errors.password?.message}
            {...newUserForm.register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
            })}
          />
          <Select label="Role" required {...newUserForm.register('role')}>
            <option value="sales">Sales Employee</option>
            <option value="admin">Administrator</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createUserMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
