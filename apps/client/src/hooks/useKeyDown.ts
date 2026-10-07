import { useEffect, useRef } from 'react';

/** Listens for key presses on the whole window while `enabled`. */
export function useKeyDown(handler: (event: KeyboardEvent) => void, enabled: boolean): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      latest.current(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}
