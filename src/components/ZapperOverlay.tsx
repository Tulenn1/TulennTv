interface UpNext {
  series: string
  season: number
  episode: number
  title: string
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
  nextUp?: UpNext
}

export default function ZapperOverlay({
  visible, channelName, channelIcon, episodeTitle, season, episode,
  channelNumber, totalChannels, totalEpisodes, currentEpisodeIndex, favorite,
  seriesName, currentSeriesIndex, totalSeries, nextUp,
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
          {nextUp && (
            <div style={styles.upNextBox}>
              <span style={styles.upNextLabel}>A continuación</span>
              <div style={styles.upNextContent}>
                <span style={styles.upNextSeries}>{nextUp.series}</span>
                <span style={styles.upNextMeta}>S{nextUp.season}E{nextUp.episode}</span>
                {nextUp.title && <span style={styles.upNextTitle}>{nextUp.title}</span>}
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
  upNextBox: {
    display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10,
    background: 'rgba(0,0,0,0.55)', borderLeft: '3px solid #e50914',
    borderRadius: 4, padding: '8px 12px', maxWidth: 520,
  },
  upNextLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 },
  upNextContent: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', minWidth: 0 },
  upNextSeries: { fontSize: 15, fontWeight: 700, color: '#fff' },
  upNextMeta: { fontSize: 12, color: '#e50914', fontWeight: 700 },
  upNextTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  hints: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' },
}
