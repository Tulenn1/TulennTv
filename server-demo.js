const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3456
let library = []
let profiles = [{ id: '1', name: 'Demo', avatar: '😎', createdAt: new Date().toISOString() }]
let activeProfile = '1'
let favorites = {}
let progress = {}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

function body(req) {
  return new Promise((resolve) => {
    let d = ''
    req.on('data', c => d += c)
    req.on('end', () => {
      try { resolve(JSON.parse(d)) }
      catch { resolve({}) }
    })
  })
}

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return { series: [], episodes: [] }
  const items = fs.readdirSync(dirPath)
  const videoExts = new Set(['.mp4','.mkv','.avi','.mov','.webm','.m4v'])
  const videoFiles = items.filter(f => videoExts.has(path.extname(f).toLowerCase())).sort()

  if (videoFiles.length > 0) {
    const dirName = path.basename(dirPath)
    const seriesId = dirName + '-' + Date.now()
    const episodes = videoFiles.map((f, i) => ({
      id: `${seriesId}-ep${i}`,
      seriesId,
      title: path.parse(f).name,
      path: path.join(dirPath, f),
      season: 1,
      episode: i + 1,
      duration: 0,
    }))
    return {
      series: [{
        id: seriesId, title: dirName, type: 'series',
        path: dirPath, poster: '', addedAt: new Date().toISOString(),
      }],
      episodes,
    }
  }

  const subdirs = items.filter(f => {
    try { return fs.statSync(path.join(dirPath, f)).isDirectory() }
    catch { return false }
  })

  let allSeries = [], allEpisodes = []
  for (const sub of subdirs) {
    const r = scanDir(path.join(dirPath, sub))
    allSeries.push(...r.series)
    allEpisodes.push(...r.episodes)
  }
  return { series: allSeries, episodes: allEpisodes }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, {})

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const parts = url.pathname.split('/').filter(Boolean)

  try {
    // GET /api/profiles
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'profiles' && !parts[2])
      return json(res, profiles)

    // POST /api/profiles
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'profiles') {
      const b = await body(req)
      const p = { id: String(Date.now()), name: b.name, avatar: b.avatar || '😎', createdAt: new Date().toISOString() }
      profiles.push(p)
      return json(res, p, 201)
    }

    // GET /api/session/active-profile
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'session' && parts[2] === 'active-profile') {
      const p = profiles.find(x => x.id === activeProfile)
      return json(res, p || null)
    }

    // POST /api/session/active-profile
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'session' && parts[2] === 'active-profile') {
      const b = await body(req)
      activeProfile = b.profileId
      return json(res, { success: true })
    }

    // GET /api/library
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'library' && !parts[2]) {
      const search = url.searchParams.get('search')
      let result = library
      if (search) result = result.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
      return json(res, result)
    }

    // GET /api/library/:id
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'library' && parts[2]) {
      const s = library.find(x => x.id === parts[2])
      if (!s) return json(res, { error: 'Not found' }, 404)
      return json(res, s)
    }

    // POST /api/scanner
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'scanner') {
      const b = await body(req)
      const result = scanDir(b.path)
      for (const s of result.series) {
        if (!library.find(x => x.path === s.path)) {
          library.push({ ...s, episodes: result.episodes.filter(e => e.seriesId === s.id), favorite: false })
        }
      }
      return json(res, result)
    }

    // GET /api/favorites/:profileId
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'favorites' && parts[2]) {
      return json(res, favorites[parts[2]] || [])
    }

    // POST /api/favorites/:profileId/:seriesId
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'favorites' && parts[2] && parts[3]) {
      if (!favorites[parts[2]]) favorites[parts[2]] = []
      const idx = favorites[parts[2]].indexOf(parts[3])
      if (idx >= 0) {
        favorites[parts[2]].splice(idx, 1)
        return json(res, { isFavorite: false })
      }
      favorites[parts[2]].push(parts[3])
      return json(res, { isFavorite: true })
    }

    // GET /api/progress/:profileId/:episodeId
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'progress' && parts[2] && parts[3]) {
      return json(res, null)
    }

    // POST /api/progress
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'progress') {
      return json(res, { success: true })
    }

    json(res, { error: 'Not found' }, 404)
  } catch (err) {
    json(res, { error: String(err) }, 500)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[API Server] http://localhost:${PORT}`)
})
