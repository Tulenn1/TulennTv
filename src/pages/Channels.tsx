import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Channel, Series } from '../shared/types'

export default function ChannelsPage() {
  const { profile } = useApp()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [allSeries, setAllSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formIcon, setFormIcon] = useState('📺')
  const [formSeries, setFormSeries] = useState<string[]>([])

  const ICONS = ['📺', '🎬', '🎥', '📡', '🔴', '🟠', '🟢', '🔵', '🟣', '🎭', '🎪', '🎯', '🎮', '🎵', '🎨', '🔥']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ch, series] = await Promise.all([
        api.getChannels(),
        api.getLibrary(undefined, undefined, profile?.id),
      ])
      setChannels(ch)
      setAllSeries(series)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!formName.trim()) return
    if (editId) {
      await api.updateChannel(editId, formName.trim(), formIcon, formSeries)
    } else {
      await api.createChannel(formName.trim(), formIcon, formSeries)
    }
    setShowCreate(false)
    setEditId(null)
    setFormName('')
    setFormIcon('📺')
    setFormSeries([])
    await load()
  }

  const handleEdit = (ch: Channel) => {
    if (ch.type === 'auto') return
    setEditId(ch.id)
    setFormName(ch.name)
    setFormIcon(ch.icon)
    setFormSeries(ch.seriesIds)
    setShowCreate(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este canal?')) return
    await api.deleteChannel(id)
    await load()
  }

  const toggleSeries = (seriesId: string) => {
    setFormSeries(prev =>
      prev.includes(seriesId)
        ? prev.filter(id => id !== seriesId)
        : [...prev, seriesId]
    )
  }

  if (loading) return <div style={styles.loading}>Cargando...</div>

  return (
    <div style={styles.container}>
      <div style={styles.sidebar} className="sidebar">
        <div style={styles.logo}>TulennTv</div>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigate('/library')}>Biblioteca</button>
          <button style={styles.navBtn} onClick={() => navigate('/zapper')}>Zapping</button>
          <button style={styles.navBtn} onClick={() => navigate('/guide')}>Guía</button>
          <button style={styles.navBtnActive}>Canales</button>
          <button style={styles.navBtn} onClick={() => navigate('/tv-connect')}>Conectar</button>
        </div>
        <div style={{ marginTop: 'auto', fontSize: 12, color: '#555' }}>{profile?.name} {profile?.avatar}</div>
      </div>

      <div style={styles.main} className="main">
        <div className="header" style={styles.header}>
          <h1 style={styles.title}>Canales</h1>
          <button style={styles.addBtn} onClick={() => { setEditId(null); setFormName(''); setFormIcon('📺'); setFormSeries([]); setShowCreate(true) }}>+ Nuevo canal</button>
        </div>

        {showCreate && (
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>{editId ? 'Editar canal' : 'Nuevo canal'}</h3>
              <button style={styles.closeBtn} onClick={() => { setShowCreate(false); setEditId(null) }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={styles.input} placeholder="Nombre del canal" value={formName} onChange={e => setFormName(e.target.value)} />
              <select value={formIcon} onChange={e => setFormIcon(e.target.value)} style={styles.iconSelect}>
                {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Series en este canal:</p>
            <div style={styles.seriesList}>
              {allSeries.map(s => (
                <label key={s.id} style={styles.seriesItem}>
                  <input type="checkbox" checked={formSeries.includes(s.id)} onChange={() => toggleSeries(s.id)} style={{ accentColor: '#e50914' }} />
                  <span>{s.title}</span>
                  <span style={{ fontSize: 11, color: '#666', marginLeft: 'auto' }}>{s.type}</span>
                </label>
              ))}
            </div>
            <button style={styles.saveBtn} onClick={handleSave}>{editId ? 'Guardar' : 'Crear'}</button>
          </div>
        )}

        <div style={styles.channelList}>
          {channels.map(ch => (
            <div key={ch.id} style={styles.channelCard}>
              <div style={styles.channelHeader}>
                <span style={{ fontSize: 24 }}>{ch.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={styles.channelName}>{ch.name}</span>
                  <span style={styles.channelBadge}>{ch.type === 'auto' ? 'auto' : 'custom'}</span>
                </div>
                <span style={styles.seriesCount}>{ch.seriesIds.length} serie{ch.seriesIds.length !== 1 ? 's' : ''}</span>
                {ch.type === 'custom' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={styles.smallBtn} onClick={() => handleEdit(ch)}>✏️</button>
                    <button style={{ ...styles.smallBtn, color: '#e50914' }} onClick={() => handleDelete(ch.id)}>✕</button>
                  </div>
                )}
              </div>
              <div style={styles.channelSeries}>
                {ch.seriesIds.map(sid => {
                  const s = allSeries.find(x => x.id === sid)
                  return s ? <span key={sid} style={styles.seriesTag}>{s.title}</span> : null
                })}
                {ch.seriesIds.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>Sin series</span>}
              </div>
            </div>
          ))}
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
  addBtn: { padding: '8px 20px', background: '#e50914', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#a0a0a0', background: '#0a0a0a' },
  modal: { background: '#1f1f1f', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'transparent', border: 'none', color: '#a0a0a0', fontSize: 18, cursor: 'pointer' },
  input: { padding: '8px 12px', background: '#141414', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14, flex: 1 },
  iconSelect: { padding: '8px', background: '#141414', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 18 },
  seriesList: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflow: 'auto' },
  seriesItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, fontSize: 13, cursor: 'pointer' },
  saveBtn: { padding: '10px', background: '#e50914', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 14, marginTop: 8 },
  channelList: { display: 'flex', flexDirection: 'column', gap: 8 },
  channelCard: { background: '#1f1f1f', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 },
  channelHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  channelName: { fontSize: 16, fontWeight: 600, marginRight: 8 },
  channelBadge: { padding: '2px 8px', borderRadius: 10, fontSize: 10, background: '#333', color: '#888' },
  seriesCount: { fontSize: 12, color: '#888', marginRight: 8 },
  smallBtn: { background: '#333', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  channelSeries: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  seriesTag: { padding: '3px 10px', background: '#141414', borderRadius: 12, fontSize: 12, color: '#aaa' },
}
