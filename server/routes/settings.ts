import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { getDb } from '../database'

const router = Router()

function getDefaultFolderPath(): string {
  const home = os.homedir()
  if (process.platform === 'win32') {
    const docs = path.join(home, 'Videos', 'TulennTv')
    if (fs.existsSync(docs)) return docs
    return path.join(home, 'Videos', 'TulennTv')
  }
  const videos = path.join(home, 'Videos', 'TulennTv')
  if (fs.existsSync(videos)) return videos
  return path.join(home, 'TulennTv')
}

router.get('/default-folder', (_req: Request, res: Response) => {
  res.json({ path: getDefaultFolderPath() })
})

router.post('/init-folder', (req: Request, res: Response) => {
  try {
    const folderPath = getDefaultFolderPath()
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }
    const db = getDb()
    db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run('media_folder', folderPath)
    res.json({ success: true, path: folderPath, created: true })
  } catch (err: any) {
    res.status(500).json({ error: 'CREATE_FAILED', message: err.message })
  }
})

router.get('/media-folder', (_req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM app_session WHERE key = ?").get('media_folder') as { value: string } | undefined
  res.json({ path: row?.value || '' })
})

router.put('/media-folder', (req: Request, res: Response) => {
  const { path: folderPath } = req.body
  if (!folderPath) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run('media_folder', folderPath)
  res.json({ success: true, path: folderPath })
})

router.post('/open-folder', (req: Request, res: Response) => {
  const { path } = req.body
  if (!path) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  try {
    const { exec } = require('child_process')
    const cmd = process.platform === 'win32' ? `explorer "${path}"` : `xdg-open "${path}"`
    exec(cmd)
    res.json({ success: true })
  } catch {
    res.json({ success: false })
  }
})

router.get('/tmdb-key', (_req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM app_session WHERE key = ?").get('tmdb_key') as { value: string } | undefined
  res.json({ key: row?.value || '' })
})

router.put('/tmdb-key', (req: Request, res: Response) => {
  const { key } = req.body
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run('tmdb_key', key || '')
  res.json({ success: true })
})

export default router
