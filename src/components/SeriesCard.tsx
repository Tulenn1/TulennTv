import { useState } from 'react'
import { Series } from '../shared/types'

const COLORS = ['#e50914', '#e87c03', '#46d369', '#0080ff', '#e91e63', '#9c27b0', '#ff5722', '#00bcd4', '#4caf50', '#ff9800']
const TYPE_OPTIONS = ['anime', 'series', 'movie'] as const

function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface Props {
  series: Series
  onClick: () => void
  onDelete?: () => void
  onChangeType?: (type: string) => void
  favorite?: boolean
}

export default function SeriesCard({ series, onClick, onDelete, onChangeType, favorite }: Props) {
  const [showTypes, setShowTypes] = useState(false)
  const bg = hashColor(series.title)

  return (
    <div style={styles.wrapper}>
      <button onClick={onClick} style={styles.card}>
        <div style={styles.thumbnail}>
          {series.poster ? (
            <img src={`/api/poster/${series.id}`} alt={series.title} style={styles.poster}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : null}
          <div style={{ ...styles.placeholder, background: bg, display: series.poster ? 'none' : 'flex' }}>
            <span style={styles.letter}>{series.title.charAt(0).toUpperCase()}</span>
            <span style={styles.typeLabel}>{series.type}</span>
          </div>
          {favorite && <span style={styles.star}>★</span>}
          <button
            style={styles.badge}
            onClick={(e) => { e.stopPropagation(); setShowTypes(!showTypes) }}
            title="Cambiar categoría"
          >
            {series.type}
          </button>
        </div>
        <div style={styles.info}>
          <span style={styles.title}>{series.title}</span>
        </div>
      </button>
      {showTypes && onChangeType && (
        <div style={styles.typeMenu}>
          {TYPE_OPTIONS.map(t => (
            <button
              key={t}
              style={{
                ...styles.typeOption,
                background: series.type === t ? '#e50914' : '#333',
              }}
              onClick={(e) => { e.stopPropagation(); onChangeType(t); setShowTypes(false) }}
            >
              {t === 'anime' ? '🎬' : t === 'series' ? '📺' : '🎥'} {t}
            </button>
          ))}
        </div>
      )}
      {onDelete && (
        <button style={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete() }} title="Eliminar serie">✕</button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative' as const },
  card: {
    background: '#1f1f1f', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
    border: 'none', padding: 0, textAlign: 'left', color: '#fff',
    display: 'block', width: '100%',
  },
  thumbnail: { position: 'relative', width: '100%', aspectRatio: '2/3', background: '#141414' },
  poster: { width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' as const, top: 0, left: 0 },
  placeholder: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  letter: { fontSize: 52, fontWeight: 800, color: 'rgba(255,255,255,0.3)', lineHeight: 1 },
  typeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' as const, letterSpacing: 2 },
  star: { position: 'absolute', top: 8, right: 8, color: '#ffd700', fontSize: 20, zIndex: 1 },
  badge: {
    position: 'absolute', bottom: 8, left: 8, padding: '2px 8px',
    background: 'rgba(0,0,0,0.7)', borderRadius: 4, fontSize: 11,
    color: '#a0a0a0', textTransform: 'uppercase', border: 'none', cursor: 'pointer', zIndex: 1,
  },
  info: { padding: '10px 12px' },
  title: { fontSize: 14, fontWeight: 600, lineHeight: 1.3 },
  deleteBtn: {
    position: 'absolute', top: 6, left: 6, width: 28, height: 28,
    borderRadius: '50%', background: 'rgba(229,9,20,0.85)',
    color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2, opacity: 0.8,
  },
  typeMenu: {
    position: 'absolute', bottom: 40, left: 8, zIndex: 10,
    display: 'flex', flexDirection: 'column', gap: 2,
    background: '#1f1f1f', borderRadius: 6, overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  typeOption: {
    padding: '6px 12px', border: 'none', color: '#fff', fontSize: 12,
    cursor: 'pointer', textAlign: 'left', minWidth: 80,
  },
}
