import { Router, Request, Response } from 'express'
import { getLocalIp } from '../utils/network'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const port = parseInt(process.env.PORT || '3456', 10)
  const ip = getLocalIp()
  const urls = {
    local: `http://localhost:${port}`,
    network: `http://${ip}:${port}`,
    mdns: `http://tulenntv.local:${port}`,
    port,
  }
  res.json(urls)
})

router.get('/qr', async (req: Request, res: Response) => {
  const port = parseInt(process.env.PORT || '3456', 10)
  const ip = getLocalIp()
  const url = `http://${ip}:${port}`

  try {
    const QRCode = require('qrcode')
    const svg = await QRCode.toString(url, { type: 'svg', width: 300, margin: 1, color: { dark: '#e50914', light: '#ffffff' } })
    res.type('image/svg+xml').send(svg)
  } catch {
    res.status(500).json({ error: 'QR generation failed' })
  }
})

export default router
