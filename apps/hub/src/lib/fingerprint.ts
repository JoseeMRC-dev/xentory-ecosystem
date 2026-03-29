/**
 * deviceFingerprint — huella digital estable del navegador/dispositivo.
 *
 * Combina: canvas rendering, WebGL renderer, propiedades del navegador y pantalla.
 * Produce un hash SHA-256 de 64 caracteres.
 * No depende de cookies ni localStorage — funciona en modo incógnito.
 * El resultado se cachea en memoria para la sesión actual.
 */

function canvasFp(): string {
  try {
    const c   = document.createElement('canvas');
    c.width   = 256;
    c.height  = 64;
    const ctx = c.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, 256, 64);

    ctx.fillStyle = '#3b9eff';
    ctx.font      = 'bold 15px Arial, Helvetica, sans-serif';
    ctx.fillText('Xentory\u{1F3AF}fp', 10, 26);

    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth   = 1.4;
    ctx.beginPath();
    ctx.arc(220, 32, 22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,200,122,0.75)';
    ctx.fillRect(10, 38, 140, 7);

    ctx.fillStyle = 'rgba(255,80,80,0.6)';
    ctx.fillRect(155, 38, 60, 7);

    return c.toDataURL('image/png');
  } catch {
    return '';
  }
}

function webGLFp(): string {
  try {
    const c  = document.createElement('canvas');
    const gl = (c.getContext('webgl') ?? c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      return [
        gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
        gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
      ].join('~');
    }
    return String(gl.getParameter(gl.VERSION));
  } catch {
    return '';
  }
}

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

let _cached: string | null = null;

export async function deviceFingerprint(): Promise<string> {
  if (_cached) return _cached;

  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}x${screen.pixelDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    String(navigator.hardwareConcurrency ?? 0),
    String((navigator as any).deviceMemory ?? 0),
    String(new Date().getTimezoneOffset()),
    navigator.platform ?? '',
    canvasFp(),
    webGLFp(),
    String(window.devicePixelRatio ?? 1),
  ].join('|||');

  _cached = await sha256(components);
  return _cached;
}
