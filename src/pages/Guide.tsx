import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Channel, Series, SeriesWithEpisodes } from '../shared/types'

const SLOT_MINUTES = 30
const HOURS_RANGE = 4

interface Program {
  seriesTitle: string
  episodeTitle: string
  episodeNum: number
  startMin: number
  endMin: number
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function generateProgram(
  seriesList: { title: string; episodes: { title: string; episode: number }[] }[],
  startMinute: number
): Program[] {
  let current = startMinute
  const result: Program[] = []

  for (const s of seriesList) {
    for (const ep of s.episodes) {
      result.push({
        seriesTitle: s.title,
        episodeTitle: ep.title,
        episodeNum: ep.episode,
        startMin: current,
        endMin: current + SLOT_MINUTES,
      })
      current += SLOT_MINUTES
    }
  }
  return result
}

function findNowSlot(programs: Program[], nowMin: number): number {
  return programs.findIndex(p => nowMin >= p.startMin && nowMin < p.endMin)
}

export default function Guide() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [allSeries, setAllSeries] = useState<Record<string, SeriesWithEpisodes>>({})
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [loading, setLoading] = useState(true)
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  useEffect(() => {
    const tick = () => {
      const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes())
    }
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  const gridStart = Math.floor(nowMin / SLOT_MINUTES) * SLOT_MINUTES
  const totalSlots = Math.ceil((HOURS_RANGE * 60) / SLOT_MINUTES)
  const gridRef = useRef<HTMLDivElement>(null)

  const loadGuide = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const chList = await api.getChannels()
      const series = await api.getLibrary(undefined, undefined, profile.id)
      const seriesMap: Record<string, SeriesWithEpisodes> = {}
      for (const s of series) {
        const detail = await api.getSeries(s.id, profile.id)
        if (detail) seriesMap[s.id] = detail
      }
      setChannels(chList)
      setAllSeries(seriesMap)
    } catch (err) {
      console.error(err)
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

  const timeLabels: string[] = []
  for (let i = 0; i <= totalSlots; i++) {
    timeLabels.push(formatTime(gridStart + i * SLOT_MINUTES))
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar} className="sidebar">
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigate('/library')}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtnActive}>Guía</button>
          <button style={styles.navBtn} onClick={() => navigate('/channels')}>Canales</button>
          <button style={styles.navBtn} onClick={() => navigate('/folders')}>Carpetas</button>
          <button style={styles.navBtn} onClick={() => navigate('/tv-connect')}>Conectar</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>
          {profile?.name} {profile?.avatar}
        </div>
      </div>
      <div style={styles.main} className="main">
        <div className="header" style={styles.header}>
          <h1 style={styles.title}>Guía de Canales</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={styles.searchInput}
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={styles.viewToggle}>
              <button
                style={view === 'list' ? styles.viewActive : styles.viewBtn}
                onClick={() => setView('list')}
              >Lista</button>
              <button
                style={view === 'grid' ? styles.viewActive : styles.viewBtn}
                onClick={() => setView('grid')}
              >Grilla</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>Cargando...</div>
        ) : visibleChannels.length === 0 ? (
          <div style={styles.empty}><p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay canales</p></div>
        ) : view === 'list' ? (
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
                  <span style={{ fontSize: 18 }}>{ch.icon}</span> {ch.name}
                </span>
                <span style={{ flex: 2, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ch.seriesIds.map(sid => {
                    const s = allSeries[sid]
                    return s ? <span key={sid} style={styles.seriesTag}>{s.title}</span> : null
                  })}
                  {ch.seriesIds.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>Sin series</span>}
                </span>
                <span style={{ width: 100, textAlign: 'center' }}>
                  <button style={styles.sintonizar} onClick={() => {
                    const first = ch.seriesIds[0]
                    if (first) navigate(`/zapper?series=${first}`)
                  }}>Sintonizar</button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.gridWrapper} ref={gridRef}>
            <div style={{ ...styles.grid, width: totalSlots * 140 + 180 }}>
              <div style={styles.gridHeader}>
                <div style={styles.gridCorner}>Canal</div>
                {timeLabels.map((t, i) => (
                  <div key={i} style={styles.timeSlot}>
                    {t}
                    {i < totalSlots && nowMin >= gridStart + i * SLOT_MINUTES && nowMin < gridStart + (i + 1) * SLOT_MINUTES && (
                      <div style={styles.nowTick} />
                    )}
                  </div>
                ))}
              </div>
              {visibleChannels.map(ch => {
                const seriesList = ch.seriesIds
                  .map(sid => allSeries[sid])
                  .filter(Boolean)
                  .map(s => ({ title: s!.title, episodes: s!.episodes }))
                const program = generateProgram(seriesList, gridStart)
                const nowSlot = findNowSlot(program, nowMin)

                return (
                  <div key={ch.id} style={styles.gridRow}>
                    <div style={styles.channelLabel}>
                      <span>{ch.icon}</span>
                      <span style={{ fontSize: 12 }}>{ch.name}</span>
                    </div>
                    <div style={styles.programRow}>
                      {program.map((p, i) => {
                        const left = ((p.startMin - gridStart) / (HOURS_RANGE * 60)) * 100
                        const width = ((p.endMin - p.startMin) / (HOURS_RANGE * 60)) * 100
                        const isNow = nowSlot === i
                        return (
                          <div
                            key={i}
                            style={{
                              ...styles.programBlock,
                              left: `${left}%`,
                              width: `${width}%`,
                              background: isNow ? '#e50914' : '#1f1f1f',
                            }}
                            title={`${p.seriesTitle} - ${p.episodeTitle}`}
                          >
                            <span style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.seriesTitle}
                            </span>
                            <span style={{ fontSize: 9, color: isNow ? '#fff' : '#888' }}>Ep {p.episodeNum}</span>
                          </div>
                        )
                      })}
                      <div style={{ ...styles.nowLine, left: `${((nowMin - gridStart) / (HOURS_RANGE * 60)) * 100}%` }}>
                        <div style={styles.nowArrow} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { fontSize: 28, fontWeight: 700 },
  searchInput: { padding: '8px 14px', background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, minWidth: 200 },
  viewToggle: { display: 'flex', background: '#1f1f1f', borderRadius: 6, overflow: 'hidden' },
  viewBtn: { padding: '6px 14px', background: 'transparent', color: '#888', border: 'none', fontSize: 13, cursor: 'pointer' },
  viewActive: { padding: '6px 14px', background: '#e50914', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  seriesTag: { padding: '2px 8px', background: '#141414', borderRadius: 10, fontSize: 11, color: '#aaa' },
  table: { display: 'flex', flexDirection: 'column', gap: 2 },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #1f1f1f' },
  tableRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 6, fontSize: 15 },
  sintonizar: { padding: '6px 14px', background: '#e50914', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
  // Grid styles
  gridWrapper: { overflow: 'auto', flex: 1, borderRadius: 8 },
  grid: { minWidth: 600 },
  gridHeader: { display: 'flex', borderBottom: '1px solid #333', height: 40 },
  gridCorner: { width: 180, flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 12, color: '#666', fontWeight: 600 },
  timeSlot: { width: 140, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888', borderLeft: '1px solid #222' },
  nowTick: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, background: '#e50914', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nowLine: { position: 'absolute', top: 0, bottom: 0, width: 2, background: '#e50914', zIndex: 10, pointerEvents: 'none' as const },
  nowArrow: { position: 'absolute', top: -6, left: -5, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #e50914' },
  gridRow: { display: 'flex', height: 64, borderBottom: '1px solid #141414' },
  channelLabel: { width: 180, flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, background: '#141414' },
  programRow: { flex: 1, position: 'relative', overflow: 'visible' as const },
  programBlock: {
    position: 'absolute', top: 4, bottom: 4, borderRadius: 4, padding: '2px 6px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1,
    cursor: 'pointer', overflow: 'hidden',
  },
}
