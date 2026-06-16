import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Series, SeriesWithEpisodes } from '../shared/types'

export default function Guide() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<(Series & { favorite: boolean; currentEpisode?: string })[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadGuide = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const list = await api.getLibrary(undefined, search || undefined, profile.id) as (Series & { favorite?: boolean })[]
      const withDetails = await Promise.all(
        list.map(async (s) => {
          const fav = !!(s as any).favorite
          try {
            const series = await api.getSeries(s.id, profile.id)
            const firstEp = series?.episodes[0]
            return {
              ...s, favorite: fav,
              currentEpisode: firstEp ? `S${firstEp.season} E${firstEp.episode} - ${firstEp.title}` : 'Sin episodios',
            }
          } catch {
            return { ...s, favorite: fav, currentEpisode: 'Sin episodios' }
          }
        })
      )
      withDetails.sort((a, b) => {
        if (a.favorite && !b.favorite) return -1
        if (!a.favorite && b.favorite) return 1
        return a.title.localeCompare(b.title)
      })
      setChannels(withDetails)
    } catch (err) {
      console.error('Failed to load guide:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, search])

  useEffect(() => { loadGuide() }, [loadGuide])

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigate('/library')}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtnActive}>Guía</button>
          <button style={styles.navBtn} onClick={() => navigate('/channels')}>Canales</button>
          <button style={styles.navBtn} onClick={() => navigate('/folders')}>Carpetas</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>
          {profile?.name} {profile?.avatar}
        </div>
      </div>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Guía de Canales</h1>
          <input
            style={styles.searchInput}
            placeholder="Buscar canales..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div style={styles.loading}>Cargando guía...</div>
        ) : channels.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay canales disponibles</p>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={{ width: 40 }}>#</span>
              <span style={{ flex: 1 }}>Canal</span>
              <span style={{ flex: 2 }}>Ahora en emisión</span>
              <span style={{ width: 80, textAlign: 'center' }}>Acción</span>
            </div>
            {channels.map((ch, i) => (
              <div key={ch.id} style={styles.tableRow}>
                <span style={{ width: 40, color: '#666', fontSize: 13 }}>{i + 1}</span>
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ch.favorite && <span style={{ color: '#ffd700' }}>★</span>}
                  {ch.title}
                </span>
                <span style={{ flex: 2, color: '#a0a0a0', fontSize: 14 }}>{ch.currentEpisode}</span>
                <span style={{ width: 80, textAlign: 'center' }}>
                  <button
                    style={styles.sintonizar}
                    onClick={() => navigate(`/zapper?series=${ch.id}`)}
                  >
                    Sintonizar
                  </button>
                </span>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: 700 },
  searchInput: { padding: '8px 14px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, minWidth: 250 },
  table: { display: 'flex', flexDirection: 'column', gap: 2 },
  tableHeader: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
    color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
    borderBottom: '1px solid #1f1f1f',
  },
  tableRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    borderRadius: 6, transition: 'background 0.2s', fontSize: 15,
  },
  sintonizar: {
    padding: '6px 14px', background: '#e50914', color: '#fff',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
  },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
}
