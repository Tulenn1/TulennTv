interface Props {
  visible: boolean
  channelName: string
  episodeTitle: string
  season: number
  episode: number
  channelNumber: number
  totalChannels: number
  favorite?: boolean
}

export default function ZapperOverlay({
  visible, channelName, episodeTitle, season, episode,
  channelNumber, totalChannels, favorite,
}: Props) {
  return (
    <div style={{
      ...styles.overlay,
      opacity: visible ? 1 : 0,
      pointerEvents: 'none' as React.CSSProperties['pointerEvents'],
    }}>
      <div style={styles.topBar}>
        <div style={styles.channelBadge}>
          <span style={styles.channelNum}>CH {channelNumber}</span>
          <span style={styles.channelName}>{channelName}</span>
          {favorite && <span style={styles.star}>★</span>}
        </div>
        <div style={styles.channelCount}>{channelNumber} / {totalChannels}</div>
      </div>
      <div style={styles.bottomInfo}>
        <div style={styles.episodeInfo}>
          {season > 0 && <span style={styles.season}>S{season} · E{episode}</span>}
          <span style={styles.episodeTitle}>{episodeTitle}</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: 20, transition: 'opacity 0.3s',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.6) 100%)',
  },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  channelBadge: { display: 'flex', alignItems: 'center', gap: 10 },
  channelNum: { padding: '4px 10px', background: '#e50914', borderRadius: 4, fontSize: 12, fontWeight: 700 },
  channelName: { fontSize: 22, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.8)' },
  star: { fontSize: 18, color: '#ffd700' },
  channelCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 4 },
  bottomInfo: {},
  episodeInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  season: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 },
  episodeTitle: { fontSize: 16, fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
}
