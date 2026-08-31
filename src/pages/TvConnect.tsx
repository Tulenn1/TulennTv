import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TvConnect() {
  const navigate = useNavigate()
  const [info, setInfo] = useState<{ local: string; network: string; mdns: string; port: number } | null>(null)
  const [qrSvg, setQrSvg] = useState('')
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const [infoRes, qrRes] = await Promise.all([
        fetch('/api/connect', { signal: controller.signal }).then(r => r.json()),
        fetch('/api/connect/qr', { signal: controller.signal }).then(r => r.text()),
      ])
      setInfo(infoRes)
      setQrSvg(qrRes)
    } catch {
      setError(true)
    } finally {
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (!info && !error) {
    return (
      <div style={styles.container}>
        <div style={styles.card} className="card">
          <h1 style={styles.logo}>TulennTv</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Conectando al servidor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card} className="card">
          <button style={styles.backBtn} onClick={() => navigate(-1)}>← Volver</button>
          <h1 style={styles.logo}>TulennTv</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 24, lineHeight: 1.6 }}>
            No se pudo conectar al servidor.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
            Verifica que el servidor esté corriendo y que ambos dispositivos estén en la misma red WiFi.
          </p>
          <button style={styles.retryBtn} onClick={load}>Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card} className="card">
        <button style={styles.backBtn} onClick={() => navigate(-1)}>← Volver</button>
        <h1 style={styles.logo}>TulennTv</h1>
        <h2 style={styles.subtitle}>Conectar dispositivo</h2>

        {qrSvg && (
          <div style={styles.qrBox} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        )}

        <div style={styles.infoBox}>
          <p style={styles.label}>Red local (recomendado)</p>
          <p style={styles.url}>{info!.network}</p>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.label}>mDNS (Apple / Linux)</p>
          <p style={styles.urlMuted}>{info!.mdns}</p>
        </div>

        <p style={styles.hint}>
          Escanea el código QR o escribe la URL en el navegador de tu Smart TV / celular.
          Todos los dispositivos deben estar en la misma red WiFi.
        </p>

        <div style={styles.ipRow}>
          <span style={styles.ipLabel}>IP local:</span>
          <span style={styles.ipValue}>{info!.network.replace('http://', '').replace(`:${info!.port}`, '')}</span>
          <span style={styles.ipLabel}>Puerto:</span>
          <span style={styles.ipValue}>{info!.port}</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', padding: 20 },
  card: { textAlign: 'center', maxWidth: 500, width: '100%' },
  logo: { fontSize: 48, color: 'var(--accent)', fontWeight: 800, marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 22, fontWeight: 600, marginBottom: 24 },
  qrBox: { background: '#fff', borderRadius: 12, padding: 16, display: 'inline-block', marginBottom: 20 },
  infoBox: { background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px', marginBottom: 12, textAlign: 'left' as const },
  label: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  url: { fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' },
  urlMuted: { fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' },
  hint: { fontSize: 13, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.5 },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', padding: 0, display: 'block', marginBottom: 12 },
  retryBtn: { marginTop: 16, padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' },
  ipRow: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, fontSize: 13, color: 'var(--text-muted)' },
  ipLabel: { color: 'var(--text-muted)' },
  ipValue: { color: 'var(--text-secondary)', fontFamily: 'monospace' },
}
