import { Series } from '../shared/types'

interface Props {
  series: Series
  onClick: () => void
  favorite?: boolean
}

export default function SeriesCard({ series, onClick, favorite }: Props) {
  return (
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
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#1f1f1f', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
    border: 'none', padding: 0, textAlign: 'left', color: '#fff',
    transition: 'transform 0.2s, box-shadow 0.2s',
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
}
