import Database from 'better-sqlite3'

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('anime','series','movie')),
      path TEXT NOT NULL UNIQUE,
      poster TEXT NOT NULL DEFAULT '',
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      season INTEGER NOT NULL DEFAULT 1,
      episode INTEGER NOT NULL DEFAULT 1,
      duration REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS watch_progress (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      position REAL NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      watched_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(profile_id, episode_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      PRIMARY KEY(profile_id, series_id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📺',
      type TEXT NOT NULL DEFAULT 'custom' CHECK(type IN ('auto','custom')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channel_series (
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(channel_id, series_id)
    );

    CREATE TABLE IF NOT EXISTS app_session (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);
    CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(series_id, season, episode);
    CREATE INDEX IF NOT EXISTS idx_watch_progress_profile ON watch_progress(profile_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_profile ON favorites(profile_id);
    CREATE INDEX IF NOT EXISTS idx_channel_series_channel ON channel_series(channel_id);
  `)
}
