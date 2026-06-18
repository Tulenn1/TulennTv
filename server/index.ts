import express from 'express'
import cors from 'cors'
import path from 'path'
import { getDb, closeDb } from './database'
import profilesRouter from './routes/profiles'
import libraryRouter from './routes/library'
import progressRouter from './routes/progress'
import favoritesRouter from './routes/favorites'
import channelsRouter from './routes/channels'
import foldersRouter from './routes/folders'
import scannerRouter from './routes/scanner'
import episodeRouter from './routes/episode'
import videoRouter from './routes/video'
import posterRouter from './routes/poster'
import settingsRouter from './routes/settings'
import browseRouter from './routes/browse'
import connectRouter from './routes/connect'
import { streamVideo } from './streamer'
import { ensureAutoChannels } from './channels'
import { backupDatabase, cleanupOldBackups } from './backup'
import { getLocalIp } from './utils/network'
import { startMdns, stopMdns } from './mdns'
import { openFirewallPort, closeFirewallPort } from './firewall'

const app = express()
const PORT = parseInt(process.env.PORT || '3456', 10)

const isPkg = typeof process.pkg !== 'undefined'
const BASE_DIR = isPkg ? path.dirname(process.execPath) : process.cwd()

app.use(cors())
app.use(express.json())

app.use('/api/profiles', profilesRouter)
app.use('/api/library', libraryRouter)
app.use('/api/progress', progressRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/channels', channelsRouter)
app.use('/api/folders', foldersRouter)
app.use('/api/scanner', scannerRouter)
app.use('/api/episode', episodeRouter)
app.use('/api/video', videoRouter)
app.use('/api/poster', posterRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/browse', browseRouter)
app.use('/api/connect', connectRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.get(/^\/api\/serve-file\/(.+)$/, (req, res) => {
  const filePath = '/' + decodeURIComponent(req.params[0] as string)
  streamVideo(filePath, req, res)
})

app.use(express.static(path.join(BASE_DIR, 'dist')))

const SPA_PATHS = ['/', '/profiles', '/library', '/zapper', '/guide', '/channels', '/folders', '/tv-connect']
for (const route of SPA_PATHS) {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(BASE_DIR, 'dist', 'index.html'))
  })
}

getDb()
ensureAutoChannels()
cleanupOldBackups()
backupDatabase()
setInterval(() => backupDatabase(), 24 * 60 * 60 * 1000)

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp()
  console.log(`\n  \x1b[1;31mTulennTv Server\x1b[0m`)
  console.log(`  \x1b[90m─────────────────\x1b[0m`)
  console.log(`  Local:   http://localhost:${PORT}`)
  console.log(`  Red:     http://${ip}:${PORT}`)
  startMdns(PORT)
  openFirewallPort(PORT)
  console.log(`  Puerto:  ${PORT}\n`)
})

function shutdown(): void {
  console.log('\n  Cerrando servidor...')
  stopMdns()
  closeFirewallPort()
  closeDb()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
