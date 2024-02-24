import React, { useEffect } from 'react';
import { Button } from './ui/button';
import Avatar from 'boring-avatars';
import { CrossIcon } from 'lucide-react';
import { ArrowUpOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Drawer, DrawerContent, DrawerTrigger } from './ui/drawer';
import { type User } from '@prisma/client';
import { UserAvatar } from './ui/avatar';

interface AppInstallBannerProps {
  actions?: React.ReactNode;
  user?: User;
  header?: React.ReactNode;
}

const AppInstallBanner: React.FC<AppInstallBannerProps> = ({ actions, user, header }) => {
  const [showIosBanner, setShowIosBanner] = React.useState(false);

  function needsToSeePrompt() {
    if (!('standalone' in navigator)) {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return !(navigator as unknown as { standalone: boolean }).standalone;
  }

  useEffect(() => {
    if (needsToSeePrompt()) {
      setShowIosBanner(true);
    }
  }, []);

  if (!showIosBanner) {
    return (
      <div className="fixed top-0 z-10 flex w-full items-center justify-between gap-2 bg-background px-4 py-4 shadow-sm">
        {header ?? <div className="text-3xl font-semibold">Balances</div>}
        {actions ?? <div className="h-10 w-10" />}
      </div>
    );
  }

  return (
    <div className="fixed top-0 z-10 flex w-full justify-between  bg-opacity-90 px-2 py-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center">
        <Button variant="ghost" className="bg-transparent p-0">
          <XMarkIcon className="h-4 w-4 text-gray-400" />
        </Button>
        <div className="ml-2">
          <p className="text-sm">SplitPro - Split Expenses for free</p>
          <p className="text-xs text-gray-400">Get the full experience on your iPhone</p>
        </div>
      </div>
      <Drawer>
        <DrawerTrigger className="flex items-center gap-2 text-sm focus:ring-0">
          <Button
            variant="ghost"
            className="text-blue-600 hover:text-blue-600 focus-visible:bg-transparent"
          >
            Install
          </Button>{' '}
        </DrawerTrigger>
        <DrawerContent className="h-[70vh]">
          <div className=" px-4 py-4 text-center">Add SplitPro to home page</div>

          <div className="mt-6 px-6">
            <p className="flex  gap-2">
              1. Click the share Icon in the browser{' '}
              <span>
                <ArrowUpOnSquareIcon className=" h-6 w-6  text-blue-500" />
              </span>
            </p>
            <div className="mt-6">
              <p className="">2. Click on &apos;Add to Home Screen&apos;</p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AppInstallBanner;
