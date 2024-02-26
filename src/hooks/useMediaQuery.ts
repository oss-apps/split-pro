import { useEffect, useState } from 'react';

/**
 * A React hook that listens for changes in a media query
 * @param query - The media query to listen for
 * @returns A boolean indicating if the query matches
 */
const useMediaQuery = (query: string): boolean => {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const documentChangeHandler = () => setMatches(mediaQueryList.matches);

    // Add listener
    mediaQueryList.addEventListener('change', documentChangeHandler);

    // Call handler right away so state gets updated with initial value
    documentChangeHandler();

    // Remove listener on cleanup
    return () => mediaQueryList.removeEventListener('change', documentChangeHandler);
  }, [query]);

  return matches;
};

export default useMediaQuery;
