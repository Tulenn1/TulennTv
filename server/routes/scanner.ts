import { Router, Request, Response } from 'express'
import fs from 'fs'
import { scanAndImport } from '../scanner'
import { asyncHandler } from '../utils/async-handler'
import { getDb } from '../database'

const router = Router()

function normalizePath(input: string): string {
  const normalized = input.replace(/\\/g, '/')
  const winDrive = normalized.match(/^([A-Za-z]):\/(.+)$/)
  if (winDrive) {
    const drive = winDrive[1].toLowerCase()
    const rest = winDrive[2]
    const wslPath = `/mnt/${drive}/${rest}`
    if (fs.existsSync(wslPath)) return wslPath
  }
  return normalized
}

interface ScanStatus {
  status: 'idle' | 'scanning' | 'done' | 'error'
  progress: { current: number; total: number }
  error?: string
}

let scanState: ScanStatus = { status: 'idle', progress: { current: 0, total: 0 } }

router.get('/status', (_req: Request, res: Response) => {
  res.json(scanState)
})

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const rawPath = req.body.path as string | undefined
  const type = req.body.type as string | undefined
  if (!rawPath) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  if (scanState.status === 'scanning') {
    res.status(409).json({ error: 'SCAN_IN_PROGRESS', message: 'A scan is already in progress' })
    return
  }

  const scanPath = normalizePath(rawPath)
  scanState = { status: 'scanning', progress: { current: 0, total: 0 } }
  res.json({ status: 'scanning', message: 'Scan started' })

  try {
    const result = await scanAndImport(scanPath, type)
    scanState = { status: 'done', progress: { current: result.length, total: result.length } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    scanState = { status: 'error', progress: { current: 0, total: 0 }, error: message }
  }
}))

router.post('/directory', asyncHandler(async (req: Request, res: Response) => {
  const rawPath = req.body.path as string | undefined
  const type = req.body.type as string | undefined
  if (!rawPath) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  if (scanState.status === 'scanning') {
    res.status(409).json({ error: 'SCAN_IN_PROGRESS', message: 'A scan is already in progress' })
    return
  }

  const dirPath = normalizePath(rawPath)
  scanState = { status: 'scanning', progress: { current: 0, total: 0 } }
  res.json({ status: 'scanning', message: 'Scan started' })

  try {
    const result = await scanAndImport(dirPath, type)
    scanState = { status: 'done', progress: { current: result.length, total: result.length } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    scanState = { status: 'error', progress: { current: 0, total: 0 }, error: message }
  }
}))

export default router
