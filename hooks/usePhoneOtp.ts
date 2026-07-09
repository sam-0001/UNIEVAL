import { useState } from 'react';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * usePhoneOtp — Firebase-free phone OTP hook.
 *
 * How it works:
 *   sendOtp(phone)   → POST /api/auth/otp/send with { phoneNumber }
 *                      The backend looks up the user's email by phone, then
 *                      sends an email OTP (same system used everywhere else).
 *
 *   verifyOtp(otp)   → POST /api/auth/otp/verify with { email, otp }
 *                      Returns a dummy token string on success (truthy),
 *                      or null on failure — same interface as the old Firebase hook.
 *
 * Drop-in replacement: same return shape as the original Firebase hook so
 * LoginModal.tsx and Login.tsx need zero changes.
 */
export const usePhoneOtp = () => {
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [otpSent, setOtpSent]                   = useState(false);
  const [resolvedEmail, setResolvedEmail]       = useState<string | null>(null);

  /**
   * Send OTP to the phone number.
   * The backend resolves the phone → email and sends the OTP to the email.
   * Pass the 10-digit number (without +91) — the hook normalises it.
   */
  const sendOtp = async (phoneNumber: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Normalise: strip everything except digits
      const digits = phoneNumber.replace(/\D/g, '');

      const data = await fetchJson<{ message: string; sentTo: string; email?: string }>(
        '/auth/otp/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: digits }),
        }
      );

      // Backend may echo back the resolved email; cache it for verifyOtp
      if (data.email) setResolvedEmail(data.email);

      setOtpSent(true);
      return true;
    } catch (err: any) {
      console.error('[usePhoneOtp] sendOtp error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify the OTP.
   * Returns a non-null string (acts as a "token") on success, null on failure.
   * This keeps the same interface as the old Firebase hook so callers don't
   * need to change their  `if (!firebaseToken)` checks.
   */
  const verifyOtp = async (otp: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!resolvedEmail) {
        throw new Error('No OTP session found. Please request a new OTP.');
      }

      const data = await fetchJson<{ success: boolean }>(
        '/auth/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resolvedEmail, otp }),
        }
      );

      if (!data.success) {
        setError('Invalid OTP. Please check the code and try again.');
        return null;
      }

      // Return a truthy string — callers only check `if (!firebaseToken)`
      return 'phone_verified';
    } catch (err: any) {
      console.error('[usePhoneOtp] verifyOtp error:', err);
      setError(err.message || 'Invalid OTP. Please check the code and try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setOtpSent(false);
    setResolvedEmail(null);
  };

  return { sendOtp, verifyOtp, reset, loading, error, otpSent };
};