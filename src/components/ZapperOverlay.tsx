interface NextEpisode {
  title: string
  season: number
  episode: number
}

interface Props {
  visible: boolean
  channelName: string
  channelIcon?: string
  episodeTitle: string
  season: number
  episode: number
  channelNumber: number
  totalChannels: number
  totalEpisodes?: number
  currentEpisodeIndex?: number
  favorite?: boolean
  seriesName?: string
  currentSeriesIndex?: number
  totalSeries?: number
  nextEpisodes?: NextEpisode[]
}

export default function ZapperOverlay({
  visible, channelName, channelIcon, episodeTitle, season, episode,
  channelNumber, totalChannels, totalEpisodes, currentEpisodeIndex, favorite,
  seriesName, currentSeriesIndex, totalSeries, nextEpisodes,
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
          {channelIcon && <span style={{ fontSize: 20 }}>{channelIcon}</span>}
          <span style={styles.channelName}>{channelName}</span>
          {favorite && <span style={styles.star}>★</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={styles.channelCount}>{channelNumber} / {totalChannels}</span>
        </div>
      </div>
      <div style={styles.bottomInfo}>
        <div style={styles.episodeInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {seriesName && <span style={styles.seriesName}>{seriesName}</span>}
            {season > 0 && <span style={styles.season}>S{season} · E{episode}</span>}
            {totalEpisodes !== undefined && (
              <span style={styles.epCount}>{currentEpisodeIndex ?? 0} / {totalEpisodes}</span>
            )}
            {totalSeries !== undefined && totalSeries > 1 && (
              <span style={styles.epCount}>Serie {currentSeriesIndex ?? 0} de {totalSeries}</span>
            )}
          </div>
          <span style={styles.episodeTitle}>{episodeTitle}</span>
          {nextEpisodes && nextEpisodes.length > 0 && (
            <div style={styles.queueBox}>
              <span style={styles.queueLabel}>Próximos:</span>
              <div style={styles.queueList}>
                {nextEpisodes.map((ep, i) => (
                  <span key={i} style={styles.queueItem}>
                    S{ep.season}E{ep.episode} {ep.title}
                    {i < nextEpisodes.length - 1 && <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={styles.hints}>
          ← → episodio  ·  ↑ ↓ canal  ·  g guía  ·  i info
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
  bottomInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  episodeInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  seriesName: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  season: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 },
  episodeTitle: { fontSize: 16, fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  epCount: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  queueBox: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 },
  queueLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 },
  queueList: { display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  queueItem: { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 },
  hints: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' },
}
