import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackButton } from './useBackButton';

const native = vi.hoisted(() => ({ isNative: true, listener: null as null | (() => void), remove: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.isNative } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, listener: () => void) => {
      native.listener = listener;
      return { remove: native.remove };
    }),
    exitApp: vi.fn(),
  },
}));

function Probe({ onBack }: { onBack: () => void }) {
  useBackButton(onBack);
  return null;
}

describe('useBackButton', () => {
  beforeEach(() => {
    native.isNative = true;
    native.listener = null;
    native.remove.mockClear();
  });

  it('calls the latest handler when the Android back button is pressed', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Probe onBack={first} />);
    await vi.waitFor(() => expect(native.listener).not.toBeNull());
    rerender(<Probe onBack={second} />);
    native.listener?.();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops listening when unmounted', async () => {
    const { unmount } = render(<Probe onBack={() => {}} />);
    await vi.waitFor(() => expect(native.listener).not.toBeNull());
    unmount();
    await vi.waitFor(() => expect(native.remove).toHaveBeenCalledTimes(1));
  });

  it('does nothing in a plain browser', () => {
    native.isNative = false;
    render(<Probe onBack={() => {}} />);
    expect(native.listener).toBeNull();
  });
});
