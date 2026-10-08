import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** Closes the app (Android only). Kept here so the Capacitor calls live in one place. */
export function exitApp(): void {
  if (Capacitor.isNativePlatform()) void CapacitorApp.exitApp();
}

/**
 * Handles the Android back button: while mounted, pressing it calls `onBack` instead of closing the app.
 * Does nothing in a browser.
 */
export function useBackButton(onBack: () => void): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let remove: (() => Promise<void>) | undefined;
    CapacitorApp.addListener('backButton', () => latest.current())
      .then((handle) => {
        if (cancelled) void handle.remove();
        else remove = () => handle.remove();
      })
      .catch((error: unknown) => console.warn('Could not listen for the back button', error));
    return () => {
      cancelled = true;
      void remove?.();
    };
  }, []);
}
