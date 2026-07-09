/**
 * @fileoverview Avatar component displaying user profile image or initials.
 */

import { clsx } from 'clsx';
import type { User } from '../../types';

/**
 * Avatar component props.
 */
interface AvatarProps {
  /** User object containing name and avatar URLs */
  user?: Pick<User, 'firstName' | 'lastName' | 'avatar'> | null;
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Avatar component that displays a user's profile picture or their initials.
 * Falls back to initials if no avatar image is available.
 *
 * @example
 * ```tsx
 * // With user avatar
 * <Avatar user={user} size="lg" />
 *
 * // Fallback to initials
 * <Avatar user={{ firstName: 'John', lastName: 'Doe' }} />
 *
 * // Unknown user placeholder
 * <Avatar user={null} />
 * ```
 */
export function Avatar({ user, size = 'md', className }: AvatarProps) {
  /** Size classes for different avatar sizes */
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  /**
   * Generates initials from user's name.
   * @returns Two-letter initials or '?' if no user
   */
  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const avatarUrl = user?.avatar?.medium || user?.avatar?.thumbnail;

  // Render image if avatar URL exists
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${user?.firstName} ${user?.lastName}`}
        className={clsx(
          'rounded-full object-cover',
          sizes[size],
          className
        )}
      />
    );
  }

  // Render initials fallback
  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-medium',
        sizes[size],
        className
      )}
    >
      {getInitials()}
    </div>
  );
}
