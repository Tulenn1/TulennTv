import fs from 'fs'
import path from 'path'
import { getDb, closeDb } from './database'

const DB_PATH = path.join(process.cwd(), 'data', 'tulenntv.db')
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups')

export function backupDatabase(): string | null {
  if (!fs.existsSync(DB_PATH)) {
    console.log('[Backup] No database file found to backup')
    return null
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(BACKUP_DIR, `tulenntv-${timestamp}.db`)

  try {
    const db = getDb()
    db.backup(backupPath)
    console.log(`[Backup] Database backed up to: ${backupPath}`)
    return backupPath
  } catch (err) {
    console.error('[Backup] Failed to backup database:', err)
    return null
  }
}

export function cleanupOldBackups(maxAgeDays = 30): void {
  if (!fs.existsSync(BACKUP_DIR)) return

  const files = fs.readdirSync(BACKUP_DIR)
  const now = Date.now()

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file)
    const stat = fs.statSync(filePath)
    const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24)

    if (ageDays > maxAgeDays) {
      fs.unlinkSync(filePath)
      console.log(`[Backup] Removed old backup: ${file}`)
    }
  }
}
