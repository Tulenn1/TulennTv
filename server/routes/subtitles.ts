import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { getDb } from '../database'

const router = Router()

router.get('/:episodeId/:index', (req: Request, res: Response) => {
  const { episodeId, index } = req.params
  const db = getDb()
  const row = db.prepare('SELECT path, subtitles FROM episodes WHERE id = ?').get(episodeId) as { path: string; subtitles: string } | undefined
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Episode not found' })
    return
  }

  let subtitles: string[]
  try {
    subtitles = JSON.parse(row.subtitles || '[]')
  } catch {
    subtitles = []
  }

  const idx = parseInt(index as string, 10)
  if (isNaN(idx) || idx < 0 || idx >= subtitles.length) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Subtitle not found' })
    return
  }

  const subPath = subtitles[idx]
  if (!fs.existsSync(subPath)) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Subtitle file not found' })
    return
  }

  const ext = path.extname(subPath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.srt': 'text/plain; charset=utf-8',
    '.vtt': 'text/vtt; charset=utf-8',
    '.ass': 'text/plain; charset=utf-8',
    '.ssa': 'text/plain; charset=utf-8',
    '.sub': 'text/plain; charset=utf-8',
  }

  res.type(mimeMap[ext] || 'application/octet-stream')
  res.sendFile(subPath)
})

export default router
