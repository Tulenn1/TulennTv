import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

export default function Folders() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [folders, setFolders] = useState<{ path: string; seriesCount: number }[]>([])
  const [loading, setLoading] = useState(true)

  const [mediaFolder, setMediaFolder] = useState('')
  const [editingFolder, setEditingFolder] = useState(false)
  const [folderInput, setFolderInput] = useState('')

  const [browseDir, setBrowseDir] = useState('')
  const [browseItems, setBrowseItems] = useState<{ name: string; path: string; isDir: boolean }[]>([])
  const [browseParent, setBrowseParent] = useState<string | null>(null)
  const [showBrowser, setShowBrowser] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, mf] = await Promise.all([
        api.getFolders(),
        api.getMediaFolder(),
      ])
      setFolders(list)
      setMediaFolder(mf)
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

  const handleScanMediaFolder = async () => {
    if (!mediaFolder) return
    setLoading(true)
    try {
      await api.scanDirectory(mediaFolder)
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
      await api.scanDirectory(path)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigate('/library')}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtn} onClick={() => navigate('/guide')}>Guía</button>
          <button style={styles.navBtn} onClick={() => navigate('/channels')}>Canales</button>
          <button style={styles.navBtnActive}>Carpetas</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>
          {profile?.name} {profile?.avatar}
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Carpetas</h1>
        </div>

        <div style={styles.mediaFolderSection}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Carpeta principal de contenido</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            Todos tus videos se organizan dentro de esta carpeta. La app escanea automáticamente las subcarpetas.
          </p>

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
              <button style={styles.btn} onClick={() => {
                setFolderInput(mediaFolder)
                setEditingFolder(true)
              }}>✏️</button>
            </div>
          )}

          {mediaFolder && (
            <button style={{ ...styles.btn, background: '#e50914', marginTop: 12 }} onClick={handleScanMediaFolder}>
              🔍 Escanear carpeta principal
            </button>
          )}
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
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' },
  sidebar: { width: 200, background: '#141414', padding: 20, display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid #1f1f1f' },
  logo: { fontSize: 20, fontWeight: 800, color: '#e50914' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: { padding: '10px 16px', background: 'transparent', color: '#a0a0a0', borderRadius: 6, textAlign: 'left', fontSize: 14 },
  navBtnActive: { padding: '10px 16px', background: '#1f1f1f', color: '#fff', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 600 },
  main: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 700 },
  mediaFolderSection: { background: '#1f1f1f', borderRadius: 8, padding: 16 },
  folderEditRow: { display: 'flex', gap: 8 },
  folderDisplayRow: { display: 'flex', gap: 8, alignItems: 'center' },
  folderPath: { fontSize: 14, color: '#a0a0a0', fontFamily: 'monospace', flex: 1 },
  input: { padding: '8px 12px', background: '#141414', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14 },
  btn: { padding: '8px 16px', background: '#333', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  browserOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  browserModal: { background: '#1f1f1f', borderRadius: 12, width: '60%', maxWidth: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  browserHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #333', fontSize: 14, fontFamily: 'monospace' },
  browserList: { flex: 1, overflow: 'auto', padding: 8 },
  browserItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, fontSize: 14, cursor: 'default' },
  selectBtn: { padding: '4px 10px', background: '#e50914', color: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 600, marginLeft: 'auto' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1f1f1f', borderRadius: 8 },
  cardInfo: { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' },
  cardPath: { fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardCount: { fontSize: 12, color: '#888' },
  cardActions: { display: 'flex', gap: 8, flexShrink: 0 },
  actionBtn: { padding: '6px 12px', background: '#333', border: 'none', color: '#fff', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#a0a0a0' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
}
