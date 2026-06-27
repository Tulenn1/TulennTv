import { useRef, useEffect, useCallback } from 'react'

interface SubtitleTrack {
  url: string
  label: string
  lang: string
}

interface Props {
  src: string
  subtitles?: SubtitleTrack[]
  activeSubtitle?: number | null
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  autoPlay?: boolean
  initialPosition?: number
  onReady?: () => void
}

export default function Player({ src, subtitles, activeSubtitle, onTimeUpdate, onEnded, autoPlay = true, initialPosition, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.src = src
    if (autoPlay) video.play().catch(() => {})
  }, [src, autoPlay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    Array.from(video.children).forEach(child => {
      if (child.tagName === 'TRACK') child.remove()
    })

    subtitles?.forEach((sub, i) => {
      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = sub.label
      track.srclang = sub.lang
      track.src = sub.url
      if (i === activeSubtitle) track.default = true
      video.appendChild(track)
    })
  }, [subtitles, activeSubtitle])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    Array.from(video.textTracks).forEach(t => {
      t.mode = 'hidden'
    })

    if (activeSubtitle !== null && activeSubtitle !== undefined && video.textTracks[activeSubtitle]) {
      video.textTracks[activeSubtitle].mode = 'showing'
    }
  }, [activeSubtitle, subtitles])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !initialPosition) return

    const handleLoaded = () => {
      if (initialPosition && video.duration > initialPosition) {
        video.currentTime = initialPosition
      }
    }
    video.addEventListener('loadedmetadata', handleLoaded)
    return () => video.removeEventListener('loadedmetadata', handleLoaded)
  }, [initialPosition])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video && onTimeUpdate) {
      onTimeUpdate(video.currentTime, video.duration)
    }
  }, [onTimeUpdate])

  const handleEnded = useCallback(() => {
    onEnded?.()
  }, [onEnded])

  const handleLoadedMetadata = useCallback(() => {
    onReady?.()
  }, [onReady])

  return (
    <video
      ref={videoRef}
      style={styles.video}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      onLoadedMetadata={handleLoadedMetadata}
      playsInline
    />
  )
}

const styles: Record<string, React.CSSProperties> = {
  video: {
    width: '100%', height: '100%', objectFit: 'contain',
    background: '#000',
  },
}
