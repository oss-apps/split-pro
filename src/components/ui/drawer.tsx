import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '~/lib/utils';
import { Button } from './button';
import useMediaQuery from '~/hooks/useMediaQuery';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { useIsClient } from '~/hooks/useIsClient';

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-background/80', className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border border-gray-800 bg-background focus:outline-none',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};

type AppDrawerProps = {
  children: React.ReactNode;
  trigger: React.ReactNode;
  disableTrigger?: boolean;
  onTriggerClick?: React.MouseEventHandler<HTMLButtonElement>;
  className: string;
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
};

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
    if (onOpenChange && open !== _open) onOpenChange(_open);
  };

  if (!isClient) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={localOnOpenChange}>
        <DialogTrigger
          className="cursor-pointer focus:ring-0"
          onClick={(e) => {
            console.log('button clicked');
            onTriggerClick?.(e);
          }}
          disabled={disableTrigger}
          asChild
        >
          {trigger}
        </DialogTrigger>
        <DialogContent
          onInteractOutside={(e) => {
            if (dismissible === false) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="mb-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className=" max-h-[60vh] overflow-auto px-1 py-1">{children}</div>
          <DialogFooter className="mt-8 flex items-center gap-2 ">
            {leftAction ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-[100px]"
                onClick={leftActionOnClick}
                asChild
              >
                {shouldCloseOnLeftAction ?? shouldCloseOnLeftAction === undefined ? (
                  <DialogClose>{leftAction}</DialogClose>
                ) : (
                  leftAction
                )}
              </Button>
            ) : null}
            {actionTitle ? (
              !shouldCloseOnAction ? (
                <Button
                  className=" w-[100px]"
                  onClick={actionOnClick}
                  disabled={actionDisabled}
                  size="sm"
                >
                  {actionTitle}
                </Button>
              ) : (
                <DialogClose
                  onClick={actionOnClick}
                  className="w-[100px] rounded-md bg-primary py-2 text-sm text-black disabled:opacity-50"
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
        className="flex items-center justify-center gap-2 text-center text-sm focus:outline-none focus:ring-0"
        onClick={onTriggerClick}
        asChild
      >
        {trigger}
      </DrawerTrigger>
      <DrawerContent className={className}>
        <div className=" overflow-auto p-4 pt-2">
          <div className="mb-4 flex items-center justify-between">
            {leftAction ? (
              <Button
                variant="ghost"
                className=" px-0 text-left text-primary"
                onClick={leftActionOnClick}
                asChild
              >
                {shouldCloseOnLeftAction ?? shouldCloseOnLeftAction === undefined ? (
                  <DrawerClose>{leftAction}</DrawerClose>
                ) : (
                  leftAction
                )}
              </Button>
            ) : (
              <div className="w-10"></div>
            )}
            <p>{title}</p>
            {actionTitle ? (
              !shouldCloseOnAction ? (
                <Button
                  variant="ghost"
                  className="px-0 py-2 text-primary"
                  onClick={actionOnClick}
                  disabled={actionDisabled}
                >
                  {actionTitle}
                </Button>
              ) : (
                <DrawerClose
                  onClick={actionOnClick}
                  className="py-2 text-sm font-medium text-primary disabled:opacity-50"
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
