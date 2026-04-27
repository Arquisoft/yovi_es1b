import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PayPalStore } from '../components/modals/PayPalStore';

type PayPalButtonProps = {
  createOrder: (_data?: unknown, actions?: { order?: { create: (payload: unknown) => Promise<string> } }) => Promise<string>;
  onApprove: (
    data: { orderID?: string },
    actions: { order?: { capture: () => Promise<{ id?: string }> } },
  ) => Promise<void>;
};

const paypalMocks = vi.hoisted(() => ({
  latestProps: null as PayPalButtonProps | null,
}));

vi.mock('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({ children }: { children: ReactNode }) => children,
  PayPalButtons: (props: PayPalButtonProps) => {
    paypalMocks.latestProps = props;
    return null;
  },
}));

describe('PayPalStore', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    paypalMocks.latestProps = null;
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates the PayPal order through the backend', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const createMock = vi.fn().mockResolvedValue('ORDER-1');

    render(<PayPalStore isOpen onClose={onClose} onSuccess={onSuccess} />);

    await expect(paypalMocks.latestProps?.createOrder({}, { order: { create: createMock } })).resolves.toBe('ORDER-1');

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('confirms the purchase only after the backend captures PayPal', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const captureMock = vi.fn().mockResolvedValue({ id: 'ORDER-1' });

    render(<PayPalStore isOpen onClose={onClose} onSuccess={onSuccess} />);

    await act(async () => {
      await paypalMocks.latestProps?.onApprove({ orderID: 'ORDER-1' }, { order: { capture: captureMock } });
    });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does not confirm XP when backend PayPal capture fails', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const captureMock = vi.fn().mockRejectedValue(new Error('Buyer access token not present'));

    render(<PayPalStore isOpen onClose={onClose} onSuccess={onSuccess} />);

    await act(async () => {
      await paypalMocks.latestProps?.onApprove({ orderID: 'ORDER-1' }, { order: { capture: captureMock } });
    });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('shows an error when PayPal does not provide an order', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<PayPalStore isOpen onClose={onClose} onSuccess={onSuccess} />);

    await act(async () => {
      await paypalMocks.latestProps?.onApprove({}, {});
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });
});
