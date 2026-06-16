import { useRef, useEffect, useCallback } from 'react'

interface Props {
  src: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  autoPlay?: boolean
  initialPosition?: number
  onReady?: () => void
}

export default function Player({ src, onTimeUpdate, onEnded, autoPlay = true, initialPosition, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.src = src
    if (autoPlay) video.play().catch(() => {})
  }, [src, autoPlay])

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
