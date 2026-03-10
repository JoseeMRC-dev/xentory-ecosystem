/**
 * useLoginProtection — Brute-force protection for login forms
 *
 * Strategy:
 *   - Track failed attempts per email in sessionStorage (cleared on tab close)
 *   - After MAX_ATTEMPTS failures → lock for LOCKOUT_MS
 *   - Server-side: Supabase has built-in rate limiting (429 responses)
 *   - For production: implement Supabase Edge Function with IP-based rate limiting
 */

const MAX_ATTEMPTS  = 3;
const LOCKOUT_MS    = 90_000; // 90 seconds
const STORAGE_KEY   = 'xentory_login_protection';

interface AttemptRecord {
  count:     number;
  lockedUntil: number | null; // timestamp
  email:     string;
}

function getRecord(email: string): AttemptRecord {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}:${email}`);
    if (raw) return JSON.parse(raw);
  } catch { /**/ }
  return { count: 0, lockedUntil: null, email };
}

function saveRecord(record: AttemptRecord) {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}:${record.email}`, JSON.stringify(record));
  } catch { /**/ }
}

function clearRecord(email: string) {
  try { sessionStorage.removeItem(`${STORAGE_KEY}:${email}`); } catch { /**/ }
}

export interface LoginProtectionResult {
  /** Call on every failed login attempt */
  recordFailure: (email: string) => { locked: boolean; remainingMs: number; attemptsLeft: number };
  /** Call on successful login */
  recordSuccess: (email: string) => void;
  /** Check before attempting login — returns lock info if locked */
  checkLock:     (email: string) => { locked: boolean; remainingMs: number; remainingSec: number };
}

export function useLoginProtection(): LoginProtectionResult {

  const checkLock = (email: string) => {
    const rec = getRecord(email.toLowerCase().trim());
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      const remainingMs  = rec.lockedUntil - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      return { locked: true, remainingMs, remainingSec };
    }
    // Lock expired — reset
    if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
      clearRecord(email.toLowerCase().trim());
    }
    return { locked: false, remainingMs: 0, remainingSec: 0 };
  };

  const recordFailure = (email: string) => {
    const key = email.toLowerCase().trim();
    const rec = getRecord(key);

    // If already locked, just return locked state
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      return {
        locked:       true,
        remainingMs:  rec.lockedUntil - Date.now(),
        attemptsLeft: 0,
      };
    }

    const newCount = rec.count + 1;
    const willLock = newCount >= MAX_ATTEMPTS;
    const lockedUntil = willLock ? Date.now() + LOCKOUT_MS : null;

    saveRecord({ email: key, count: newCount, lockedUntil });

    return {
      locked:       willLock,
      remainingMs:  lockedUntil ? LOCKOUT_MS : 0,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - newCount),
    };
  };

  const recordSuccess = (email: string) => {
    clearRecord(email.toLowerCase().trim());
  };

  return { checkLock, recordFailure, recordSuccess };
}
