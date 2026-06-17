import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Series } from '../shared/types'
import SeriesCard from '../components/SeriesCard'

const TYPE_LABELS: Record<string, string> = { anime: 'Anime', series: 'Series', movie: 'Películas' }
const TYPE_ICONS: Record<string, string> = { anime: '🎬', series: '📺', movie: '🎥' }

export default function Library() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [series, setSeries] = useState<Series[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [scanPath, setScanPath] = useState('')
  const [scanType, setScanType] = useState('auto')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLibrary = useCallback(async (): Promise<number> => {
    if (!profile) return 0
    setLoading(true)
    try {
      const type = filter === 'all' ? undefined : filter
      const list = await api.getLibrary(type, search || undefined, profile.id)
      setSeries(list)
      return list.length
    } catch (err) {
      console.error('Failed to load library:', err)
      return 0
    } finally {
      setLoading(false)
    }
  }, [profile, filter, search])

  useEffect(() => { loadLibrary() }, [loadLibrary])

  const grouped = series.reduce<Record<string, Series[]>>((acc, s) => {
    const key = s.type || 'series'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const categoryOrder = ['anime', 'series', 'movie']

  const handleScan = async (path?: string) => {
    const dir = path || scanPath.trim()
    if (!dir) return
    setLoading(true)
    setError('')
    try {
      const type = scanType === 'auto' ? undefined : scanType
      await api.scanDirectory(dir, type)
      setScanPath('')
      const count = await loadLibrary()
      if (count === 0) setError('No se encontraron archivos de video en esa ruta. Formatos soportados: .mp4, .mkv, .avi, .mov, .webm')
    } catch (err) {
      setError(`Error al escanear: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePickFolder = async () => {
    const folder = await api.selectFolder()
    if (folder) handleScan(folder)
  }

  const handleSelect = (s: Series) => {
    navigate(`/zapper?series=${s.id}`)
  }

  const handleDeleteSeries = async (s: Series) => {
    if (!confirm(`¿Eliminar "${s.title}" de la biblioteca?`)) return
    try {
      await api.deleteSeries(s.id)
      await loadLibrary()
    } catch (err) {
      console.error('Failed to delete series:', err)
    }
  }

  const handleChangeType = async (s: Series, newType: string) => {
    try {
      await api.updateSeries(s.id, { type: newType })
      await loadLibrary()
    } catch (err) {
      console.error('Failed to update type:', err)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtnActive}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtn} onClick={() => navigate('/guide')}>Guía</button>
          <button style={styles.navBtn} onClick={() => navigate('/channels')}>Canales</button>
          <button style={styles.navBtn} onClick={() => navigate('/folders')}>Carpetas</button>
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
              {(['all', 'anime', 'series', 'movie'] as const).map(f => (
                <button
                  key={f}
                  style={filter === f ? styles.filterActive : styles.filterBtn}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Todo' : TYPE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.scanBar}>
          <button style={styles.folderBtn} onClick={handlePickFolder}>
            📁 Elegir carpeta
          </button>
          <span style={{ color: '#555', fontSize: 13, alignSelf: 'center' }}>o</span>
          <input
            style={{ ...styles.searchInput, flex: 1 }}
            placeholder="Escribí la ruta manualmente (ej: /media/Anime)"
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
          <button style={styles.scanBtn} onClick={() => handleScan()}>Escanear</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Cargando biblioteca...</div>
        ) : series.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay series en la biblioteca</p>
            <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Escanea una carpeta para empezar</p>
          </div>
        ) : filter !== 'all' ? (
          <div style={styles.grid}>
            {series.map(s => (
              <SeriesCard key={s.id} series={s} onClick={() => handleSelect(s)} onDelete={() => handleDeleteSeries(s)} />
            ))}
          </div>
        ) : (
          <div style={styles.sections}>
            {categoryOrder.map(cat => {
              const items = grouped[cat]
              if (!items?.length) return null
              return (
                <div key={cat}>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionIcon}>{TYPE_ICONS[cat]}</span>
                    <span style={styles.sectionTitle}>{TYPE_LABELS[cat]}</span>
                    <span style={styles.sectionCount}>{items.length} serie{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={styles.grid}>
                    {items.map(s => (
                      <SeriesCard
                        key={s.id}
                        series={s}
                        onClick={() => handleSelect(s)}
                        onDelete={() => handleDeleteSeries(s)}
                        onChangeType={(newType) => handleChangeType(s, newType)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' },
  sidebar: { width: 200, background: '#141414', padding: 20, display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid #1f1f1f' },
  logo: { fontSize: 20, fontWeight: 800, color: '#e50914', letterSpacing: -0.5 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: { padding: '10px 16px', background: 'transparent', color: '#a0a0a0', borderRadius: 6, textAlign: 'left', fontSize: 14 },
  navBtnActive: { padding: '10px 16px', background: '#1f1f1f', color: '#fff', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 600 },
  main: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 700 },
  controls: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  searchInput: { padding: '8px 14px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, minWidth: 200 },
  filters: { display: 'flex', gap: 4 },
  filterBtn: { padding: '6px 14px', background: '#1f1f1f', color: '#a0a0a0', borderRadius: 20, fontSize: 13 },
  filterActive: { padding: '6px 14px', background: '#e50914', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  scanBar: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  folderBtn: { padding: '8px 18px', background: '#1f1f1f', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, border: '1px solid #333', whiteSpace: 'nowrap' as const },
  typeSelect: { padding: '8px 12px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer' },
  scanBtn: { padding: '8px 20px', background: '#e50914', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14 },
  sections: { display: 'flex', flexDirection: 'column', gap: 24 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1f1f1f' },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 700 },
  sectionCount: { fontSize: 13, color: '#888', fontWeight: 400 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 },
  error: { padding: '10px 16px', background: '#2a1010', border: '1px solid #e50914', borderRadius: 8, color: '#f88', fontSize: 13 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
}
