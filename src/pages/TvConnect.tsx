import { useState, useEffect } from 'react'

export default function TvConnect() {
  const [info, setInfo] = useState<{ local: string; network: string; mdns: string; port: number } | null>(null)
  const [qrSvg, setQrSvg] = useState('')

  useEffect(() => {
    fetch('/api/connect')
      .then(r => r.json())
      .then(setInfo)
      .catch(() => {})

    fetch('/api/connect/qr')
      .then(r => r.text())
      .then(setQrSvg)
      .catch(() => {})
  }, [])

  if (!info) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>TulennTv</h1>
          <p style={{ color: '#a0a0a0', marginTop: 16 }}>
            Conectando al servidor...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>TulennTv</h1>
        <h2 style={styles.subtitle}>Conectar dispositivo</h2>

        {qrSvg && (
          <div style={styles.qrBox} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        )}

        <div style={styles.infoBox}>
          <p style={styles.label}>Red local (recomendado)</p>
          <p style={styles.url}>{info.network}</p>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.label}>mDNS (Apple / Linux)</p>
          <p style={styles.urlMuted}>{info.mdns}</p>
        </div>

        <p style={styles.hint}>
          Escaneá el código QR o escribí la URL en el navegador de tu Smart TV / celular.
          Todos los dispositivos deben estar en la misma red WiFi.
        </p>

        <div style={styles.ipRow}>
          <span style={styles.ipLabel}>IP local:</span>
          <span style={styles.ipValue}>{info.network.replace('http://', '').replace(`:${info.port}`, '')}</span>
          <span style={styles.ipLabel}>Puerto:</span>
          <span style={styles.ipValue}>{info.port}</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', padding: 20 },
  card: { textAlign: 'center', maxWidth: 500, width: '100%' },
  logo: { fontSize: 48, color: '#e50914', fontWeight: 800, marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 22, fontWeight: 600, marginBottom: 24 },
  qrBox: { background: '#fff', borderRadius: 12, padding: 16, display: 'inline-block', marginBottom: 20 },
  infoBox: { background: '#1f1f1f', borderRadius: 8, padding: '12px 16px', marginBottom: 12, textAlign: 'left' as const },
  label: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  url: { fontSize: 20, fontWeight: 700, color: '#e50914', fontFamily: 'monospace' },
  urlMuted: { fontSize: 16, fontWeight: 600, color: '#888', fontFamily: 'monospace' },
  hint: { fontSize: 13, color: '#666', marginTop: 16, lineHeight: 1.5 },
  ipRow: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, fontSize: 13, color: '#555' },
  ipLabel: { color: '#666' },
  ipValue: { color: '#aaa', fontFamily: 'monospace' },
}
