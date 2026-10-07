import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Staff } from './Staff';
import { renderMei } from '../render/verovio';

vi.mock('../render/verovio', () => ({
  renderMei: vi.fn(async (mei: string) => `<svg data-length="${mei.length}"></svg>`),
}));

const svgOf = () => screen.getByTestId('staff').querySelector('svg');

afterEach(() => {
  vi.mocked(renderMei).mockImplementation(async (mei: string) => `<svg data-length="${mei.length}"></svg>`);
});

describe('Staff', () => {
  it('shows the rendered SVG', async () => {
    render(<Staff mei="<mei/>" />);
    await waitFor(() => expect(svgOf()).toHaveAttribute('data-length', '6'));
  });

  it('shows no stale SVG while the next mei renders', async () => {
    const { rerender } = render(<Staff mei="<a/>" />);
    await waitFor(() => expect(svgOf()).toHaveAttribute('data-length', '4'));

    let resolveNext: (svg: string) => void = () => {};
    vi.mocked(renderMei).mockImplementationOnce(() => new Promise<string>((resolve) => { resolveNext = resolve; }));
    rerender(<Staff mei="<bbbb/>" />);
    expect(svgOf()).toBeNull();

    resolveNext('<svg data-length="new"></svg>');
    await waitFor(() => expect(svgOf()).toHaveAttribute('data-length', 'new'));
  });

  it('stays empty and does not throw when rendering fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(renderMei).mockRejectedValueOnce(new Error('boom'));
    render(<Staff mei="<mei/>" />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(svgOf()).toBeNull();
    warn.mockRestore();
  });
});
