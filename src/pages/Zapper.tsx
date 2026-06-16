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
  const [episodeQueue, setEpisodeQueue] = useState<Record<string, Episode[]>>({})
  const [episodeIndex, setEpisodeIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [showControls, setShowControls] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialPos, setInitialPos] = useState<number | undefined>()
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

  const loadEpisodes = useCallback(async (seriesId: string) => {
    if (!profile) return
    try {
      const series = await api.getSeries(seriesId, profile.id)
      if (series && series.episodes.length > 0) {
        setEpisodeQueue(prev => ({ ...prev, [seriesId]: series.episodes }))
        const savedIdx = series.progress
          ? series.episodes.findIndex(e => e.id === series.progress?.episodeId)
          : -1
        const startIdx = savedIdx >= 0 ? savedIdx : 0
        setEpisodeIndex(startIdx)
        const ep = series.episodes[startIdx]
        setCurrentEpisode(ep)
        setInitialPos(savedIdx >= 0 ? series.progress?.position : undefined)
      }
    } catch (err) {
      console.error('Failed to load episodes:', err)
    }
  }, [profile])

  useEffect(() => {
    if (channels.length > 0 && channels[currentIndex]) {
      setCurrentEpisode(null)
      loadEpisodes(channels[currentIndex].id)
    }
  }, [channels, currentIndex, loadEpisodes])

  const currentChannel = channels[currentIndex]
  const queue = currentChannel ? (episodeQueue[currentChannel.id] || []) : []
  const hasNextEpisode = episodeIndex < queue.length - 1

  const changeChannel = useCallback((direction: 1 | -1) => {
    if (channels.length === 0) return
    saveProgress()
    const newIndex = (currentIndex + direction + channels.length) % channels.length
    setCurrentIndex(newIndex)
    setCurrentTime(0)
    setDuration(0)
    setInitialPos(undefined)
    setShowGuide(false)
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
  }, [channels, currentIndex])

  const saveProgress = useCallback(async () => {
    if (!profile || !currentEpisode) return
    try {
      const completed = duration > 0 && currentTime >= duration - 5
      await api.saveProgress(profile.id, currentEpisode.id, currentTime, completed)
    } catch {}
  }, [profile, currentEpisode, currentTime, duration])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setShowControls(true)
      clearTimeout(controlsTimeout.current)
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)

      switch (e.key) {
        case 'ArrowRight':
          changeChannel(1)
          break
        case 'ArrowLeft':
          changeChannel(-1)
          break
        case 'ArrowUp':
          setShowGuide(prev => !prev)
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

  const handleEnded = useCallback(async () => {
    if (hasNextEpisode) {
      const next = queue[episodeIndex + 1]
      setEpisodeIndex(prev => prev + 1)
      setCurrentEpisode(next)
      setCurrentTime(0)
      setDuration(0)
      setInitialPos(undefined)
    } else {
      changeChannel(1)
    }
  }, [hasNextEpisode, queue, episodeIndex, changeChannel])

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
      {currentEpisode ? (
        <Player
          src={getVideoUrl(currentEpisode.path)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          autoPlay={playing}
          initialPosition={initialPos}
        />
      ) : (
        <div style={styles.noVideo}>
          <p>Cargando episodio...</p>
        </div>
      )}

      <ZapperOverlay
        visible={showControls}
        channelName={currentChannel?.title || ''}
        episodeTitle={currentEpisode?.title || ''}
        season={currentEpisode?.season || 0}
        episode={currentEpisode?.episode || 0}
        channelNumber={currentIndex + 1}
        totalChannels={channels.length}
        favorite={(currentChannel as any)?.favorite}
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
      />

      {showGuide && (
        <div style={styles.guideOverlay}>
          <div style={styles.guideHeader}>Guía de Canales</div>
          <div style={styles.guideList}>
            {channels.map((ch, idx) => (
              <button
                key={ch.id}
                style={{
                  ...styles.guideItem,
                  background: idx === currentIndex ? '#e50914' : '#1f1f1f',
                }}
                onClick={() => { setCurrentIndex(idx); setShowGuide(false) }}
              >
                <span style={styles.chNum}>{idx + 1}</span>
                <span style={{ flex: 1 }}>{ch.title}</span>
                {(ch as any).favorite && <span style={{ color: '#ffd700' }}>★</span>}
              </button>
            ))}
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
  noVideo: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#555' },
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
