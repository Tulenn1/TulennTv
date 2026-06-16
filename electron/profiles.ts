import { v4 as uuid } from 'uuid'
import { getDb } from './database'
import { Profile, CreateProfileInput } from '../src/shared/types'

export function getProfiles(): Profile[] {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, avatar, created_at as createdAt FROM profiles ORDER BY created_at ASC').all() as Profile[]
  return rows
}

export function createProfile(input: CreateProfileInput): Profile {
  const db = getDb()
  const id = uuid()
  db.prepare('INSERT INTO profiles (id, name, avatar) VALUES (?, ?, ?)').run(id, input.name, input.avatar)
  return { id, name: input.name, avatar: input.avatar, createdAt: new Date().toISOString() }
}

export function deleteProfile(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
}

export function getActiveProfile(): Profile | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM app_session WHERE key = ?').get('active_profile_id') as { value: string } | undefined
  if (!row) return null
  const profile = db.prepare('SELECT id, name, avatar, created_at as createdAt FROM profiles WHERE id = ?').get(row.value) as Profile | undefined
  return profile || null
}

export function setActiveProfile(profileId: string): void {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)').run('active_profile_id', profileId)
}
