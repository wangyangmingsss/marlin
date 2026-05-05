import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarlinProviderProps {
  /** Publishable key from the Marlin dashboard. */
  publishableKey: string;
  /** Override the checkout base URL. Defaults to https://checkout.marlin.dev */
  checkoutBaseUrl?: string;
  children: React.ReactNode;
}

export interface CheckoutOptions {
  /** Invoice ID to pay. */
  invoiceId: string;
  /** Called when the checkout is completed successfully. */
  onSuccess?: (result: CheckoutResult) => void;
  /** Called when the user closes the checkout without paying. */
  onCancel?: () => void;
  /** Called on any error during checkout. */
  onError?: (error: Error) => void;
  /** Optional theme override. */
  theme?: "light" | "dark" | "auto";
}

export interface CheckoutResult {
  invoiceId: string;
  transactionSignature: string;
  status: "paid";
}

export interface MarlinCheckoutButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "onError"
  > {
  /** Invoice ID to pay. */
  invoiceId: string;
  /** Called when the checkout is completed successfully. */
  onSuccess?: (result: CheckoutResult) => void;
  /** Called when the user closes the checkout without paying. */
  onCancel?: () => void;
  /** Called on any error during checkout. */
  onError?: (error: Error) => void;
  /** Optional theme override. */
  theme?: "light" | "dark" | "auto";
  /** Button label. Defaults to "Pay with Marlin". */
  label?: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface MarlinContextValue {
  publishableKey: string;
  checkoutBaseUrl: string;
}

const MarlinContext = createContext<MarlinContextValue | null>(null);

function useMarlinContext(): MarlinContextValue {
  const ctx = useContext(MarlinContext);
  if (!ctx) {
    throw new Error(
      "useMarlinCheckout must be used within a <MarlinProvider>.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_CHECKOUT_URL = "https://checkout.marlin.dev";

export function MarlinProvider({
  publishableKey,
  checkoutBaseUrl,
  children,
}: MarlinProviderProps): React.ReactElement {
  const value = React.useMemo<MarlinContextValue>(
    () => ({
      publishableKey,
      checkoutBaseUrl: (checkoutBaseUrl ?? DEFAULT_CHECKOUT_URL).replace(
        /\/+$/,
        "",
      ),
    }),
    [publishableKey, checkoutBaseUrl],
  );

  return React.createElement(MarlinContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// useMarlinCheckout hook
// ---------------------------------------------------------------------------

export interface UseMarlinCheckoutReturn {
  /** Open the checkout overlay for the given invoice. */
  open: (opts: CheckoutOptions) => void;
  /** Whether the checkout overlay is currently visible. */
  isOpen: boolean;
  /** Close the overlay programmatically. */
  close: () => void;
}

export function useMarlinCheckout(): UseMarlinCheckoutReturn {
  const { publishableKey, checkoutBaseUrl } = useMarlinContext();
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const callbacksRef = useRef<{
    onSuccess?: CheckoutOptions["onSuccess"];
    onCancel?: CheckoutOptions["onCancel"];
    onError?: CheckoutOptions["onError"];
  }>({});

  const close = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.remove();
      iframeRef.current = null;
    }
    setIsOpen(false);
  }, []);

  // Listen for postMessage events from the checkout iframe.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.endsWith("marlin.dev")) return;

      const { type, data } = event.data ?? {};

      switch (type) {
        case "marlin:checkout:success":
          callbacksRef.current.onSuccess?.(data as CheckoutResult);
          close();
          break;
        case "marlin:checkout:cancel":
          callbacksRef.current.onCancel?.();
          close();
          break;
        case "marlin:checkout:error":
          callbacksRef.current.onError?.(
            new Error((data as { message?: string })?.message ?? "Checkout error"),
          );
          close();
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [close]);

  const open = useCallback(
    (opts: CheckoutOptions) => {
      if (iframeRef.current) {
        iframeRef.current.remove();
      }

      callbacksRef.current = {
        onSuccess: opts.onSuccess,
        onCancel: opts.onCancel,
        onError: opts.onError,
      };

      const params = new URLSearchParams({
        key: publishableKey,
        invoiceId: opts.invoiceId,
      });

      if (opts.theme) {
        params.set("theme", opts.theme);
      }

      const iframe = document.createElement("iframe");
      iframe.src = `${checkoutBaseUrl}/embed?${params.toString()}`;
      iframe.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;border:none;background:rgba(0,0,0,0.5);";
      iframe.allow = "payment *";
      iframe.setAttribute("data-marlin-checkout", "true");
      document.body.appendChild(iframe);

      iframeRef.current = iframe;
      setIsOpen(true);
    },
    [publishableKey, checkoutBaseUrl],
  );

  return { open, isOpen, close };
}

// ---------------------------------------------------------------------------
// MarlinCheckoutButton component
// ---------------------------------------------------------------------------

export function MarlinCheckoutButton({
  invoiceId,
  onSuccess,
  onCancel,
  onError,
  theme,
  label = "Pay with Marlin",
  ...buttonProps
}: MarlinCheckoutButtonProps): React.ReactElement {
  const { open } = useMarlinCheckout();

  const handleClick = useCallback(() => {
    open({ invoiceId, onSuccess, onCancel, onError, theme });
  }, [open, invoiceId, onSuccess, onCancel, onError, theme]);

  return React.createElement(
    "button",
    { ...buttonProps, onClick: handleClick },
    label,
  );
}
