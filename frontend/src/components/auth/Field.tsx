'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, ...rest },
  ref
) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      <input
        ref={ref}
        className={cn(
          'input-base',
          error && 'border-accent-rose/60 focus:ring-accent-rose/50',
          className
        )}
        {...rest}
      />
      {error ? (
        <span className="mt-1 block text-xs text-accent-rose">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </label>
  );
});
