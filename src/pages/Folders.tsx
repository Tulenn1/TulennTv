import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

function FolderHelpModal({ open, onClose, basePath }: { open: boolean; onClose: () => void; basePath: string }) {
  if (!open) return null
  return (
    <div style={helpStyles.overlay} onClick={onClose}>
      <div style={helpStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={helpStyles.header}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>📂 Estructura de carpetas</span>
          <button style={helpStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={helpStyles.body}>
          <p style={helpStyles.text}>
            Cada <strong>subcarpeta</strong> dentro de la carpeta principal se convierte en un <strong>canal</strong>.
            Los <strong>archivos de video</strong> dentro de cada subcarpeta son los <strong>episodios</strong>.
          </p>

          <div style={helpStyles.diagram}>
            <div style={helpStyles.treeLine}>
              <span style={helpStyles.folder}>📁</span>
              <span style={helpStyles.bold}>{basePath || 'CarpetaPrincipal/'}</span>
              <span style={helpStyles.tag}>carpeta raíz (la que configuras)</span>
            </div>

            <div style={helpStyles.treeChild}>
              <div style={helpStyles.treeLine}>
                <span style={helpStyles.folder}>📁</span>
                <span style={helpStyles.bold}>Naruto/</span>
                <span style={helpStyles.tag}>→ se convierte en un canal</span>
              </div>
              <div style={helpStyles.treeGrandchild}>
                <div style={helpStyles.treeLine}>
                  <span style={helpStyles.video}>🎬</span>
                  <span>Naruto Ep 01.mp4</span>
                  <span style={helpStyles.tag}>episodio 1</span>
                </div>
                <div style={helpStyles.treeLine}>
                  <span style={helpStyles.video}>🎬</span>
                  <span>Naruto Ep 02.mkv</span>
                  <span style={helpStyles.tag}>episodio 2</span>
                </div>
                <div style={helpStyles.treeLine}>
                  <span style={helpStyles.image}>🖼️</span>
                  <span>poster.jpg</span>
                  <span style={helpStyles.tag}>carátula (opcional)</span>
                </div>
              </div>
            </div>

            <div style={helpStyles.treeChild}>
              <div style={helpStyles.treeLine}>
                <span style={helpStyles.folder}>📁</span>
                <span style={helpStyles.bold}>One Piece/</span>
                <span style={helpStyles.tag}>→ otro canal</span>
              </div>
              <div style={helpStyles.treeGrandchild}>
                <div style={helpStyles.treeLine}>
                  <span style={helpStyles.video}>🎬</span>
                  <span>[Subs] OP - 001.mkv</span>
                  <span style={helpStyles.tag}>detecta episodio 1</span>
                </div>
                <div style={helpStyles.treeLine}>
                  <span style={helpStyles.video}>🎬</span>
                  <span>OP - 002 [1080p].mkv</span>
                  <span style={helpStyles.tag}>limpia etiquetas</span>
                </div>
              </div>
            </div>

            <div style={helpStyles.treeChild}>
              <div style={helpStyles.treeLine}>
                <span style={helpStyles.folder}>📁</span>
                <span style={helpStyles.bold}>Shingeki/</span>
              </div>
              <div style={helpStyles.treeGrandchild}>
                <div style={helpStyles.treeLine}>
                  <span style={helpStyles.video}>🎬</span>
                  <span>Shingeki S01E01.mkv</span>
                  <span style={helpStyles.tag}>temp 1, ep 1</span>
                </div>
              </div>
            </div>
          </div>

          <div style={helpStyles.tips}>
            <div style={helpStyles.tip}><strong>📝 Nombres:</strong> Se detectan patrones como <kbd style={helpStyles.kbd}>S01E01</kbd>, <kbd style={helpStyles.kbd}>Ep 01</kbd>, <kbd style={helpStyles.kbd}>- 01</kbd>, <kbd style={helpStyles.kbd}>[01]</kbd></div>
            <div style={helpStyles.tip}><strong>🖼️ Posters:</strong> Cualquier <kbd style={helpStyles.kbd}>poster.jpg</kbd>, <kbd style={helpStyles.kbd}>cover.png</kbd> o <kbd style={helpStyles.kbd}>folder.jpg</kbd> dentro de la carpeta se usa como carátula</div>
            <div style={helpStyles.tip}><strong>🎬 Formatos:</strong> .mp4, .mkv, .avi, .mov, .webm, .m4v, .wmv, .flv</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Folders() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [folders, setFolders] = useState<{ path: string; seriesCount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  const [mediaFolder, setMediaFolder] = useState('')
  const [editingFolder, setEditingFolder] = useState(false)
  const [folderInput, setFolderInput] = useState('')

  const [browseDir, setBrowseDir] = useState('')
  const [browseItems, setBrowseItems] = useState<{ name: string; path: string; isDir: boolean }[]>([])
  const [browseParent, setBrowseParent] = useState<string | null>(null)
  const [showBrowser, setShowBrowser] = useState(false)

  const [showSettings, setShowSettings] = useState(false)
  const [tmdbKey, setTmdbKey] = useState('')
  const [posterStatus, setPosterStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, mf, tk] = await Promise.all([
        api.getFolders(),
        api.getMediaFolder(),
        api.getTmdbKey(),
      ])
      setFolders(list)
      setMediaFolder(mf)
      setTmdbKey(tk)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openBrowser = async (dir: string) => {
    try {
      const result = await api.browseDirectory(dir || '/')
      setBrowseDir(result.current)
      setBrowseItems(result.items)
      setBrowseParent(result.parent)
      setShowBrowser(true)
    } catch {}
  }

  const selectFolder = async (dirPath: string) => {
    setShowBrowser(false)
    setMediaFolder(dirPath)
    setFolderInput(dirPath)
    await api.setMediaFolder(dirPath)
    await load()
  }

  const waitForScan = async () => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const status = await api.getScanStatus()
      if (status.status === 'done' || status.status === 'error') return status
    }
    return { status: 'timeout' as const, progress: { current: 0, total: 0 } }
  }

  const handleScanMediaFolder = async () => {
    if (!mediaFolder) return
    setLoading(true)
    try {
      const result = await api.scanDirectory(mediaFolder)
      if (result.status === 'scanning') await waitForScan()
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (path: string) => {
    if (!confirm(`Eliminar todas las series de "${path}"?`)) return
    await api.deleteFolder(path)
    await load()
  }

  const handleRescan = async (path: string) => {
    setLoading(true)
    try {
      await api.deleteFolder(path)
      const result = await api.scanDirectory(path)
      if (result.status === 'scanning') await waitForScan()
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar} className="sidebar">
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigate('/library')}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtn} onClick={() => navigate('/guide')}>Guía</button>
          <button style={styles.navBtn} onClick={() => navigate('/channels')}>Canales</button>
          <button style={styles.navBtnActive}>Carpetas</button>
          <button style={styles.navBtn} onClick={() => navigate('/tv-connect')}>Conectar</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>
          {profile?.name} {profile?.avatar}
        </div>
      </div>

      <div style={styles.main} className="main">
        <div className="header" style={styles.header}>
          <h1 style={styles.title}>Carpetas</h1>
        </div>

        <div style={styles.mediaFolderSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Carpeta principal de contenido</h3>
            <button style={styles.helpBtn} onClick={() => setShowHelp(true)} title="¿Cómo organizar las carpetas?">?</button>
          </div>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            Todos tus videos se organizan dentro de esta carpeta. La app escanea automáticamente las subcarpetas.
          </p>

          <FolderHelpModal open={showHelp} onClose={() => setShowHelp(false)} basePath={mediaFolder} />

          {editingFolder ? (
            <div style={styles.folderEditRow}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={folderInput}
                onChange={e => setFolderInput(e.target.value)}
                placeholder="/mnt/c/Users/Benja/Videos"
              />
              <button style={styles.btn} onClick={() => openBrowser(folderInput || '/')}>📁</button>
              <button style={{ ...styles.btn, background: '#e50914' }} onClick={async () => {
                if (folderInput.trim()) {
                  await api.setMediaFolder(folderInput.trim())
                  setMediaFolder(folderInput.trim())
                }
                setEditingFolder(false)
              }}>Guardar</button>
              <button style={{ ...styles.btn, background: '#333' }} onClick={() => setEditingFolder(false)}>Cancelar</button>
            </div>
          ) : (
            <div style={styles.folderDisplayRow}>
              <span style={styles.folderPath}>{mediaFolder || '(sin configurar)'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {mediaFolder && (
                  <button style={styles.btn} onClick={() => api.openFolder(mediaFolder)} title="Abrir carpeta">
                    📂
                  </button>
                )}
                <button style={styles.btn} onClick={() => {
                  setFolderInput(mediaFolder)
                  setEditingFolder(true)
                }}>✏️</button>
              </div>
            </div>
          )}

          {mediaFolder && (
            <button style={{ ...styles.btn, background: '#e50914', marginTop: 12 }} onClick={handleScanMediaFolder}>
              🔍 Escanear carpeta principal
            </button>
          )}

          <button style={{ ...styles.btn, background: '#333', marginTop: 8 }} onClick={async () => {
            const k = await api.getTmdbKey()
            setTmdbKey(k)
            setShowSettings(true)
          }}>
            🖼️ Configurar posters desde internet
          </button>
        </div>

        {showBrowser && (
          <div style={styles.browserOverlay}>
            <div style={styles.browserModal}>
              <div style={styles.browserHeader}>
                <span>Explorar: {browseDir}</span>
                <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }} onClick={() => setShowBrowser(false)}>✕</button>
              </div>
              <div style={styles.browserList}>
                {browseParent && (
                  <div style={styles.browserItem} onClick={() => openBrowser(browseParent)}>
                    <span style={{ color: '#e50914' }}>📁 ..</span>
                  </div>
                )}
                {browseItems.filter(i => i.isDir).map(item => (
                  <div key={item.path} style={styles.browserItem}>
                    <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => openBrowser(item.path)}>
                      📁 {item.name}
                    </span>
                    <button style={styles.selectBtn} onClick={() => selectFolder(item.path)}>Seleccionar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Carpetas escaneadas</h3>
          {loading ? (
            <div style={styles.loading}>Cargando...</div>
          ) : folders.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ fontSize: 18, color: '#a0a0a0' }}>No hay carpetas escaneadas</p>
            </div>
          ) : (
            <div style={styles.list}>
              {folders.map(f => (
                <div key={f.path} style={styles.card}>
                  <div style={styles.cardInfo}>
                    <span style={styles.cardPath}>{f.path}</span>
                    <span style={styles.cardCount}>{f.seriesCount} serie{f.seriesCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.actionBtn} onClick={() => handleRescan(f.path)}>↻</button>
                    <button style={{ ...styles.actionBtn, color: '#e50914' }} onClick={() => handleDelete(f.path)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div style={helpStyles.overlay} onClick={() => setShowSettings(false)}>
          <div style={helpStyles.modal} onClick={e => e.stopPropagation()}>
            <div style={helpStyles.header}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>🖼️ Posters desde internet</span>
              <button style={helpStyles.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div style={{ ...helpStyles.body, gap: 12 }}>
              <p style={helpStyles.text}>
                Para buscar carátulas automáticamente, necesitás una <strong>API key de TMDB</strong>.
                Es <strong>gratis</strong> y se obtiene en:
              </p>
              <pre style={helpStyles.code}>https://www.themoviedb.org/settings/api</pre>
              <p style={{ ...helpStyles.text, fontSize: 12, color: '#888' }}>
                📝 En el registro, donde pide <strong>"Application URL"</strong> poné <kbd style={helpStyles.kbd}>http://localhost:3456</kbd> o cualquier URL.<br/>
                Lo que importa es la <strong>API Key (v3 auth)</strong> que te dan al final.
              </p>

              <label style={{ fontSize: 13, color: '#aaa' }}>TMDB API Key:</label>
              <input
                style={helpStyles.input}
                value={tmdbKey}
                onChange={e => setTmdbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiJ9..."
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button style={helpStyles.saveBtn} onClick={async () => {
                  await api.setTmdbKey(tmdbKey)
                  setPosterStatus('')
                  setShowSettings(false)
                }}>Guardar</button>
                {tmdbKey && (
                  <button style={helpStyles.fetchBtn} onClick={async () => {
                    setPosterStatus('Buscando posters...')
                    try {
                      const res = await api.fetchAllPosters(tmdbKey)
                      setPosterStatus(`✅ ${res.found} posters encontrados de ${res.total} series`)
                    } catch {
                      setPosterStatus('❌ Error al buscar posters')
                    }
                  }}>🔍 Buscar todos los posters</button>
                )}
              </div>

              {posterStatus && <p style={{ fontSize: 13, color: posterStatus.includes('✅') ? '#46d369' : '#e50914' }}>{posterStatus}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: '#fff' },
  sidebar: { width: 200, background: 'var(--bg-secondary)', padding: 20, display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid #1f1f1f' },
  logo: { fontSize: 20, fontWeight: 800, color: '#e50914' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: { padding: '10px 16px', background: 'transparent', color: '#a0a0a0', borderRadius: 6, textAlign: 'left', fontSize: 14 },
  navBtnActive: { padding: '10px 16px', background: 'var(--bg-card)', color: '#fff', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 600 },
  main: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 700 },
  mediaFolderSection: { background: 'var(--bg-card)', borderRadius: 8, padding: 16 },
  folderEditRow: { display: 'flex', gap: 8 },
  folderDisplayRow: { display: 'flex', gap: 8, alignItems: 'center' },
  folderPath: { fontSize: 14, color: '#a0a0a0', fontFamily: 'monospace', flex: 1 },
  input: { padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14 },
  btn: { padding: '8px 16px', background: '#333', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  helpBtn: {
    width: 28, height: 28, borderRadius: '50%', background: '#333',
    color: '#a0a0a0', border: 'none', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  browserOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  browserModal: { background: 'var(--bg-card)', borderRadius: 12, width: '60%', maxWidth: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  browserHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #333', fontSize: 14, fontFamily: 'monospace' },
  browserList: { flex: 1, overflow: 'auto', padding: 8 },
  browserItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, fontSize: 14, cursor: 'default' },
  selectBtn: { padding: '4px 10px', background: '#e50914', color: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 600, marginLeft: 'auto' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8 },
  cardInfo: { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' },
  cardPath: { fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardCount: { fontSize: 12, color: '#888' },
  cardActions: { display: 'flex', gap: 8, flexShrink: 0 },
  actionBtn: { padding: '6px 12px', background: '#333', border: 'none', color: '#fff', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
}

const helpStyles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#1a1a1a', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #333', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #333' },
  closeBtn: { background: 'transparent', border: 'none', color: '#a0a0a0', fontSize: 20, cursor: 'pointer', padding: 4 },
  body: { flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 },
  text: { fontSize: 14, color: '#ccc', lineHeight: 1.7 },
  diagram: { background: '#0f0f0f', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14, fontFamily: 'monospace' },
  treeLine: { display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', flexWrap: 'wrap' },
  treeChild: { paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 2, borderLeft: '1px solid #333', marginLeft: 8, marginTop: 2, marginBottom: 2 },
  treeGrandchild: { paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 2, borderLeft: '1px solid #444', marginLeft: 8 },
  folder: { fontSize: 16 },
  video: { fontSize: 14 },
  image: { fontSize: 14 },
  bold: { fontWeight: 700, color: '#fff' },
  tag: { fontSize: 11, color: '#888', fontStyle: 'italic', fontFamily: 'sans-serif' },
  tips: { display: 'flex', flexDirection: 'column', gap: 8, background: '#0f0f0f', borderRadius: 8, padding: 14 },
  tip: { fontSize: 13, color: '#aaa', lineHeight: 1.6 },
  kbd: { background: '#333', color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 12, fontFamily: 'monospace' },
  code: { background: 'var(--bg-primary)', padding: 10, borderRadius: 6, fontSize: 12, color: '#888', lineHeight: 1.5, overflow: 'auto' },
  input: { padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14, width: '100%', fontFamily: 'monospace' },
  saveBtn: { padding: '10px 20px', background: '#e50914', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 14 },
  fetchBtn: { padding: '10px 20px', background: '#333', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 14 },
}
