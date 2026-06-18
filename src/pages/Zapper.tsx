import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api, getVideoUrl } from '../lib/api'
import { Series, Episode } from '../shared/types'
import Player from '../components/Player'
import PlayerControls from '../components/PlayerControls'
import ZapperOverlay from '../components/ZapperOverlay'

export default function Zapper() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [channels, setChannels] = useState<Series[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [initialPos, setInitialPos] = useState<number | undefined>()
  const [episodeQueues, setEpisodeQueues] = useState<Record<string, Episode[]>>({})
  const [episodeIndexMap, setEpisodeIndexMap] = useState<Record<string, number>>({})
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [showControls, setShowControls] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [overview, setOverview] = useState('')
  const [loading, setLoading] = useState(true)
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>()
  const playerRef = useRef<HTMLVideoElement>(null)

  const loadChannels = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const favIds = await api.getFavorites(profile.id)
      const list = await api.getLibrary(undefined, undefined, profile.id)
      const withFav = list.map(s => ({ ...s, favorite: favIds.includes(s.id) }))
      withFav.sort((a, b) => {
        if ((a as any).favorite && !(b as any).favorite) return -1
        if (!(a as any).favorite && (b as any).favorite) return 1
        return a.title.localeCompare(b.title)
      })
      setChannels(withFav)

      const initialSeriesId = searchParams.get('series')
      if (initialSeriesId) {
        const idx = withFav.findIndex(s => s.id === initialSeriesId)
        if (idx >= 0) setCurrentIndex(idx)
      }
    } catch (err) {
      console.error('Failed to load channels:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, searchParams])

  useEffect(() => { loadChannels() }, [loadChannels])

  const loadAndPlay = useCallback(async (seriesId: string) => {
    if (!profile) return
    try {
      const series = await api.getSeries(seriesId, profile.id)
      if (!series?.episodes.length) return

      setEpisodeQueues(prev => ({ ...prev, [seriesId]: series.episodes }))

      const progress = series.progress
      let epIdx = 0
      if (progress) {
        if (progress.completed) {
          epIdx = series.episodes.findIndex(e => e.id !== progress.episodeId)
          if (epIdx < 0) epIdx = 0
        } else {
          epIdx = series.episodes.findIndex(e => e.id === progress.episodeId)
          if (epIdx < 0) epIdx = 0
        }
      }

      setEpisodeIndexMap(prev => ({ ...prev, [seriesId]: epIdx }))
      setCurrentEpisode(series.episodes[epIdx])
      setInitialPos(progress && !progress.completed ? progress.position : undefined)
    } catch {}
  }, [profile])

  useEffect(() => {
    if (channels.length === 0 || loading) return
    const seriesId = channels[currentIndex].id
    loadAndPlay(seriesId)
  }, [channels, currentIndex, loading, loadAndPlay])

  const changeToChannel = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= channels.length) return
    const seriesId = channels[idx].id
    setCurrentIndex(idx)
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
    setShowGuide(false)

    if (episodeQueues[seriesId]) {
      const epIdx = episodeIndexMap[seriesId] ?? 0
      const ep = episodeQueues[seriesId]?.[epIdx]
      if (ep) setCurrentEpisode(ep)
    }
  }, [channels, episodeQueues, episodeIndexMap])

  const changeEpisode = useCallback((direction: 1 | -1) => {
    if (!channels[currentIndex]) return
    const seriesId = channels[currentIndex].id
    const episodes = episodeQueues[seriesId]
    if (!episodes?.length) return
    const currentIdx = episodeIndexMap[seriesId] || 0
    const nextIdx = currentIdx + direction
    if (nextIdx < 0 || nextIdx >= episodes.length) return
    setEpisodeIndexMap(prev => ({ ...prev, [seriesId]: nextIdx }))
    setCurrentEpisode(episodes[nextIdx])
    setInitialPos(undefined)
  }, [channels, currentIndex, episodeQueues, episodeIndexMap])

  const changeChannel = useCallback((direction: 1 | -1) => {
    if (channels.length === 0) return
    const newIndex = (currentIndex + direction + channels.length) % channels.length
    changeToChannel(newIndex)
  }, [channels, currentIndex, changeToChannel])

  const saveProgress = useCallback(async (completed?: boolean) => {
    if (!profile || !currentEpisode) return
    try {
      const isCompleted = completed ?? (duration > 0 && currentTime >= duration - 5)
      await api.saveProgress(profile.id, currentEpisode.id, currentTime, isCompleted)
    } catch {}
  }, [profile, currentEpisode, currentTime, duration])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setShowControls(true)
      clearTimeout(controlsTimeout.current)
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)

      switch (e.key) {
        case 'ArrowRight':
          changeEpisode(1)
          break
        case 'ArrowLeft':
          changeEpisode(-1)
          break
        case 'ArrowUp':
          setShowGuide(prev => !prev)
          setShowInfo(false)
          break
        case 'ArrowDown':
          setShowInfo(prev => !prev)
          setShowGuide(false)
          if (!overview && channels[currentIndex]) {
            api.getSeriesOverview(channels[currentIndex].id).then(setOverview)
          }
          break
        case ' ':
          e.preventDefault()
          setPlaying(p => !p)
          if (playerRef.current) {
            playing ? playerRef.current.pause() : playerRef.current.play()
          }
          break
        case 'f':
        case 'F':
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen()
          break
        case 'Escape':
          saveProgress()
          navigate('/library')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(controlsTimeout.current)
      saveProgress()
    }
  }, [changeChannel, playing, navigate, saveProgress])

  useEffect(() => {
    if (channels.length < 2) return
    const next = (currentIndex + 1) % channels.length
    const prev = (currentIndex - 1 + channels.length) % channels.length
    loadAndPlay(channels[next].id)
    loadAndPlay(channels[prev].id)
  }, [currentIndex, channels, loadAndPlay])

  const advanceEpisode = useCallback(async () => {
    if (!channels[currentIndex]) return
    const seriesId = channels[currentIndex].id
    const episodes = episodeQueues[seriesId]
    const currentIdx = episodeIndexMap[seriesId] || 0

    await saveProgress(true)

    const nextIdx = currentIdx + 1
    if (episodes && nextIdx < episodes.length) {
      setEpisodeIndexMap(prev => ({ ...prev, [seriesId]: nextIdx }))
      setCurrentEpisode(episodes[nextIdx])
    } else {
      changeChannel(1)
    }
  }, [channels, currentIndex, episodeQueues, episodeIndexMap, saveProgress, changeChannel])

  const handleEnded = useCallback(() => {
    advanceEpisode()
  }, [advanceEpisode])

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time)
    setDuration(dur)
  }, [])

  const handleSeek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleTogglePlay = useCallback(() => {
    setPlaying(p => !p)
    if (playerRef.current) {
      playing ? playerRef.current.pause() : playerRef.current.play()
    }
  }, [playing])

  if (loading) {
    return <div style={styles.loading}>Cargando canales...</div>
  }

  if (channels.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ fontSize: 22, color: '#a0a0a0' }}>No hay canales disponibles</p>
        <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Agrega series desde la biblioteca primero</p>
        <button style={styles.goBtn} onClick={() => navigate('/library')}>Ir a Biblioteca</button>
      </div>
    )
  }

  return (
    <div style={styles.container} onMouseMove={() => {
      setShowControls(true)
      clearTimeout(controlsTimeout.current)
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
    }}>
      <Player
        src={currentEpisode ? getVideoUrl(currentEpisode.path) : ''}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        autoPlay={playing}
        initialPosition={initialPos}
      />

      <ZapperOverlay
        visible={showControls}
        channelName={channels[currentIndex]?.title || ''}
        episodeTitle={currentEpisode?.title || ''}
        season={currentEpisode?.season || 0}
        episode={currentEpisode?.episode || 0}
        channelNumber={currentIndex + 1}
        totalChannels={channels.length}
        favorite={(channels[currentIndex] as any)?.favorite}
        totalEpisodes={episodeQueues[channels[currentIndex]?.id]?.length}
        currentEpisodeIndex={episodeIndexMap[channels[currentIndex]?.id] ?? 0}
      />

      <PlayerControls
        visible={showControls}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onPlayPause={handleTogglePlay}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onFullscreen={() => {
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen()
        }}
        onMenu={() => navigate('/library')}
      />

      {showInfo && (
        <div style={styles.infoOverlay} onClick={() => setShowInfo(false)}>
          <div style={styles.infoPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.infoHeader}>
              <span>{channels[currentIndex]?.title}</span>
              <button style={styles.closeBtn} onClick={() => setShowInfo(false)}>✕</button>
            </div>
            {overview ? (
              <p style={styles.infoText}>{overview}</p>
            ) : (
              <p style={{ ...styles.infoText, color: '#666' }}>Cargando información...</p>
            )}
            <div style={styles.infoMeta}>
              <span>{channels[currentIndex]?.type}</span>
              <span>{episodeQueues[channels[currentIndex]?.id]?.length || 0} episodios</span>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="guideOverlay" style={styles.guideOverlay}>
          <div style={styles.guideHeader}>Guía de Canales</div>
          <div style={styles.guideList}>
            {channels.map((ch, idx) => {
              const epIdx = episodeIndexMap[ch.id] || 0
              const epList = episodeQueues[ch.id] || []
              const currentEp = epList[epIdx]
              return (
                <button
                  key={ch.id}
                  style={{
                    ...styles.guideItem,
                    background: idx === currentIndex ? '#e50914' : '#1f1f1f',
                  }}
                  onClick={() => changeToChannel(idx)}
                >
                  <span style={styles.chNum}>{idx + 1}</span>
                  <span style={{ flex: 1 }}>{ch.title}</span>
                  {(ch as any).favorite && <span style={{ color: '#ffd700', marginRight: 8 }}>★</span>}
                  {currentEp && <span style={{ fontSize: 11, color: '#aaa' }}>Ep {currentEp.episode}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#a0a0a0' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' },
  goBtn: { marginTop: 16, padding: '10px 24px', background: '#e50914', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14 },
  infoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 200, padding: 40,
  },
  infoPanel: {
    background: '#1a1a1a', borderRadius: 12, maxWidth: 500, width: '100%',
    padding: 24, border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 12,
  },
  infoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 },
  closeBtn: { background: 'transparent', border: 'none', color: '#a0a0a0', fontSize: 18, cursor: 'pointer' },
  infoText: { fontSize: 14, color: '#ccc', lineHeight: 1.7, margin: 0 },
  infoMeta: { display: 'flex', gap: 16, fontSize: 12, color: '#888', borderTop: '1px solid #333', paddingTop: 12 },
  guideOverlay: {
    position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
    background: 'rgba(10,10,10,0.95)', borderRadius: 12, display: 'flex', flexDirection: 'column',
    border: '1px solid #333', overflow: 'hidden',
  },
  guideHeader: { padding: '16px 20px', fontSize: 20, fontWeight: 700, color: '#e50914', borderBottom: '1px solid #333' },
  guideList: { flex: 1, overflow: 'auto', padding: 8 },
  guideItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: 'none', color: '#fff', borderRadius: 6, width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 15 },
  chNum: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', fontSize: 12, fontWeight: 600 },
}
