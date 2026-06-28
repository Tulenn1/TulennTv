import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const first = result.error.issues[0]
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: first?.message || 'Invalid input',
        field: first?.path?.join('.'),
      })
      return
    }
    if (source === 'body') req.body = result.data
    next()
  }
}

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  avatar: z.string().max(50).optional().default(''),
})

export const profileIdSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
})

export const createProfileSchema = profileSchema

export const scanSchema = z.object({
  path: z.string().min(1, 'path is required'),
  type: z.enum(['anime', 'series', 'movie']).optional(),
})

export const channelCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().max(10).optional().default('📺'),
  seriesIds: z.array(z.string()).optional().default([]),
})

export const channelReorderSchema = z.object({
  ids: z.array(z.string()).min(1, 'ids array is required'),
})

export const progressSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  episodeId: z.string().min(1, 'episodeId is required'),
  position: z.number().min(0).optional().default(0),
  completed: z.boolean().optional().default(false),
})

export const seriesUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['anime', 'series', 'movie']).optional(),
})

export const mediaFolderSchema = z.object({
  path: z.string().min(1, 'path is required'),
})

export const tmdbKeySchema = z.object({
  key: z.string().optional().default(''),
})

export const fetchAllPostersSchema = z.object({
  tmdbKey: z.string().optional(),
})

export const folderDeleteSchema = z.object({
  path: z.string().min(1, 'path is required'),
})
