import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Series } from '../shared/types'
import SeriesCard from '../components/SeriesCard'

export default function Library() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [series, setSeries] = useState<Series[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [scanPath, setScanPath] = useState('')
  const [loading, setLoading] = useState(true)

  const loadLibrary = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const type = filter === 'all' ? undefined : filter
      const list = await api.getLibrary(type, search || undefined, profile.id)
      setSeries(list)
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, filter, search])

  useEffect(() => { loadLibrary() }, [loadLibrary])

  const handleScan = async () => {
    if (!scanPath.trim()) return
    setLoading(true)
    try {
      await api.scanDirectory(scanPath.trim())
      setScanPath('')
      await loadLibrary()
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (s: Series) => {
    navigate(`/zapper?series=${s.id}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtnActive}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtn} onClick={() => navigate('/guide')}>Guía</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>
          {profile?.name} {profile?.avatar}
        </div>
      </div>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Biblioteca</h1>
          <div style={styles.controls}>
            <input
              style={styles.searchInput}
              placeholder="Buscar series..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={styles.filters}>
              {['all', 'anime', 'series', 'movie'].map(f => (
                <button
                  key={f}
                  style={filter === f ? styles.filterActive : styles.filterBtn}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Todo' : f === 'anime' ? 'Anime' : f === 'series' ? 'Series' : 'Películas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.scanBar}>
          <input
            style={{ ...styles.searchInput, flex: 1 }}
            placeholder="Ruta de carpeta a escanear (ej: /media/Anime)"
            value={scanPath}
            onChange={e => setScanPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <button style={styles.scanBtn} onClick={handleScan}>Escanear</button>
        </div>

        {loading ? (
          <div style={styles.loading}>Cargando biblioteca...</div>
        ) : series.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay series en la biblioteca</p>
            <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Escanea una carpeta para empezar</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {series.map(s => (
              <SeriesCard key={s.id} series={s} onClick={() => handleSelect(s)} />
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 700 },
  controls: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  searchInput: {
    padding: '8px 14px', background: '#1f1f1f', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 14, minWidth: 200,
  },
  filters: { display: 'flex', gap: 4 },
  filterBtn: { padding: '6px 14px', background: '#1f1f1f', color: '#a0a0a0', borderRadius: 20, fontSize: 13 },
  filterActive: { padding: '6px 14px', background: '#e50914', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  scanBar: { display: 'flex', gap: 8 },
  scanBtn: { padding: '8px 20px', background: '#e50914', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
}
