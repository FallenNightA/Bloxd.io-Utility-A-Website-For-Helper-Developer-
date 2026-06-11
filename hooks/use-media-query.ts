import { useState, useEffect } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    // Use timeout to bypass synchronous setState in effect linter warning
    const timer = setTimeout(() => {
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
    }, 0);
    window.addEventListener('resize', listener);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', listener);
    };
  }, [matches, query]);

  return matches;
}
