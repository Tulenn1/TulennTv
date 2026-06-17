import { Router, Request, Response } from 'express'
import { scanAndImport } from '../scanner'
import { getDb } from '../database'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const { path, type } = req.body
  if (!path) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  try {
    const result = scanAndImport(path, type)
    res.json(result)
  } catch (err: any) {
    res.status(400).json({ error: 'SCAN_ERROR', message: err.message })
  }
})

router.post('/directory', (req: Request, res: Response) => {
  const { path: dirPath, type } = req.body
  if (!dirPath) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  try {
    const result = scanAndImport(dirPath, type)
    res.json(result)
  } catch (err: any) {
    res.status(400).json({ error: 'SCAN_ERROR', message: err.message })
  }
})

export default router
