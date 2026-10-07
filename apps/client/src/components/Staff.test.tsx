import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Staff } from './Staff';

vi.mock('../render/verovio', () => ({
  renderMei: vi.fn(async (mei: string) => `<svg data-length="${mei.length}"></svg>`),
}));

describe('Staff', () => {
  it('shows the rendered SVG', async () => {
    render(<Staff mei="<mei/>" />);
    await waitFor(() => expect(screen.getByTestId('staff').querySelector('svg')).toHaveAttribute('data-length', '6'));
  });
});
