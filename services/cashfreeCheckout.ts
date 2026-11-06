/**
 * services/cashfreeCheckout.ts
 * Unified Cashfree Payment Gateway Client.
 * Eliminates redundant window.Cashfree declarations and provides
 * a resilient, single-entry checkout invocation across all pages.
 */

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'production' | 'sandbox' }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: string }) => Promise<{
        error?: { message?: string };
        paymentDetails?: any;
      }>;
    };
  }
}

let cashfreeSdkPromise: Promise<boolean> | null = null;

export async function ensureCashfreeSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.Cashfree) return true;

  if (cashfreeSdkPromise) return cashfreeSdkPromise;

  cashfreeSdkPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src*="cashfree.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return cashfreeSdkPromise;
}

export interface CheckoutParams {
  paymentSessionId: string;
  onSuccess: () => void | Promise<void>;
  onError: (errorMessage: string) => void;
}

export async function launchCashfreeCheckout({
  paymentSessionId,
  onSuccess,
  onError
}: CheckoutParams): Promise<void> {
  if (!paymentSessionId) {
    onError('Invalid payment session. Please try again.');
    return;
  }

  const isLoaded = await ensureCashfreeSdk();
  if (!isLoaded || !window.Cashfree) {
    onError('Unable to connect to Cashfree payment gateway. Please check your connection.');
    return;
  }

  const isProduction = import.meta.env.PROD;
  const cashfree = window.Cashfree({ mode: isProduction ? 'production' : 'sandbox' });

  try {
    const result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_modal'
    });

    if (result.error) {
      onError(result.error.message || 'Payment failed or cancelled.');
    } else {
      await onSuccess();
    }
  } catch (err: any) {
    onError(err.message || 'Payment checkout encountered an error.');
  }
}
