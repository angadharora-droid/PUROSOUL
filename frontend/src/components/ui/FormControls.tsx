import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

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
