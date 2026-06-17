import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/media-folder', (_req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare("SELECT value FROM app_session WHERE key = ?").get('media_folder') as { value: string } | undefined
  res.json({ path: row?.value || '' })
})

router.put('/media-folder', (req: Request, res: Response) => {
  const { path } = req.body
  if (!path) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run('media_folder', path)
  res.json({ success: true, path })
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

export default router
