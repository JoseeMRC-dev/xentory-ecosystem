import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'calc(var(--bar-h) + 3rem) 1.5rem 5rem' }}>
      <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.4rem)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Términos de Uso
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '3rem' }}>
        Última actualización: enero 2025 · <Link to="/" style={{ color: 'var(--gold)', textDecoration: 'none' }}>← Volver</Link>
      </p>

      {/* DISCLAIMER DESTACADO */}
      <div style={{
        padding: '1.5rem', borderRadius: 16, marginBottom: '2.5rem',
        background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)',
      }}>
        <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
          ⚠️ Aviso importante — Naturaleza del servicio
        </div>
        <p style={{ color: 'var(--text2)', lineHeight: 1.8, fontSize: '0.9rem' }}>
          Xentory, Xentory Market y Xentory Bet son <strong style={{ color: 'var(--text)' }}>herramientas de análisis basadas en inteligencia artificial</strong>.
          Los análisis, predicciones y señales generados por nuestros sistemas son{' '}
          <strong style={{ color: 'var(--text)' }}>orientativos e informativos</strong>, y en ningún caso constituyen
          asesoramiento financiero, de inversión o de apuestas.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.8, fontSize: '0.9rem', marginTop: '0.8rem' }}>
          <strong style={{ color: 'var(--text)' }}>La IA no garantiza resultados.</strong>{' '}
          Todo análisis conlleva incertidumbre inherente. Las inversiones en mercados financieros y
          las apuestas deportivas implican riesgo real de pérdida de capital.{' '}
          <strong style={{ color: 'var(--text)' }}>Nunca inviertas ni apuestes más de lo que puedas permitirte perder.</strong>
        </p>
      </div>

      {[
        {
          title: '1. Aceptación de los términos',
          body: `Al registrarte o usar cualquier servicio de Xentory, aceptas estos términos en su totalidad. Si no estás de acuerdo, no debes usar el servicio. El uso continuado del servicio tras modificaciones de estos términos implica su aceptación.`,
        },
        {
          title: '2. Naturaleza del servicio y limitación de responsabilidad',
          body: `Xentory es una plataforma de análisis informativo generado mediante modelos de inteligencia artificial (Google Gemini y otros). Nuestro servicio:

• Proporciona análisis técnicos, estadísticos y predictivos con fines exclusivamente informativos.
• No constituye, en ningún caso, asesoramiento financiero, de inversión, ni recomendación de apuestas.
• No garantiza la exactitud, fiabilidad ni rentabilidad de ningún análisis o predicción.
• No asume responsabilidad por pérdidas económicas derivadas del uso de nuestras señales o análisis.

El usuario asume en todo momento la responsabilidad exclusiva de sus decisiones de inversión o apuesta. Xentory actúa como proveedor de información, no como intermediario financiero ni operador de apuestas.`,
        },
        {
          title: '3. Requisitos de acceso',
          body: `Para usar Xentory debes:
• Tener al menos 18 años de edad.
• Residir en una jurisdicción donde las actividades de inversión y/o apuestas deportivas sean legales.
• Proporcionar información verídica durante el registro.
• No usar el servicio con fines fraudulentos, ilegales o que infrinjan derechos de terceros.`,
        },
        {
          title: '4. Cuentas y seguridad',
          body: `Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Debes notificarnos inmediatamente ante cualquier uso no autorizado de tu cuenta. Xentory utiliza autenticación segura mediante Supabase (JWT con refresh token, PKCE para OAuth, Magic Links de un solo uso). No almacenamos contraseñas en texto plano.`,
        },
        {
          title: '5. Suscripciones y pagos',
          body: `Los planes de pago se facturan de forma recurrente (mensual o anual según elección). Puedes cancelar en cualquier momento desde tu panel de control. La cancelación surte efecto al final del período de facturación en curso, sin cargos adicionales. No se realizan reembolsos parciales por períodos no utilizados salvo requerimiento legal aplicable en tu jurisdicción.`,
        },
        {
          title: '6. Juego responsable',
          body: `Si usas Xentory Bet, te recordamos que las apuestas deportivas pueden generar dependencia. Si crees que puedes tener un problema con el juego, contacta con:
• España: Jugarbien.es · Tel. 900 200 225
• México: Centro de Atención a Adicciones · Tel. 800 911 2000
• Argentina: Jugadores Anónimos · Tel. 0800-333-JUEGO

Xentory apoya el juego responsable y se reserva el derecho de suspender cuentas que muestren patrones de uso problemático.`,
        },
        {
          title: '7. Propiedad intelectual',
          body: `Todo el contenido de Xentory (textos, diseños, código, análisis generados) es propiedad de Xentory o sus licenciantes. Queda prohibida la reproducción, distribución o uso comercial sin autorización expresa.`,
        },
        {
          title: '8. Privacidad y datos',
          body: `El tratamiento de tus datos personales se rige por nuestra Política de Privacidad. Usamos tus datos únicamente para prestar el servicio, mejorar la plataforma y cumplir obligaciones legales. No vendemos datos a terceros.`,
        },
        {
          title: '9. Modificaciones del servicio',
          body: `Xentory se reserva el derecho de modificar, suspender o discontinuar cualquier parte del servicio con previo aviso de 30 días cuando sea materialmente significativo.`,
        },
        {
          title: '10. Ley aplicable',
          body: `Estos términos se rigen por la legislación española. Cualquier disputa se someterá a los tribunales competentes de Madrid, España, salvo que la normativa aplicable en tu país de residencia establezca otro fuero obligatorio.`,
        },
      ].map(s => (
        <div key={s.title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.7rem', color: 'var(--text)' }}>{s.title}</h2>
          <p style={{ color: 'var(--text2)', lineHeight: 1.85, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{s.body}</p>
        </div>
      ))}

      <div style={{ marginTop: '3rem', padding: '1.2rem', borderRadius: 12, background: 'var(--card2)', border: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.7 }}>
          ¿Tienes dudas sobre estos términos? Escríbenos a{' '}
          <a href="mailto:legal@xentory.io" style={{ color: 'var(--gold)', textDecoration: 'none' }}>legal@xentory.io</a>
        </p>
      </div>
    </div>
  );
}
