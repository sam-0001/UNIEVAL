// PWA & Web Push Notification Client Services

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the service worker with the browser.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.info('[PWA] Service Worker not supported in this browser');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.info('[PWA] Service Worker registered with scope:', reg.scope);
    return reg;
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Checks current notification permission.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Subscribes the current device to Web Push notifications.
 */
export async function subscribeToPushNotifications(): Promise<{ ok: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, error: 'Push notifications are not supported on this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: 'Notification permission was denied.' };
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker() || undefined;
    }

    if (!registration) {
      return { ok: false, error: 'Service worker registration not available.' };
    }

    // Fetch VAPID public key from backend
    const res = await fetch('/api/notifications/vapid-key');
    if (!res.ok) throw new Error('Failed to retrieve notification key');
    const { publicKey } = await res.json();

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Get existing subscription or create a new one
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });
    }

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const subRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceType: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      })
    });

    if (!subRes.ok) {
      throw new Error('Failed to store subscription on server');
    }

    return { ok: true };
  } catch (err: any) {
    console.error('[PWA] subscribeToPushNotifications error:', err);
    return { ok: false, error: err.message || 'Failed to subscribe to notifications' };
  }
}

/**
 * Unsubscribes current device from Web Push notifications.
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    return true;
  } catch (e) {
    console.error('[PWA] unsubscribe error:', e);
    return false;
  }
}
