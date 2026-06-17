import fs from 'fs'
import path from 'path'
import { getDb } from './database'

export function getEpisodePath(episodeId: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT path FROM episodes WHERE id = ?').get(episodeId) as { path: string } | undefined
  return row?.path || null
}

export function streamVideo(filePath: string, req: any, res: any): void {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'File not found' })
    return
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const stream = fs.createReadStream(filePath, { start, end })
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': getMimeType(filePath),
    })
    stream.pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': getMimeType(filePath),
      'Accept-Ranges': 'bytes',
    })
    fs.createReadStream(filePath).pipe(res)
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mime: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.m4v': 'video/x-m4v',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
  }
  return mime[ext] || 'application/octet-stream'
}
