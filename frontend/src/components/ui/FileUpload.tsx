import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, X, FileText } from 'lucide-react';
import { FieldWrapper } from './FormControls';

interface FileUploadProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
}

/** File picker with an inline image preview (bonus: preview before upload). */
export default function FileUpload({
  label,
  required,
  error,
  hint,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  value,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const clear = () => {
    onChange(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm text-gray-500 transition hover:border-primary-400 hover:text-primary-600 dark:text-gray-400 ${
            error ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <ImagePlus className="h-6 w-6" />
          <span>Click to upload screenshot (JPG, PNG, WEBP or PDF · max 5 MB)</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          {preview ? (
            <img src={preview} alt="Payment screenshot preview" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
              <FileText className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{value.name}</p>
            <p className="text-xs text-gray-500">{(value.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </FieldWrapper>
  );
}
