import { useState, useEffect } from 'react'

const SERVER_PORT_KEY = 'tulenntv-port'

export default function TvConnect() {
  const [port, setPort] = useState<number | null>(null)
  const [ip, setIp] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(SERVER_PORT_KEY)
    if (stored) setPort(parseInt(stored, 10))
  }, [])

  useEffect(() => {
    const fetchPort = async () => {
      try {
        const res = await fetch('/api/server-info')
        const data = await res.json()
        setPort(data.port)
        localStorage.setItem(SERVER_PORT_KEY, String(data.port))
      } catch {}
    }
    if (!port) fetchPort()
  }, [port])

  useEffect(() => {
    fetch('/api/network-ips')
      .then(r => r.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp('192.168.1.??'))
  }, [])

  if (!port) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>TulennTv</h1>
          <p style={{ color: '#a0a0a0', marginTop: 16 }}>
            Inicia la app de escritorio primero para conectar la TV.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>TulennTv</h1>
        <h2 style={styles.subtitle}>Conectar TV</h2>
        <div style={styles.infoBox}>
          <p style={styles.label}>Dirección IP local:</p>
          <p style={styles.value}>{ip || 'Conectando...'}</p>
        </div>
        <div style={styles.infoBox}>
          <p style={styles.label}>Puerto:</p>
          <p style={styles.value}>{port}</p>
        </div>
        <div style={styles.infoBox}>
          <p style={styles.label}>URL para la TV:</p>
          <p style={styles.url}>http://{ip || 'localhost'}:{port}</p>
        </div>
        <p style={styles.hint}>
          Abre esa URL en el navegador de tu Smart TV para usar TulennTv.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', padding: 20 },
  card: { textAlign: 'center', maxWidth: 500, width: '100%' },
  logo: { fontSize: 48, color: '#e50914', fontWeight: 800, marginBottom: 24, letterSpacing: -1 },
  subtitle: { fontSize: 22, fontWeight: 600, marginBottom: 24 },
  infoBox: { background: '#1f1f1f', borderRadius: 8, padding: '12px 16px', marginBottom: 12, textAlign: 'left' as const },
  label: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: 600, color: '#fff' },
  url: { fontSize: 16, fontWeight: 600, color: '#e50914' },
  hint: { fontSize: 13, color: '#666', marginTop: 16, lineHeight: 1.5 },
}
