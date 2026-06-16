import http from 'http'
import { AddressInfo } from 'net'
import { getAllSeries, getSeriesWithEpisodes, getEpisode, scanAndImport } from './library'
import { getProfiles, createProfile, deleteProfile, getActiveProfile, setActiveProfile } from './profiles'
import { toggleFavorite, getFavorites } from './favorites'
import { saveProgress, getProgress } from './progress'
import { getDb } from './database'

let server: http.Server | null = null
let port = 3456

function jsonResponse(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { reject(new Error('Invalid JSON')) }
    })
  })
}

function handleRoute(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (req.method === 'OPTIONS') {
    jsonResponse(res, {})
    return
  }

  const url = new URL(req.url || '/', `http://localhost:${port}`)
  const pathParts = url.pathname.split('/').filter(Boolean)

  try {
    // GET /api/library
    if (req.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'library' && !pathParts[2]) {
      const type = url.searchParams.get('type') || undefined
      const search = url.searchParams.get('search') || undefined
      const profileId = url.searchParams.get('profileId') || undefined
      const series = getAllSeries(type, search)

      if (profileId) {
        const favIds = getFavorites(profileId)
        const result = series.map(s => ({
          ...s,
          favorite: favIds.includes(s.id)
        }))
        jsonResponse(res, result)
      } else {
        jsonResponse(res, series)
      }
      return
    }

    // GET /api/library/:id
    if (req.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'library' && pathParts[2]) {
      const profileId = url.searchParams.get('profileId') || undefined
      const series = getSeriesWithEpisodes(pathParts[2], profileId)
      if (!series) { jsonResponse(res, { error: 'Not found' }, 404); return }
      jsonResponse(res, series)
      return
    }

    // POST /api/scanner
    if (req.method === 'POST' && pathParts[0] === 'api' && pathParts[1] === 'scanner') {
      ;(async () => {
        const body = await parseBody(req) as { path: string }
        const result = scanAndImport(body.path)
        jsonResponse(res, result)
      })()
      return
    }

    // GET /api/profiles
    // POST /api/profiles
    if (pathParts[0] === 'api' && pathParts[1] === 'profiles') {
      if (req.method === 'GET') {
        const profiles = getProfiles()
        jsonResponse(res, profiles)
        return
      }
      if (req.method === 'POST') {
        ;(async () => {
          const body = await parseBody(req) as { name: string; avatar: string }
          const profile = createProfile(body)
          jsonResponse(res, profile, 201)
        })()
        return
      }
      jsonResponse(res, { error: 'Method not allowed' }, 405)
      return
    }

    // DELETE /api/profiles/:id
    if (req.method === 'DELETE' && pathParts[0] === 'api' && pathParts[1] === 'profiles' && pathParts[2]) {
      deleteProfile(pathParts[2])
      jsonResponse(res, { success: true })
      return
    }

    // GET /api/session/active-profile
    // POST /api/session/active-profile
    if (pathParts[0] === 'api' && pathParts[1] === 'session' && pathParts[2] === 'active-profile') {
      if (req.method === 'GET') {
        const profile = getActiveProfile()
        jsonResponse(res, profile)
        return
      }
      if (req.method === 'POST') {
        ;(async () => {
          const body = await parseBody(req) as { profileId: string }
          setActiveProfile(body.profileId)
          jsonResponse(res, { success: true })
        })()
        return
      }
    }

    // GET /api/favorites/:profileId
    // POST /api/favorites/:profileId/:seriesId
    if (pathParts[0] === 'api' && pathParts[1] === 'favorites') {
      if (req.method === 'GET' && pathParts[2]) {
        const favIds = getFavorites(pathParts[2])
        jsonResponse(res, favIds)
        return
      }
      if (req.method === 'POST' && pathParts[2] && pathParts[3]) {
        const isFav = toggleFavorite(pathParts[2], pathParts[3])
        jsonResponse(res, { isFavorite: isFav })
        return
      }
    }

    // GET /api/progress/:profileId/:episodeId
    // POST /api/progress
    if (pathParts[0] === 'api' && pathParts[1] === 'progress') {
      if (req.method === 'GET' && pathParts[2] && pathParts[3]) {
        const progress = getProgress(pathParts[2], pathParts[3])
        jsonResponse(res, progress)
        return
      }
      if (req.method === 'POST') {
        ;(async () => {
          const body = await parseBody(req) as { profileId: string; episodeId: string; position: number; completed?: boolean }
          saveProgress(body.profileId, body.episodeId, body.position, body.completed)
          jsonResponse(res, { success: true })
        })()
        return
      }
    }

    // GET /api/episode/:id
    if (req.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'episode' && pathParts[2]) {
      const episode = getEpisode(pathParts[2])
      if (!episode) { jsonResponse(res, { error: 'Not found' }, 404); return }
      jsonResponse(res, episode)
      return
    }

    jsonResponse(res, { error: 'Not found' }, 404)
  } catch (err) {
    jsonResponse(res, { error: String(err) }, 500)
  }
}

export function startServer(): number {
  if (server) return port

  server = http.createServer(handleRoute)
  server.listen(0, '0.0.0.0', () => {
    port = (server!.address() as AddressInfo).port
    console.log(`[TulennTv] Web server running on port ${port}`)
  })
  return port
}

export function stopServer(): void {
  if (server) {
    server.close()
    server = null
  }
}

export function getPort(): number {
  return port
}
