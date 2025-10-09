'use client';

import React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { useIsClient } from '~/hooks/useIsClient';
import useMediaQuery from '~/hooks/useMediaQuery';

import { cn } from '~/lib/utils';

import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content bg-background fixed z-50 flex h-auto flex-col',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t',
          'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm',
          'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm',
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left',
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};

interface AppDrawerProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  disableTrigger?: boolean;
  onTriggerClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  actionTitle?: string;
  actionOnClick?: () => void;
  shouldCloseOnAction?: boolean;
  leftAction?: string;
  leftActionOnClick?: () => void;
  shouldCloseOnLeftAction?: boolean;
  dismissible?: boolean;
  actionDisabled?: boolean;
  onClose?: () => void;
}

export const AppDrawer: React.FC<AppDrawerProps> = (props) => {
  const {
    children,
    trigger,
    onTriggerClick,
    open,
    onOpenChange,
    title,
    actionTitle,
    actionOnClick,
    shouldCloseOnAction,
    leftAction,
    leftActionOnClick,
    shouldCloseOnLeftAction,
    className,
    dismissible,
    actionDisabled,
    disableTrigger,
    onClose,
  } = props;

  const isClient = useIsClient();

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const localOnOpenChange = (_open: boolean) => {
    if (onOpenChange && open !== _open) {
      onOpenChange(_open);
    }
  };

  if (!isClient) {
    return null;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={localOnOpenChange}>
        <DialogTrigger
          className="cursor-pointer focus:ring-0"
          onClick={(e) => {
            onTriggerClick?.(e);
          }}
          disabled={disableTrigger}
          asChild
        >
          {trigger}
        </DialogTrigger>
        <DialogContent
          onInteractOutside={(e) => {
            if (false === dismissible) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="mb-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto px-1 py-1">{children}</div>
          <DialogFooter className="mt-8 flex items-center gap-2">
            {leftAction ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-[100px]"
                onClick={leftActionOnClick}
                asChild
              >
                {(shouldCloseOnLeftAction ?? shouldCloseOnLeftAction === undefined) ? (
                  <DialogClose>{leftAction}</DialogClose>
                ) : (
                  leftAction
                )}
              </Button>
            ) : null}
            {actionTitle ? (
              !shouldCloseOnAction ? (
                <Button
                  className="w-[100px]"
                  onClick={actionOnClick}
                  disabled={actionDisabled}
                  size="sm"
                >
                  {actionTitle}
                </Button>
              ) : (
                <DialogClose
                  onClick={actionOnClick}
                  className="bg-primary w-[100px] rounded-md py-2 text-sm text-black disabled:opacity-50"
                  disabled={actionDisabled}
                >
                  {actionTitle}
                </DialogClose>
              )
            ) : (
              <div className="w-10"> </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible} onClose={onClose}>
      <DrawerTrigger
        className="flex items-center justify-center gap-2 text-center text-sm focus:ring-0 focus:outline-hidden"
        onClick={onTriggerClick}
        asChild
      >
        {trigger}
      </DrawerTrigger>
      <DrawerContent className={className}>
        <div className="overflow-auto p-4 pt-2">
          <div className="mb-4 flex items-center justify-between">
            {leftAction ? (
              <Button
                variant="ghost"
                className="text-primary px-0 text-left"
                onClick={leftActionOnClick}
                asChild
              >
                {(shouldCloseOnLeftAction ?? shouldCloseOnLeftAction === undefined) ? (
                  <DrawerClose>{leftAction}</DrawerClose>
                ) : (
                  leftAction
                )}
              </Button>
            ) : (
              <div className="w-10" />
            )}
            <p>{title}</p>
            {actionTitle ? (
              !shouldCloseOnAction ? (
                <Button
                  variant="ghost"
                  className="text-primary px-0 py-2"
                  onClick={actionOnClick}
                  disabled={actionDisabled}
                >
                  {actionTitle}
                </Button>
              ) : (
                <DrawerClose
                  onClick={actionOnClick}
                  className="text-primary py-2 text-sm font-medium disabled:opacity-50"
                  disabled={actionDisabled}
                >
                  {actionTitle}
                </DrawerClose>
              )
            ) : (
              <div className="w-10"> </div>
            )}
          </div>
          <div>{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
