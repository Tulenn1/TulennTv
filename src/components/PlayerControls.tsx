import { useRef, useState, useEffect } from 'react'

interface Props {
  visible: boolean
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onVolumeChange: (vol: number) => void
  onFullscreen: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function PlayerControls({
  visible, playing, currentTime, duration, volume,
  onPlayPause, onSeek, onVolumeChange, onFullscreen,
}: Props) {
  const progressRef = useRef<HTMLDivElement>(null)
  const [showVolume, setShowVolume] = useState(false)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width
    onSeek(x * duration)
  }

  return (
    <div style={{ ...styles.controls, opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' as React.CSSProperties['pointerEvents'] }}>
      <div style={styles.progressBar} ref={progressRef} onClick={handleProgressClick}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
      <div style={styles.buttons}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={styles.btn} onClick={onPlayPause}>
            {playing ? '⏸' : '▶'}
          </button>
          <span style={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button style={styles.btn} onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}>
              {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            {showVolume && (
              <div style={styles.volumeSlider}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={e => onVolumeChange(parseFloat(e.target.value))}
                  style={{ writingMode: 'horizontal-tb' as const, width: 80 }}
                />
              </div>
            )}
          </div>
          <button style={styles.btn} onClick={onFullscreen}>⛶</button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    padding: '40px 20px 16px', transition: 'opacity 0.3s',
  },
  progressBar: {
    width: '100%', height: 4, background: 'rgba(255,255,255,0.2)',
    borderRadius: 2, cursor: 'pointer', marginBottom: 12,
  },
  progressFill: { height: '100%', background: '#e50914', borderRadius: 2, transition: 'width 0.1s' },
  buttons: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btn: { background: 'transparent', border: 'none', color: '#fff', fontSize: 18, padding: '4px 8px', cursor: 'pointer' },
  time: { fontSize: 13, color: '#a0a0a0', fontVariantNumeric: 'tabular-nums' },
  volumeSlider: {
    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
    background: '#1f1f1f', padding: '8px 12px', borderRadius: 6, marginBottom: 8,
  },
}
