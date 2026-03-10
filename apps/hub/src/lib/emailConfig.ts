/**
 * Centralized email configuration for Xentory Hub
 *
 * To change the sender email:
 *   1. Update SENDER_EMAIL and SENDER_NAME below
 *   2. In Supabase Dashboard → Authentication → Email Templates
 *      → update "From email" to match SENDER_EMAIL
 *   3. Verify the domain in your email provider (Resend/SendGrid/etc.)
 *
 * Current setup: Supabase Auth handles transactional emails.
 * For custom SMTP: set these in Supabase Dashboard → Project Settings → Auth → SMTP Settings
 */

export const EMAIL_CONFIG = {
  /** The "From" address shown to users */
  SENDER_EMAIL: 'noreply@xentory.io',

  /** Display name shown in email clients */
  SENDER_NAME: 'Xentory',

  /** Reply-to address (support inbox) */
  REPLY_TO: 'support@xentory.io',

  /** Email types and their subjects */
  SUBJECTS: {
    CONFIRM_SIGNUP:   'Confirm your Xentory account',
    RESET_PASSWORD:   'Reset your Xentory password',
    MAGIC_LINK:       'Your Xentory sign-in link',
    PRICE_ALERT:      '🔔 Xentory Price Alert triggered',
    WELCOME:          'Welcome to Xentory 🚀',
    PLAN_ACTIVATED:   'Your Xentory plan is now active',
    PLAN_CANCELLED:   'Your Xentory subscription has been cancelled',
  },
} as const;

/**
 * INSTRUCTIONS — How to change the sender email:
 *
 * Option A: Supabase built-in SMTP (current)
 *   → Go to: supabase.com → Your Project → Authentication → Settings
 *   → Scroll to "SMTP Settings" → Enable custom SMTP
 *   → Set: Host, Port, Username, Password, Sender name, Sender email
 *
 * Option B: Use Resend (recommended for production)
 *   → Install: npm install resend
 *   → Create Supabase Edge Function: supabase/functions/send-email/index.ts
 *   → Use RESEND_API_KEY in Supabase secrets
 *   → Example:
 *
 *   import { Resend } from 'npm:resend';
 *   const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
 *   await resend.emails.send({
 *     from: `${EMAIL_CONFIG.SENDER_NAME} <${EMAIL_CONFIG.SENDER_EMAIL}>`,
 *     to: [userEmail],
 *     subject: EMAIL_CONFIG.SUBJECTS.PRICE_ALERT,
 *     html: '<p>Your alert triggered...</p>',
 *   });
 *
 * Option C: Update Supabase email templates directly
 *   → supabase.com → Authentication → Email Templates
 *   → Edit each template's "From address" field
 */
