/**
 * @fileoverview Card components for content containers.
 * Includes Card, CardHeader, CardTitle, and CardContent subcomponents.
 */

import type { ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * Card component props.
 */
interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Internal padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card container component with customizable padding.
 *
 * @example
 * ```tsx
 * <Card padding="lg">
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     Content goes here
 *   </CardContent>
 * </Card>
 * ```
 */
export function Card({ children, className, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader component props.
 */
interface CardHeaderProps {
  /** Header content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card header section with bottom border.
 */
export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('pb-4 border-b border-gray-100', className)}>
      {children}
    </div>
  );
}

/**
 * CardTitle component props.
 */
interface CardTitleProps {
  /** Title text */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card title heading component.
 */
export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={clsx('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
}

/**
 * CardContent component props.
 */
interface CardContentProps {
  /** Content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card content section with top padding.
 */
export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx('pt-4', className)}>{children}</div>;
}
