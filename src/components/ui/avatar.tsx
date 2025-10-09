import BoringAvatar from 'boring-avatars';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '~/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'bg-muted flex h-full w-full items-center justify-center rounded-full',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const DEFAULT_AVATAR_COLORS = ['#80C7B7', '#D9C27E', '#F4B088', '#FFA5AA', '#9D9DD3'];

const EntityAvatar: React.FC<{
  entity?: { name?: string | null; image?: string | null; email?: string | null } | null;
  size?: number;
}> = ({ entity, size }) => {
  const avatarSize = React.useMemo(
    () => ({
      width: size ?? 40,
      height: size ?? 40,
    }),
    [size],
  );

  return (
    <Avatar style={avatarSize}>
      <AvatarImage src={entity?.image ?? undefined} alt={entity?.name ?? entity?.email ?? ''} />
      <AvatarFallback>
        <BoringAvatar
          size={size}
          name={entity?.name ?? entity?.email ?? ''}
          variant="beam"
          // colors={['#ADDFD3', '#EAE3D0', '#DBC4B6', '#FFA5AA', '#EFD5C4']}
          // colors={['#565175', '#538A95', '#67B79E', '#FFB727', '#E4491C']}
          colors={DEFAULT_AVATAR_COLORS}
        />
      </AvatarFallback>
    </Avatar>
  );
};

export { Avatar, AvatarImage, AvatarFallback, EntityAvatar };
