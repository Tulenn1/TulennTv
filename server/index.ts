import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { getDb, closeDb } from './database'

const app = express()
const PORT = parseInt(process.env.PORT || '3456', 10)

app.use(cors())
app.use(express.json())

app.use(express.static(path.join(process.cwd(), 'dist')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

const SPA_PATHS = ['/', '/profiles', '/library', '/zapper', '/guide', '/channels', '/folders', '/tv-connect']
for (const route of SPA_PATHS) {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'))
  })
}

function getLocalIp(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

app.listen(PORT, '0.0.0.0', () => {
  getDb()
  const ip = getLocalIp()
  console.log(`\n  🎬 TulennTv Server`)
  console.log(`  ─────────────────`)
  console.log(`  Local:   http://localhost:${PORT}`)
  console.log(`  Red:     http://${ip}:${PORT}`)
  console.log(`  Puerto:  ${PORT}\n`)
})

process.on('SIGINT', () => {
  closeDb()
  process.exit(0)
})

process.on('SIGTERM', () => {
  closeDb()
  process.exit(0)
})
