import {
  ListBulletIcon as SolidListBulletIcon,
  PlusCircleIcon as SolidPlusCircleIcon,
  ChartPieIcon as SolidScaleIcon,
  UserCircleIcon as SolidUserCircleIcon,
  UserGroupIcon as SolidUserGroupIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

interface MainLayoutProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  header?: React.ReactNode;
  hideAppBar?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, actions, hideAppBar, title }) => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div className="bg-background h-full w-full">
      <div
        vaul-drawer-wrapper=""
        className={clsx(
          'bg-background mx-auto flex h-full w-full flex-col lg:max-w-3xl lg:flex-row',
          hideAppBar ? '' : '',
        )}
      >
        <nav className="item-center -ml-[170px] hidden w-[170px] px-4 py-4 lg:flex lg:flex-col lg:gap-2">
          <Link href="/balances" className="mb-8 flex items-center gap-2">
            <span className="text-xl font-medium">SplitPro</span>
          </Link>
          <NavItemDesktop
            title="Balances"
            Icon={SolidScaleIcon}
            link="/balances"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title="Groups"
            Icon={SolidUserGroupIcon}
            link="/groups"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title="Add Expense"
            Icon={SolidPlusCircleIcon}
            link="/add"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title="Activity"
            Icon={SolidListBulletIcon}
            link="/activity"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title="Account"
            Icon={SolidUserCircleIcon}
            link="/account"
            currentPath={currentPath}
          />
        </nav>
        <div className="w-full overflow-auto lg:border-x lg:border-gray-900 lg:px-6">
          {title ? (
            <div className="mb-2 flex items-center justify-between px-4 py-4">
              <div className="text-3xl font-bold text-gray-200">{title}</div>
              {actions}
            </div>
          ) : null}
          {children}
          <div className="h-28 lg:h-0"></div>
        </div>
      </div>

      <nav className="bg-opacity-80 fixed bottom-0 flex w-full justify-between border-t px-2 pb-4 shadow-xs backdrop-blur-lg lg:hidden">
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

const NavItemDesktop: React.FC<NavItemProps> = ({ title, Icon, link, currentPath }) => {
  const isActive = currentPath?.startsWith(link);

  return (
    <Link href={link} className={clsx('flex w-[150px] items-center gap-2 py-4')}>
      <Icon className={clsx('h-7 w-7', isActive ? 'text-cyan-500' : 'text-gray-600')} />
      <span className={clsx('', isActive ? 'font-medium text-cyan-500' : 'text-gray-500')}>
        {title}
      </span>
    </Link>
  );
};
export default MainLayout;
