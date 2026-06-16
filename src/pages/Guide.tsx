import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Channel, Series } from '../shared/types'

export default function Guide() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [allSeries, setAllSeries] = useState<Record<string, Series>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadGuide = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const chList = await api.getChannels()
      const series = await api.getLibrary(undefined, undefined, profile.id)
      const seriesMap: Record<string, Series> = {}
      for (const s of series) seriesMap[s.id] = s

      setChannels(chList)
      setAllSeries(seriesMap)
    } catch (err) {
      console.error('Failed to load guide:', err)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { loadGuide() }, [loadGuide])

  const visibleChannels = channels.filter(ch => {
    if (!search) return true
    const nameMatch = ch.name.toLowerCase().includes(search.toLowerCase())
    const seriesMatch = ch.seriesIds.some(sid => allSeries[sid]?.title.toLowerCase().includes(search.toLowerCase()))
    return nameMatch || seriesMatch
  })

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
            placeholder="Buscar canales o series..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div style={styles.loading}>Cargando guía...</div>
        ) : visibleChannels.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay canales disponibles</p>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={{ width: 40 }}>#</span>
              <span style={{ flex: 1 }}>Canal</span>
              <span style={{ flex: 2 }}>Series</span>
              <span style={{ width: 100, textAlign: 'center' }}>Acción</span>
            </div>
            {visibleChannels.map((ch, i) => (
              <div key={ch.id} style={styles.tableRow}>
                <span style={{ width: 40, color: '#666', fontSize: 13 }}>{i + 1}</span>
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{ch.icon}</span>
                  {ch.name}
                </span>
                <span style={{ flex: 2, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ch.seriesIds.map(sid => {
                    const s = allSeries[sid]
                    return s ? <span key={sid} style={styles.seriesTag}>{s.title}</span> : null
                  })}
                  {ch.seriesIds.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>Sin series</span>}
                </span>
                <span style={{ width: 100, textAlign: 'center' }}>
                  <button
                    style={styles.sintonizar}
                    onClick={() => {
                      const first = ch.seriesIds[0]
                      if (first) navigate(`/zapper?series=${first}`)
                    }}
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
  sidebar: { width: 200, background: '#141414', padding: 20, display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid #1f1f1f' },
  logo: { fontSize: 20, fontWeight: 800, color: '#e50914' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: { padding: '10px 16px', background: 'transparent', color: '#a0a0a0', borderRadius: 6, textAlign: 'left', fontSize: 14 },
  navBtnActive: { padding: '10px 16px', background: '#1f1f1f', color: '#fff', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 600 },
  main: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: 700 },
  searchInput: { padding: '8px 14px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, minWidth: 250 },
  seriesTag: { padding: '2px 8px', background: '#141414', borderRadius: 10, fontSize: 11, color: '#aaa' },
  table: { display: 'flex', flexDirection: 'column', gap: 2 },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #1f1f1f' },
  tableRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 6, fontSize: 15 },
  sintonizar: { padding: '6px 14px', background: '#e50914', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
}
