import { Router, Request, Response } from 'express'
import path from 'path'
import { getEpisodePath, streamVideo } from '../streamer'

const router = Router()

router.get('/:episodeId', (req: Request, res: Response) => {
  const episodeId = req.params.episodeId as string
  const filePath = getEpisodePath(episodeId)
  if (!filePath) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Episode not found' })
    return
  }
  streamVideo(filePath, req, res)
})

export default router
