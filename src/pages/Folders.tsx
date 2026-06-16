import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

export default function Folders() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [folders, setFolders] = useState<{ path: string; seriesCount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [scanPath, setScanPath] = useState('')
  const [scanType, setScanType] = useState('auto')

  const loadFolders = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.getFolders()
      setFolders(list)
    } catch (err) {
      console.error('Failed to load folders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFolders() }, [loadFolders])

  const handleScan = async () => {
    if (!scanPath.trim()) return
    setLoading(true)
    try {
      const type = scanType === 'auto' ? undefined : scanType
      await api.scanDirectory(scanPath.trim(), type)
      setScanPath('')
      await loadFolders()
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (path: string) => {
    if (!confirm(`¿Eliminar todas las series de "${path}"?`)) return
    await api.deleteFolder(path)
    await loadFolders()
  }

  const handleRescan = async (path: string) => {
    setLoading(true)
    try {
      await api.deleteFolder(path)
      await api.scanDirectory(path)
      await loadFolders()
    } catch (err) {
      console.error('Rescan failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigate('/library')}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtn} onClick={() => navigate('/guide')}>Guía</button>
          <button style={styles.navBtnActive}>Carpetas</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>
          {profile?.name} {profile?.avatar}
        </div>
      </div>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Carpetas</h1>
        </div>

        <div style={styles.scanBar}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Ruta a escanear (ej: /mnt/c/Users/Benja/Videos)"
            value={scanPath}
            onChange={e => setScanPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <select
            value={scanType}
            onChange={e => setScanType(e.target.value)}
            style={styles.typeSelect}
          >
            <option value="auto">Auto</option>
            <option value="anime">Anime</option>
            <option value="series">Serie</option>
            <option value="movie">Película</option>
          </select>
          <button style={styles.scanBtn} onClick={handleScan}>Escanear</button>
        </div>

        {loading ? (
          <div style={styles.loading}>Cargando...</div>
        ) : folders.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay carpetas escaneadas</p>
            <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Escaneá una carpeta para empezar</p>
          </div>
        ) : (
          <div style={styles.list}>
            {folders.map(f => (
              <div key={f.path} style={styles.card}>
                <div style={styles.cardInfo}>
                  <span style={styles.cardPath}>{f.path}</span>
                  <span style={styles.cardCount}>{f.seriesCount} serie{f.seriesCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.actionBtn} onClick={() => handleRescan(f.path)}>↻</button>
                  <button style={{ ...styles.actionBtn, color: '#e50914' }} onClick={() => handleDelete(f.path)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' },
  sidebar: {
    width: 200, background: '#141414', padding: 20,
    display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid #1f1f1f',
  },
  logo: { fontSize: 20, fontWeight: 800, color: '#e50914', letterSpacing: -0.5 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: { padding: '10px 16px', background: 'transparent', color: '#a0a0a0', borderRadius: 6, textAlign: 'left', fontSize: 14 },
  navBtnActive: { padding: '10px 16px', background: '#1f1f1f', color: '#fff', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 600 },
  main: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 700 },
  scanBar: { display: 'flex', gap: 8 },
  input: { padding: '8px 14px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 },
  typeSelect: { padding: '8px 12px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer' },
  scanBtn: { padding: '8px 20px', background: '#e50914', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#1f1f1f', borderRadius: 8,
  },
  cardInfo: { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' },
  cardPath: { fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  cardCount: { fontSize: 12, color: '#888' },
  cardActions: { display: 'flex', gap: 8, flexShrink: 0 },
  actionBtn: {
    padding: '6px 12px', background: '#333', border: 'none', color: '#fff',
    borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600,
  },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
}
