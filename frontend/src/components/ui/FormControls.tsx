import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, error, required, hint, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = '', ...props }, ref) => (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <input ref={ref} className={`input-base ${error ? 'input-error' : ''} ${className}`} {...props} />
    </FieldWrapper>
  )
);
Input.displayName = 'Input';

/** Password field with a show/hide (eye) toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ label, error, hint, required, className = '', ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <FieldWrapper label={label} error={error} required={required} hint={hint}>
        <div className="relative">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={`input-base pr-10 ${error ? 'input-error' : ''} ${className}`}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FieldWrapper>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, className = '', children, ...props }, ref) => (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <select ref={ref} className={`input-base ${error ? 'input-error' : ''} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
);
Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = '', rows = 3, ...props }, ref) => (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <textarea ref={ref} rows={rows} className={`input-base ${error ? 'input-error' : ''} ${className}`} {...props} />
    </FieldWrapper>
  )
);
Textarea.displayName = 'Textarea';
