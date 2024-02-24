import React from 'react';

type DualIconProps = React.SVGProps<SVGSVGElement> & { primaryClass?: string, secondaryClass?: string };

export type DualIconComponent = React.FC<DualIconProps>;

export const AddSquareIcon: DualIconComponent = ({ primaryClass, secondaryClass, ...props }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon-add-square" {...props}>
      <rect width="18" height="18" x="3" y="3" className={primaryClass} rx="2" />
      <path className={secondaryClass} d="M13 11h4a1 1 0 0 1 0 2h-4v4a1 1 0 0 1-2 0v-4H7a1 1 0 0 1 0-2h4V7a1 1 0 0 1 2 0v4z" />
    </svg>
  );
};


export const PieChartIcon: DualIconComponent = ({ primaryClass, secondaryClass, ...props }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon-pie-chart" {...props}>
      <path className={primaryClass} d="M14 13h6.78a1 1 0 0 1 .97 1.22A10 10 0 1 1 9.78 2.25a1 1 0 0 1 1.22.97V10a3 3 0 0 0 3 3z" />
      <path className={secondaryClass} d="M20.78 11H14a1 1 0 0 1-1-1V3.22a1 1 0 0 1 1.22-.97c3.74.85 6.68 3.79 7.53 7.53a1 1 0 0 1-.97 1.22z" />
    </svg>
  );
};
