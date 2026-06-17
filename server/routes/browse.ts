import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()

router.get('/:dir(*)', (req: Request, res: Response) => {
  const dirParam = req.params.dir as string | undefined
  const dirPath = decodeURIComponent(dirParam || '/')
  if (!fs.existsSync(dirPath)) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Directory not found' })
    return
  }
  try {
    const items = fs.readdirSync(dirPath).map(name => {
      const fullPath = path.join(dirPath, name)
      let isDir = false
      try { isDir = fs.statSync(fullPath).isDirectory() } catch {}
      return { name, path: fullPath, isDir }
    }).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    const parent = dirPath === '/' ? null : path.dirname(dirPath)
    res.json({ current: dirPath, parent, items })
  } catch (err: any) {
    res.status(500).json({ error: 'BROWSE_ERROR', message: err.message })
  }
})

export default router
