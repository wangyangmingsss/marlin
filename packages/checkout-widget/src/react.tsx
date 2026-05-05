import { useState, useCallback } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { open } from './index';
import type { OpenOptions, CheckoutHandle, Theme } from './types';

// ---------------------------------------------------------------------------
// useMarlinCheckout hook
// ---------------------------------------------------------------------------

export interface UseMarlinCheckoutReturn {
  /** Open the checkout widget for a given invoice or plan. */
  open: (invoiceIdOrOpts: string | OpenOptions, opts?: Partial<OpenOptions>) => void;
  /** Whether the widget is currently open. */
  loading: boolean;
}

export function useMarlinCheckout(): UseMarlinCheckoutReturn {
  const [loading, setLoading] = useState(false);
  const handleRef = { current: null as CheckoutHandle | null };

  const openCheckout = useCallback(
    (invoiceIdOrOpts: string | OpenOptions, opts?: Partial<OpenOptions>) => {
      if (loading) return;

      const resolved: OpenOptions =
        typeof invoiceIdOrOpts === 'string'
          ? { invoiceId: invoiceIdOrOpts, ...opts }
          : { ...invoiceIdOrOpts, ...opts };

      setLoading(true);

      const wrappedOnClose = resolved.onClose;
      const wrappedOnSuccess = resolved.onSuccess;
      const wrappedOnError = resolved.onError;

      handleRef.current = open({
        ...resolved,
        onClose: () => {
          setLoading(false);
          handleRef.current = null;
          wrappedOnClose?.();
        },
        onSuccess: (data) => {
          setLoading(false);
          handleRef.current = null;
          wrappedOnSuccess?.(data);
        },
        onError: (error) => {
          setLoading(false);
          handleRef.current = null;
          wrappedOnError?.(error);
        },
      });
    },
    [loading],
  );

  return { open: openCheckout, loading };
}

// ---------------------------------------------------------------------------
// MarlinCheckoutButton component
// ---------------------------------------------------------------------------

export interface MarlinCheckoutButtonProps {
  /** Invoice ID for one-time payments. */
  invoiceId?: string;
  /** Plan slug for subscriptions. */
  planSlug?: string;
  /** Widget color theme. */
  theme?: Theme;
  /** Called after successful payment. */
  onSuccess?: OpenOptions['onSuccess'];
  /** Called on error. */
  onError?: OpenOptions['onError'];
  /** Called when the widget closes. */
  onClose?: OpenOptions['onClose'];
  /** Button content. */
  children?: ReactNode;
  /** Additional CSS class name. */
  className?: string;
  /** Whether the button is disabled. */
  disabled?: boolean;
}

export function MarlinCheckoutButton({
  invoiceId,
  planSlug,
  theme,
  onSuccess,
  onError,
  onClose,
  children = 'Pay with Marlin',
  className,
  disabled,
}: MarlinCheckoutButtonProps): JSX.Element {
  const { open: openCheckout, loading } = useMarlinCheckout();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled || loading) return;
    openCheckout({ invoiceId, planSlug, theme, onSuccess, onError, onClose });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      data-marlin-button=""
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

export default MarlinCheckoutButton;
