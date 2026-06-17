import request from 'supertest'
import express from 'express'
import { getDb, closeDb } from '../database'
import profilesRouter from '../routes/profiles'

const app = express()
app.use(express.json())
app.use('/api/profiles', profilesRouter)

beforeAll(() => {
  process.env.NODE_ENV = 'test'
  getDb()
})

afterAll(() => {
  closeDb()
})

describe('Profiles API', () => {
  it('GET /api/profiles returns empty array initially', async () => {
    const res = await request(app).get('/api/profiles')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /api/profiles creates a profile', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({ name: 'Benja', avatar: '😎' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Benja')
    expect(res.body.avatar).toBe('😎')
    expect(res.body.id).toBeDefined()
  })

  it('POST /api/profiles fails without name', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({ avatar: '😎' })
    expect(res.status).toBe(400)
  })
})
