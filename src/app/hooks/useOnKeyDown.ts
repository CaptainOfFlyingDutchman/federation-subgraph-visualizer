import { useEffect } from 'react';

export function useOnKeyDown(key: string, handler: () => void) {
  useEffect(() => {
    const onKeyDownHandler = (e: KeyboardEvent) => {
      if (e.key === key) {
        handler();
      }
    };

    document.addEventListener('keydown', onKeyDownHandler);

    return () => document.removeEventListener('keydown', onKeyDownHandler);
  }, [key, handler]);
}
