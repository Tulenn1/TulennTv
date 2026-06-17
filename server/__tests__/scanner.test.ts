import { parseEpisodeInfo } from '../scanner'

describe('parseEpisodeInfo', () => {
  it('detects S01E01 pattern', () => {
    expect(parseEpisodeInfo('Naruto S01E01.mkv')).toEqual({ season: 1, episode: 1, title: 'Naruto S01E01' })
  })

  it('detects Ep 01 pattern', () => {
    expect(parseEpisodeInfo('Naruto Ep 05.mp4')).toEqual({ season: 1, episode: 5, title: 'Naruto Ep 05' })
  })

  it('detects Capitulo pattern', () => {
    expect(parseEpisodeInfo('Naruto Capítulo 12.mkv')).toEqual({ season: 1, episode: 12, title: 'Naruto Capítulo 12' })
  })

  it('detects number in brackets', () => {
    expect(parseEpisodeInfo('[01] Naruto.mkv')).toEqual({ season: 1, episode: 1, title: '[01] Naruto' })
  })

  it('defaults to episode 1 when no pattern matches', () => {
    expect(parseEpisodeInfo('Naruto Movie.mkv')).toEqual({ season: 1, episode: 1, title: 'Naruto Movie' })
  })
})
