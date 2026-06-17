import { Series } from '../shared/types'

interface Props {
  series: Series
  onClick: () => void
  onDelete?: () => void
  favorite?: boolean
}

export default function SeriesCard({ series, onClick, onDelete, favorite }: Props) {
  return (
    <div style={styles.wrapper}>
      <button onClick={onClick} style={styles.card}>
        <div style={styles.thumbnail}>
          {series.poster ? (
            <img src={series.poster} alt={series.title} style={styles.poster} />
          ) : (
            <div style={styles.placeholder}>
              {series.title.charAt(0).toUpperCase()}
            </div>
          )}
          {favorite && <span style={styles.star}>★</span>}
          <span style={styles.badge}>{series.type}</span>
        </div>
        <div style={styles.info}>
          <span style={styles.title}>{series.title}</span>
        </div>
      </button>
      {onDelete && (
        <button
          style={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Eliminar serie"
        >
          ✕
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative' as const },
  card: {
    background: '#1f1f1f', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
    border: 'none', padding: 0, textAlign: 'left', color: '#fff',
    transition: 'transform 0.2s, box-shadow 0.2s', display: 'block', width: '100%',
  },
  thumbnail: { position: 'relative', width: '100%', aspectRatio: '2/3', background: '#141414' },
  poster: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '100%', fontSize: 48, color: '#333',
  },
  star: { position: 'absolute', top: 8, right: 8, color: '#ffd700', fontSize: 20 },
  badge: {
    position: 'absolute', bottom: 8, left: 8, padding: '2px 8px',
    background: 'rgba(0,0,0,0.7)', borderRadius: 4, fontSize: 11,
    color: '#a0a0a0', textTransform: 'uppercase',
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
}
