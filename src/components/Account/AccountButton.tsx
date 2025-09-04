import React from 'react';
import { Button, type ButtonProps } from '../ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export const AccountButton: React.FC<React.PropsWithChildren<ButtonProps> & { href?: string }> = ({
  children,
  href,
  ...buttonProps
}) => (
  <WithLink href={href}>
    <Button
      variant="ghost"
      className="text-md hover:text-foreground/80 w-full justify-between px-0"
      {...buttonProps}
    >
      <div className="flex items-center gap-4">{children}</div>
      <ChevronRight className="h-6 w-6 text-gray-500" />
    </Button>
  </WithLink>
);

export const WithLink: React.FC<React.PropsWithChildren<{ href?: string }>> = ({
  href,
  children,
}) =>
  href ? (
    <Link href={href} target={href.startsWith('http') ? '_blank' : undefined}>
      {children}
    </Link>
  ) : (
    children
  );
