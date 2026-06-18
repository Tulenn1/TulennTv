import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { createSchema } from './schema'

let db: Database.Database | null = null

const isPkg = typeof process.pkg !== 'undefined'
const BASE_DIR = isPkg ? path.dirname(process.execPath) : process.cwd()

const DB_DIR = process.env.NODE_ENV === 'test'
  ? path.join(BASE_DIR, 'data', 'test')
  : path.join(BASE_DIR, 'data')

const DB_PATH = path.join(DB_DIR, 'tulenntv.db')

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    createSchema(db)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
