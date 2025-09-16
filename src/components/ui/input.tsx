import * as React from 'react';

import { cn } from '~/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function Input({
  className,
  type,
  rightIcon,
  ...props
}: React.ComponentProps<'input'> & { rightIcon?: React.ReactNode }) {
  return (
    <div className="relative w-full">
      <input
        type={type}
        data-slot="input"
        className={cn(
          'border-input bg-primary-foreground bg-opacity-90 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-opacity-30',
          'flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2',
          'focus-visible:ring-cyan-500 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      {rightIcon && <span className="absolute top-1/2 right-3 -translate-y-1/2">{rightIcon}</span>}
    </div>
  );
}

export { Input };
