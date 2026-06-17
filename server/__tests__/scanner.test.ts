import { parseEpisodeInfo } from '../parser'

describe('parseEpisodeInfo', () => {
  it('detects S01E01 pattern', () => {
    const r = parseEpisodeInfo('Naruto S01E01.mkv')
    expect(r.season).toBe(1)
    expect(r.episode).toBe(1)
  })

  it('detects Ep 05 pattern', () => {
    const r = parseEpisodeInfo('Naruto Ep 05.mp4')
    expect(r.episode).toBe(5)
    expect(r.season).toBe(1)
  })

  it('detects Capitulo 12 pattern', () => {
    const r = parseEpisodeInfo('Naruto Capítulo 12.mkv')
    expect(r.episode).toBe(12)
  })

  it('detects number in brackets', () => {
    const r = parseEpisodeInfo('[01] Naruto.mkv')
    expect(r.episode).toBe(1)
  })

  it('handles anime naming [Group] Name - 01 [1080p]', () => {
    const r = parseEpisodeInfo('[SubGroup] Naruto - 01 [1080p].mkv')
    expect(r.episode).toBe(1)
    expect(r.cleanTitle).toBe('Naruto - 01')
  })

  it('removes resolution tags from title', () => {
    const r = parseEpisodeInfo('[Subs] Series - 01 [1080p][HEVC].mkv')
    expect(r.cleanTitle).toBe('Series - 01')
  })

  it('detects version number', () => {
    const r = parseEpisodeInfo('[Group] Name v2 [1080p].mkv')
    expect(r.version).toBe(2)
  })

  it('detects double episode', () => {
    const r = parseEpisodeInfo('Series - 01-02.mkv')
    expect(r.isDoubleEpisode).toBe(true)
  })

  it('detects SxxExx with lowercase', () => {
    const r = parseEpisodeInfo('Series s02e05.mkv')
    expect(r.season).toBe(2)
    expect(r.episode).toBe(5)
  })

  it('detects number-of pattern', () => {
    const r = parseEpisodeInfo('Series 3 of 12.mkv')
    expect(r.episode).toBe(3)
  })

  it('defaults to episode 1 when no pattern matches', () => {
    const r = parseEpisodeInfo('Naruto Movie.mkv')
    expect(r.episode).toBe(1)
    expect(r.title).toBe('Naruto Movie')
  })

  it('extracts clean title without group tag', () => {
    const r = parseEpisodeInfo('[HorribleSubs] One Piece - 1001 [1080p].mkv')
    expect(r.episode).toBe(1001)
    expect(r.cleanTitle).toBe('One Piece - 1001')
  })
})
