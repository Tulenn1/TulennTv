import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api, getVideoUrl, getSubtitleUrl } from '../lib/api'
import { Channel, SeriesWithEpisodes, Episode } from '../shared/types'
import Player from '../components/Player'
import PlayerControls from '../components/PlayerControls'
import ZapperOverlay from '../components/ZapperOverlay'

export default function Zapper() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelData, setChannelData] = useState<Record<string, SeriesWithEpisodes[]>>({})
  const [currentChannelIdx, setCurrentChannelIdx] = useState(0)
  const [currentSeriesIdx, setCurrentSeriesIdx] = useState<Record<string, number>>({})
  const [episodeIdx, setEpisodeIdx] = useState<Record<string, number>>({})
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [initialPos, setInitialPos] = useState<number | undefined>()
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
  const advanceEpisodeRef = useRef<() => Promise<void>>(async () => {})
  const [subtitleTracks, setSubtitleTracks] = useState<{ url: string; label: string; lang: string }[]>([])
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null)

  const currentChannel = channels[currentChannelIdx]
  const currentSeriesList = channelData[currentChannel?.id] || []
  const seriesIdx = currentSeriesIdx[currentChannel?.id] ?? 0
  const currentSeries = currentSeriesList[seriesIdx]
  const epList = currentSeries?.episodes || []
  const epIndex = episodeIdx[currentSeries?.id] ?? 0

  const loadChannels = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const [chList, library] = await Promise.all([
        api.getChannels(),
        api.getLibrary(undefined, undefined, profile.id),
      ])

      if (chList.length === 0) {
        setChannels([])
        setLoading(false)
        return
      }
      setChannels(chList)

      const libMap: Record<string, SeriesWithEpisodes> = {}
      const detailPromises = library.map(s => api.getSeries(s.id, profile.id).then(d => { if (d) libMap[s.id] = d }))
      await Promise.all(detailPromises)

      const data: Record<string, SeriesWithEpisodes[]> = {}
      const initialSeriesId = searchParams.get('series')
      const initialEpisodeId = searchParams.get('episode')
      let targetChannelIdx = 0
      let targetSeriesIdx = 0
      const initialEpisodeIdx: Record<string, number> = {}

      for (let ci = 0; ci < chList.length; ci++) {
        const ch = chList[ci]
        data[ch.id] = ch.seriesIds.map(sid => libMap[sid]).filter(Boolean) as SeriesWithEpisodes[]

        if (initialSeriesId && ch.seriesIds.includes(initialSeriesId)) {
          targetChannelIdx = ci
          targetSeriesIdx = ch.seriesIds.indexOf(initialSeriesId)
          const series = libMap[initialSeriesId]
          if (series && initialEpisodeId) {
            const epIdx = series.episodes.findIndex(e => e.id === initialEpisodeId)
            if (epIdx >= 0) initialEpisodeIdx[initialSeriesId] = epIdx
          }
        }
      }

      setChannelData(data)
      setCurrentChannelIdx(targetChannelIdx)
      setCurrentSeriesIdx({ [chList[targetChannelIdx].id]: targetSeriesIdx })
      if (Object.keys(initialEpisodeIdx).length > 0) setEpisodeIdx(initialEpisodeIdx)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile, searchParams])

  useEffect(() => { loadChannels() }, [loadChannels])

  const channelDataRef = useRef(channelData)
  channelDataRef.current = channelData
  const channelIdxRef = useRef(currentChannelIdx)
  channelIdxRef.current = currentChannelIdx
  const seriesIdxRef = useRef(currentSeriesIdx)
  seriesIdxRef.current = currentSeriesIdx
  const epIdxRef = useRef(episodeIdx)
  epIdxRef.current = episodeIdx

  useEffect(() => {
    if (!currentChannel || loading) return
    const sIdx = currentSeriesIdx[currentChannel.id] ?? 0
    const list = channelDataRef.current[currentChannel.id] || []
    const series = list[sIdx]
    if (!series?.episodes.length) return

    const lastEpIdx = episodeIdx[series.id] ?? 0
    const ep = series.episodes[lastEpIdx] || series.episodes[0]
    setCurrentEpisode(ep)

    const progress = (series as any).progress
    setInitialPos(progress && !progress.completed ? progress.position : undefined)
  }, [currentChannel?.id, currentSeriesIdx, loading])

  const changeChannel = useCallback((dir: 1 | -1) => {
    if (channels.length === 0) return
    const next = (currentChannelIdx + dir + channels.length) % channels.length
    setCurrentChannelIdx(next)
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
    setShowGuide(false)
    setShowInfo(false)
    setCurrentEpisode(null)
  }, [channels, currentChannelIdx])

  const changeSeries = useCallback((dir: 1 | -1) => {
    if (!currentChannel) return
    const list = channelData[currentChannel.id] || []
    if (list.length === 0) return
    const current = currentSeriesIdx[currentChannel.id] ?? 0
    const next = (current + dir + list.length) % list.length
    setCurrentSeriesIdx(prev => ({ ...prev, [currentChannel.id]: next }))
    setCurrentEpisode(null)
    setInitialPos(undefined)
  }, [currentChannel, channelData, currentSeriesIdx])

  const changeEpisode = useCallback((dir: 1 | -1) => {
    const chId = channels[channelIdxRef.current]?.id
    if (!chId) return
    const list = channelDataRef.current[chId] || []
    const sIdx = seriesIdxRef.current[chId] ?? 0
    const series = list[sIdx]
    if (!series?.episodes.length) return
    const current = epIdxRef.current[series.id] ?? 0
    const next = current + dir
    if (next < 0 || next >= series.episodes.length) return
    setEpisodeIdx(prev => ({ ...prev, [series.id]: next }))
    setCurrentEpisode(series.episodes[next])
    setInitialPos(undefined)
  }, [channels])

  const profileRef = useRef(profile)
  profileRef.current = profile
  const currentEpisodeRef = useRef(currentEpisode)
  currentEpisodeRef.current = currentEpisode
  const timeRef = useRef({ currentTime: 0, duration: 0 })
  timeRef.current = { currentTime, duration }

  const saveProgress = useCallback(async (completed?: boolean) => {
    const p = profileRef.current
    const ep = currentEpisodeRef.current
    const t = timeRef.current
    if (!p || !ep) return
    try {
      const isCompleted = completed ?? (t.duration > 0 && t.currentTime >= t.duration - 5)
      await api.saveProgress(p.id, ep.id, t.currentTime, isCompleted)
    } catch {}
  }, [])

  useEffect(() => {
    let currentId = ''
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
          changeChannel(-1)
          break
        case 'ArrowDown':
          changeChannel(1)
          break
        case ' ':
          e.preventDefault()
          setPlaying(p => !p)
          if (playerRef.current) {
            playerRef.current.paused ? playerRef.current.play() : playerRef.current.pause()
          }
          break
        case 'f':
        case 'F':
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen()
          break
        case 'g':
        case 'G':
          setShowGuide(prev => !prev)
          setShowInfo(false)
          break
        case 'i':
        case 'I':
          setShowInfo(prev => !prev)
          setShowGuide(false)
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
    }
  }, [changeChannel, changeEpisode, saveProgress, navigate])

  useEffect(() => {
    if (channels.length < 2) return
    const data = channelDataRef.current
    setEpisodeIdx(prev => {
      let changed = false
      const next = { ...prev }
      for (const ch of channels) {
        for (const s of data[ch.id] || []) {
          if (next[s.id] === undefined) {
            next[s.id] = 0
            changed = true
          }
        }
      }
      return changed ? next : prev
    })
  }, [channels])

  const advanceEpisode = useCallback(async () => {
    await saveProgress(true)

    const chId = channels[channelIdxRef.current]?.id
    if (!chId) return
    const list = channelDataRef.current[chId] || []
    const sIdx = seriesIdxRef.current[chId] ?? 0
    const series = list[sIdx]
    if (series) {
      const eIdx = epIdxRef.current[series.id] ?? 0
      if (eIdx + 1 < series.episodes.length) {
        setEpisodeIdx(prev => ({ ...prev, [series.id]: eIdx + 1 }))
      }
    }
    if (list.length > 0) {
      setCurrentSeriesIdx(prev => ({ ...prev, [chId]: (sIdx + 1) % list.length }))
    }
  }, [saveProgress, channels])

  advanceEpisodeRef.current = advanceEpisode

  const handleEnded = useCallback(() => {
    advanceEpisodeRef.current()
  }, [])

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
    const video = playerRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [])

  useEffect(() => {
    if (!currentEpisode?.subtitles) {
      setSubtitleTracks([])
      setActiveSubtitle(null)
      return
    }
    try {
      const paths: string[] = JSON.parse(currentEpisode.subtitles)
      const tracks = paths.map((_, i) => ({
        url: getSubtitleUrl(currentEpisode.id, i),
        label: `Subs ${i + 1}`,
        lang: 'es',
      }))
      setSubtitleTracks(tracks)
      setActiveSubtitle(tracks.length > 0 ? 0 : null)
    } catch {
      setSubtitleTracks([])
      setActiveSubtitle(null)
    }
  }, [currentEpisode])

  useEffect(() => {
    if (!showInfo || !currentSeries) return
    api.getSeriesOverview(currentSeries.id).then(setOverview)
  }, [showInfo, currentSeries?.id])

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

  const totalEpsInSeries = currentSeries?.episodes?.length || 0
  const nextEps = (() => {
    if (!currentSeries || !epList.length) return undefined
    const idx = episodeIdx[currentSeries.id] ?? 0
    if (idx >= epList.length - 1) return undefined
    return epList.slice(idx + 1, idx + 4).map(e => ({
      title: e.title,
      season: e.season,
      episode: e.episode,
    }))
  })()

  return (
    <div style={styles.container} onMouseMove={() => {
      setShowControls(true)
      clearTimeout(controlsTimeout.current)
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
    }}>
      <Player
        src={currentEpisode ? getVideoUrl(currentEpisode.path) : ''}
        subtitles={subtitleTracks}
        activeSubtitle={activeSubtitle}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        autoPlay={playing}
        initialPosition={initialPos}
      />

      <ZapperOverlay
        visible={showControls}
        channelName={currentChannel?.name || ''}
        channelIcon={currentChannel?.icon || ''}
        episodeTitle={currentEpisode?.title || ''}
        season={currentEpisode?.season || 0}
        episode={currentEpisode?.episode || 0}
        channelNumber={currentChannelIdx + 1}
        totalChannels={channels.length}
        totalEpisodes={totalEpsInSeries}
        currentEpisodeIndex={(episodeIdx[currentSeries?.id] ?? 0) + 1}
        seriesName={currentSeries?.title || ''}
        currentSeriesIndex={seriesIdx + 1}
        totalSeries={currentSeriesList.length}
        nextEpisodes={nextEps}
      />

      <PlayerControls
        visible={showControls}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        subtitles={subtitleTracks.map((_, i) => ({ index: i, label: `Subs ${i + 1}` }))}
        activeSubtitle={activeSubtitle}
        onPlayPause={handleTogglePlay}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onFullscreen={() => {
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen()
        }}
        onMenu={() => navigate('/library')}
        onSubtitleChange={setActiveSubtitle}
      />

      {showInfo && (
        <div style={styles.infoOverlay} onClick={() => setShowInfo(false)}>
          <div style={styles.infoPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.infoHeader}>
              <span>{currentSeries?.title || currentChannel?.name}</span>
              <button style={styles.closeBtn} onClick={() => setShowInfo(false)}>✕</button>
            </div>
            {overview ? (
              <p style={styles.infoText}>{overview}</p>
            ) : (
              <p style={{ ...styles.infoText, color: '#666' }}>Cargando información...</p>
            )}
            <div style={styles.infoMeta}>
              <span>{currentSeries?.type}</span>
              <span>{totalEpsInSeries} episodios</span>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="guideOverlay" style={styles.guideOverlay}>
          <div style={styles.guideHeader}>Guía de Canales</div>
          <div style={styles.guideList}>
            {channels.map((ch, ci) => {
              const list = channelData[ch.id] || []
              const sIdx = currentSeriesIdx[ch.id] ?? 0
              const currentS = list[sIdx]
              return (
                <button
                  key={ch.id}
                  style={{
                    ...styles.guideItem,
                    background: ci === currentChannelIdx ? '#e50914' : 'var(--bg-card)',
                  }}
                  onClick={() => {
                    setCurrentChannelIdx(ci)
                    setShowGuide(false)
                    setCurrentEpisode(null)
                  }}
                >
                  <span style={styles.chNum}>{ci + 1}</span>
                  <span style={{ fontSize: 16 }}>{ch.icon}</span>
                  <span style={{ flex: 1 }}>{ch.name}</span>
                  {currentS && <span style={{ fontSize: 11, color: '#aaa' }}>{currentS.title}</span>}
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
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' },
  goBtn: { marginTop: 16, padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, border: 'none' },
  infoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 200, padding: 40,
  },
  infoPanel: {
    background: 'var(--bg-card)', borderRadius: 12, maxWidth: 500, width: '100%',
    padding: 24, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12,
  },
  infoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' },
  infoText: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 },
  infoMeta: { display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 12 },
  guideOverlay: {
    position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
    background: 'rgba(10,10,10,0.95)', borderRadius: 12, display: 'flex', flexDirection: 'column',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  guideHeader: { padding: '16px 20px', fontSize: 20, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--border)' },
  guideList: { flex: 1, overflow: 'auto', padding: 8 },
  guideItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: 'none', color: '#fff', borderRadius: 6, width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 15 },
  chNum: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', fontSize: 12, fontWeight: 600 },
}
