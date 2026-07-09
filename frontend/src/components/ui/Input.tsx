/**
 * @fileoverview Reusable Input component with label and error state support.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

/**
 * Input component props.
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string;
}

/**
 * Input component with label, error state, and helper text support.
 * Integrates with React Hook Form via forwardRef.
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input label="Email" type="email" placeholder="you@example.com" />
 *
 * // With error
 * <Input label="Password" type="password" error="Password is required" />
 *
 * // With React Hook Form
 * <Input label="Name" {...register('name')} error={errors.name?.message} />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'block w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
