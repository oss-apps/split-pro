import { useEffect, useState } from 'react';

/**
 * A React hook that returns true after a specified delay.
 * @param delay The delay in milliseconds after which to return true.
 * @returns A boolean value that becomes true after the specified delay.
 */
const useEnableAfter = (delay: number): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEnabled(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return isEnabled;
};

export default useEnableAfter;
