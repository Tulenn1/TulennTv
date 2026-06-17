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
  const [episodeQueues, setEpisodeQueues] = useState<Record<string, Episode[]>>({})
  const [episodeIndexMap, setEpisodeIndexMap] = useState<Record<string, number>>({})
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [showControls, setShowControls] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
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

  const findEpisodeIndex = (seriesId: string, episodes: Episode[]): number => {
    const saved = episodeIndexMap[seriesId]
    if (saved !== undefined) return saved
    return 0
  }

  const prefetchEpisodes = useCallback(async (seriesId: string) => {
    if (!profile || episodeQueues[seriesId]) return
    try {
      const series = await api.getSeries(seriesId, profile.id)
      if (series?.episodes.length) {
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
        setEpisodeIndexMap(prev => {
          if (prev[seriesId] !== undefined) return prev
          return { ...prev, [seriesId]: epIdx }
        })
      }
    } catch {}
  }, [profile, episodeQueues])

  const changeToChannel = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= channels.length) return
    setCurrentIndex(idx)
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
    setShowGuide(false)

    const seriesId = channels[idx].id
    if (!episodeQueues[seriesId]) {
      await prefetchEpisodes(seriesId)
    }
    const episodes = episodeQueues[seriesId] || []
    const epIdx = findEpisodeIndex(seriesId, episodes)
    setEpisodeIndexMap(prev => ({ ...prev, [seriesId]: epIdx }))
    const ep = episodes[epIdx]
    if (ep) setCurrentEpisode(ep)
  }, [channels, episodeQueues, prefetchEpisodes])

  useEffect(() => {
    if (channels.length === 0 || loading) return
    const seriesId = channels[currentIndex].id
    prefetchEpisodes(seriesId)
  }, [channels, currentIndex, loading, prefetchEpisodes])

  useEffect(() => {
    if (channels.length === 0 || loading) return
    const seriesId = channels[currentIndex].id
    const episodes = episodeQueues[seriesId]
    if (!episodes) return
    const epIdx = findEpisodeIndex(seriesId, episodes)
    const ep = episodes[epIdx]
    if (ep && (!currentEpisode || currentEpisode.id !== ep.id)) {
      setCurrentEpisode(ep)
    }
  }, [channels, currentIndex, episodeQueues, loading, currentEpisode])

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
    const prefetchNearby = async () => {
      if (channels.length < 2) return
      const next = (currentIndex + 1) % channels.length
      const prev = (currentIndex - 1 + channels.length) % channels.length
      await Promise.all([
        prefetchEpisodes(channels[next].id),
        prefetchEpisodes(channels[prev].id),
      ])
    }
    prefetchNearby()
  }, [currentIndex, channels, prefetchEpisodes])

  const advanceEpisode = useCallback(async () => {
    if (!channels[currentIndex]) return
    const seriesId = channels[currentIndex].id
    const currentIdx = episodeIndexMap[seriesId] || 0

    await saveProgress(true)

    setEpisodeIndexMap(prev => ({ ...prev, [seriesId]: currentIdx + 1 }))
    changeChannel(1)
  }, [channels, currentIndex, episodeIndexMap, saveProgress, changeChannel])

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
        initialPosition={undefined}
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

      {showGuide && (
        <div style={styles.guideOverlay}>
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
