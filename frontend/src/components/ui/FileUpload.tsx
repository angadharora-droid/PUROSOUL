import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, X, FileText, Plus } from 'lucide-react';
import { FieldWrapper } from './FormControls';

interface FileUploadProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  accept?: string;
  maxFiles?: number;
  value: File[];
  onChange: (files: File[]) => void;
}

/** Multi-file picker with inline image previews (bonus: preview before upload). */
export default function FileUpload({
  label,
  required,
  error,
  hint,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  maxFiles = 10,
  value,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());

  // Object URLs live as long as their file is selected; revoke them on unmount.
  useEffect(() => {
    return () => {
      for (const url of previews.values()) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const next = [...value, ...picked].slice(0, maxFiles);
    onChange(next);
    setPreviews((prev) => {
      const map = new Map(prev);
      for (const file of picked) {
        if (next.includes(file) && file.type.startsWith('image/')) {
          map.set(file, URL.createObjectURL(file));
        }
      }
      return map;
    });
    e.target.value = ''; // allow re-picking the same file
  };

  const remove = (file: File) => {
    onChange(value.filter((f) => f !== file));
    setPreviews((prev) => {
      const url = prev.get(file);
      if (!url) return prev;
      URL.revokeObjectURL(url);
      const map = new Map(prev);
      map.delete(file);
      return map;
    });
  };

  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <input ref={inputRef} type="file" accept={accept} multiple onChange={handleChange} className="hidden" />
      {value.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm text-gray-500 transition hover:border-primary-400 hover:text-primary-600 dark:text-gray-400 ${
            error ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <ImagePlus className="h-6 w-6" />
          <span>Click to upload screenshots (JPG, PNG, WEBP or PDF · max 5 MB each)</span>
        </button>
      ) : (
        <div className="space-y-2">
          {value.map((file, i) => {
            const preview = previews.get(file);
            return (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                {preview ? (
                  <img src={preview} alt="Payment screenshot preview" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                    <FileText className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(file)}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {value.length < maxFiles && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-primary-600 transition hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:hover:bg-primary-900/20"
            >
              <Plus className="h-4 w-4" /> Add another attachment
            </button>
          )}
        </div>
      )}
    </FieldWrapper>
  );
}
