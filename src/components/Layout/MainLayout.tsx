/* eslint-disable @typescript-eslint/prefer-optional-chain */
import clsx from 'clsx';
import { type LucideIcon } from 'lucide-react';
import React from 'react';
import {
  ChartPieIcon as SolidScaleIcon,
  UserGroupIcon as SolidUserGroupIcon,
  PlusCircleIcon as SolidPlusCircleIcon,
  SparklesIcon as SolidSparklesIcon,
  UserCircleIcon as SolidUserCircleIcon,
  ListBulletIcon as SolidListBulletIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import AppInstallBanner from '../AppInstallBanner';
import { type User } from '@prisma/client';

interface MainLayoutProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  user?: User;
  header?: React.ReactNode;
  hideAppBar?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  actions,
  user,
  header,
  hideAppBar,
  title,
}) => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div className="h-full bg-background">
      <div vaul-drawer-wrapper="" className={clsx(' bg-background', hideAppBar ? '' : '')}>
        {/* {hideAppBar ? null : (
          <AppInstallBanner
            user={user}
            header={header}
            actions={actions ?? <div className="h-10 w-10" />}
          />
        )} */}

        {title ? (
          <div className="mb-2 flex items-center justify-between px-4 py-4">
            <div className="text-3xl font-bold text-gray-200">{title}</div>
            {actions}
          </div>
        ) : null}
        {children}
        <div className="h-28"></div>
      </div>
      <nav className="fixed bottom-0 flex w-full justify-between  border-t bg-opacity-80 px-2 pb-4 shadow-sm backdrop-blur-lg">
        <NavItem
          title="Balances"
          Icon={SolidScaleIcon}
          link="/balances"
          currentPath={currentPath}
        />
        <NavItem
          title="Groups"
          Icon={SolidUserGroupIcon}
          link="/groups"
          currentPath={currentPath}
        />
        <NavItem title="Add" Icon={SolidPlusCircleIcon} link="/add" currentPath={currentPath} />
        <NavItem
          title="Activity"
          Icon={SolidListBulletIcon}
          link="/activity"
          currentPath={currentPath}
        />
        <NavItem
          title="Account"
          Icon={SolidUserCircleIcon}
          link="/account"
          currentPath={currentPath}
        />
      </nav>
    </div>
  );
};

type NavItemProps = {
  title: string;
  Icon: LucideIcon;
  link: string;
  currentPath?: string;
};

const NavItem: React.FC<NavItemProps> = ({ title, Icon, link, currentPath }) => {
  const isActive = currentPath?.startsWith(link);

  return (
    <Link
      href={link}
      className={clsx('flex w-32 flex-col items-center justify-between gap-2 py-4')}
    >
      <Icon className={clsx('h-7 w-7', isActive ? 'text-cyan-500' : 'text-gray-600')} />
      <span className={clsx('text-xs', isActive ? 'font-medium text-cyan-500' : 'text-gray-500')}>
        {title}
      </span>
    </Link>
  );
};

export default MainLayout;
