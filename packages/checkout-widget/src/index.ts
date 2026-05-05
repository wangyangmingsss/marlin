export type {
  OpenOptions,
  CheckoutHandle,
  Theme,
  SuccessCallback,
  ErrorCallback,
  CloseCallback,
  WidgetEvent,
} from './types';

import type { OpenOptions, CheckoutHandle, WidgetEvent } from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WIDGET_ORIGIN =
  (typeof globalThis !== 'undefined' && (globalThis as any).MARLIN_WIDGET_URL) ||
  'https://widget.marlin.fi';

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const BACKDROP_STYLES: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  zIndex: '9999',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: '0',
  transition: 'opacity 0.2s ease',
};

const IFRAME_STYLES: Partial<CSSStyleDeclaration> = {
  width: '100%',
  maxWidth: '448px',
  height: '600px',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  backgroundColor: '#ffffff',
  opacity: '0',
  transition: 'opacity 0.15s ease',
};

function applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  for (const [key, value] of Object.entries(styles)) {
    (el.style as any)[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Core: open()
// ---------------------------------------------------------------------------

function buildIframeSrc(opts: OpenOptions): string {
  const base = WIDGET_ORIGIN;
  if (opts.invoiceId) return `${base}/i/${encodeURIComponent(opts.invoiceId)}`;
  if (opts.planSlug) return `${base}/sub/${encodeURIComponent(opts.planSlug)}`;
  throw new Error('MarlinCheckout: either invoiceId or planSlug is required');
}

function open(opts: OpenOptions): CheckoutHandle {
  if (!opts.invoiceId && !opts.planSlug) {
    throw new Error('MarlinCheckout: either invoiceId or planSlug is required');
  }

  let destroyed = false;

  // --- Backdrop ---
  const backdrop = document.createElement('div');
  backdrop.setAttribute('data-marlin-backdrop', '');
  applyStyles(backdrop, BACKDROP_STYLES);

  // --- Iframe ---
  const iframe = document.createElement('iframe');
  const src = buildIframeSrc(opts);
  const separator = src.includes('?') ? '&' : '?';
  const theme = opts.theme ?? 'auto';
  iframe.src = `${src}${separator}theme=${theme}`;
  iframe.setAttribute('allow', 'payment; clipboard-write');
  iframe.setAttribute('title', 'Marlin Checkout');
  applyStyles(iframe, IFRAME_STYLES);

  backdrop.appendChild(iframe);
  document.body.appendChild(backdrop);

  // Trigger fade-in on next frame
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
  });

  // --- Cleanup ---
  function cleanup(): void {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('message', onMessage);
    window.removeEventListener('keydown', onKeyDown);
    backdrop.style.opacity = '0';
    setTimeout(() => {
      backdrop.remove();
    }, 200);
    opts.onClose?.();
  }

  // --- PostMessage handler ---
  function onMessage(event: MessageEvent): void {
    if (event.origin !== WIDGET_ORIGIN) return;

    const data = event.data as WidgetEvent;
    if (!data || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'ready':
        iframe.style.opacity = '1';
        break;

      case 'resize':
        if (typeof data.height === 'number' && data.height > 0) {
          iframe.style.height = `${data.height}px`;
        }
        break;

      case 'success':
        opts.onSuccess?.({ invoiceId: data.invoiceId, txHash: data.txHash });
        cleanup();
        break;

      case 'error':
        opts.onError?.({ code: data.code, message: data.message });
        cleanup();
        break;

      case 'close':
        cleanup();
        break;
    }
  }

  // --- Keyboard handler ---
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      cleanup();
    }
  }

  // --- Backdrop click handler ---
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      cleanup();
    }
  });

  window.addEventListener('message', onMessage);
  window.addEventListener('keydown', onKeyDown);

  return { close: cleanup };
}

// ---------------------------------------------------------------------------
// Auto-init: data-attribute API
// ---------------------------------------------------------------------------

function autoInit(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-marlin-checkout]');

  elements.forEach((el) => {
    if (el.hasAttribute('data-marlin-bound')) return;
    el.setAttribute('data-marlin-bound', '');

    el.addEventListener('click', (event) => {
      event.preventDefault();

      const invoiceId = el.getAttribute('data-invoice-id') ?? undefined;
      const planSlug = el.getAttribute('data-plan-slug') ?? undefined;
      const theme = (el.getAttribute('data-theme') as OpenOptions['theme']) ?? undefined;

      open({ invoiceId, planSlug, theme });
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const MarlinCheckout = { open } as const;
export { open };
export default MarlinCheckout;
