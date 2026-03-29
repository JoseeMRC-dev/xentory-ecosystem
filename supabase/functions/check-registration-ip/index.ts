/**
 * check-registration-ip — Supabase Edge Function
 *
 * Verifica si la IP del cliente puede crear una nueva cuenta gratuita.
 * Se llama ANTES de supabase.auth.signUp() desde el frontend.
 *
 * Body JSON: { email: string, device_fp?: string }
 * Respuesta: { allowed: boolean, reason?: string }
 *
 * Lógica:
 *  - Máx. 2 cuentas por IP (permite familia/hogar, bloquea granjas de cuentas)
 *  - Máx. 1 cuenta por device fingerprint (SHA-256 del navegador/dispositivo)
 *  - Registra cada nuevo intento en account_ip_log
 *  - IPs de loopback/privadas siempre permitidas (dev)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const MAX_ACCOUNTS_PER_IP = 2;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Extrae la IP real del cliente desde los headers de Cloudflare/Vercel */
function getClientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip')       ??
    req.headers.get('x-real-ip')              ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    '0.0.0.0'
  );
}

/** IPs privadas/loopback — no se limitan (entornos de desarrollo) */
function isPrivateIP(ip: string): boolean {
  return (
    ip === '0.0.0.0'           ||
    ip.startsWith('127.')      ||
    ip.startsWith('10.')       ||
    ip.startsWith('192.168.')  ||
    ip.startsWith('172.16.')   ||
    ip.startsWith('172.17.')   ||
    ip.startsWith('172.18.')   ||
    ip.startsWith('172.19.')   ||
    ip.startsWith('172.2')     ||
    ip.startsWith('172.30.')   ||
    ip.startsWith('172.31.')   ||
    ip === '::1'
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const { email, device_fp } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ allowed: false, reason: 'email_required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip        = getClientIP(req);
    const validFp   = typeof device_fp === 'string' && /^[0-9a-f]{64}$/.test(device_fp);

    // Dev / IPs privadas: siempre permitidas
    if (isPrivateIP(ip)) {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Capa 1: límite por IP ────────────────────────────────────
    const { count: ipCount, error: ipErr } = await supabaseAdmin
      .from('account_ip_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .in('status', ['pending', 'confirmed']);

    if (ipErr) {
      console.warn('check-ip: DB error (IP)', ipErr.message);
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((ipCount ?? 0) >= MAX_ACCOUNTS_PER_IP) {
      console.log(`check-ip: bloqueado por IP=${ip} count=${ipCount}`);
      return new Response(JSON.stringify({ allowed: false, reason: 'ip_limit_reached' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Capa 2: límite por device fingerprint ────────────────────
    if (validFp) {
      const { count: fpCount, error: fpErr } = await supabaseAdmin
        .from('account_ip_log')
        .select('*', { count: 'exact', head: true })
        .eq('device_fp', device_fp)
        .in('status', ['pending', 'confirmed']);

      if (!fpErr && (fpCount ?? 0) >= 1) {
        console.log(`check-ip: bloqueado por device_fp count=${fpCount}`);
        return new Response(JSON.stringify({ allowed: false, reason: 'device_limit_reached' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Registrar el intento
    await supabaseAdmin.from('account_ip_log').insert({
      ip_address: ip,
      email:      email.toLowerCase().trim(),
      device_fp:  validFp ? device_fp : null,
      status:     'pending',
    });

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('check-registration-ip error:', err);
    // Fail-open: si hay error inesperado, no bloquemos el registro
    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
