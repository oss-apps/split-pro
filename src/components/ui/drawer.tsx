import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '~/lib/utils';
import { Button } from './button';

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
  } = props;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger
        className="flex items-center justify-center gap-2 text-center text-sm focus:outline-none focus:ring-0"
        onClick={onTriggerClick}
      >
        {trigger}
      </DrawerTrigger>
      <DrawerContent className={className}>
        <div className="overflow-scroll p-4 pt-2">
          <div className="mb-4 flex items-center justify-between">
            {leftAction ? (
              <Button
                variant="ghost"
                className=" px-0 text-left text-primary"
                onClick={leftActionOnClick}
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
              <Button variant="ghost" className="px-0 text-primary" onClick={actionOnClick}>
                {shouldCloseOnAction ? <DrawerClose>{actionTitle}</DrawerClose> : actionTitle}
              </Button>
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
