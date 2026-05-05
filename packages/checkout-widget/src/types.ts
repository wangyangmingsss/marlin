/** Callback invoked on successful payment. */
export type SuccessCallback = (data: { invoiceId?: string; txHash?: string }) => void;

/** Callback invoked when an error occurs inside the widget. */
export type ErrorCallback = (error: { code: string; message: string }) => void;

/** Callback invoked when the widget is closed (by user or programmatically). */
export type CloseCallback = () => void;

/** Visual theme passed to the hosted iframe. */
export type Theme = 'light' | 'dark' | 'auto';

/** Options accepted by MarlinCheckout.open(). */
export interface OpenOptions {
  /** Invoice ID for one-time payments. Mutually exclusive with planSlug. */
  invoiceId?: string;
  /** Subscription plan slug. Mutually exclusive with invoiceId. */
  planSlug?: string;
  /** Widget color theme. Defaults to 'auto'. */
  theme?: Theme;
  /** Called after a successful payment. */
  onSuccess?: SuccessCallback;
  /** Called when the widget encounters an error. */
  onError?: ErrorCallback;
  /** Called when the widget is closed for any reason. */
  onClose?: CloseCallback;
}

/** Handle returned by MarlinCheckout.open() to control the widget. */
export interface CheckoutHandle {
  /** Programmatically close the widget. */
  close: () => void;
}

/** PostMessage events sent from the hosted iframe to the parent window. */
export type WidgetEvent =
  | { type: 'ready' }
  | { type: 'resize'; height: number }
  | { type: 'success'; invoiceId?: string; txHash?: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'close' };
