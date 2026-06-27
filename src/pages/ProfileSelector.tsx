import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

const AVATARS = ['😎', '🦊', '🐱', '🐶', '🐼', '🚀', '🎮', '🎵', '🌈', '⭐']

export default function ProfileSelector() {
  const { profiles, setProfile, refreshProfiles } = useApp()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('😎')

  const handleSelect = async (p: typeof profiles[0]) => {
    await api.setActiveProfile(p.id)
    setProfile(p)
    navigate('/library')
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    const profile = await api.createProfile({ name: name.trim(), avatar })
    await api.setActiveProfile(profile.id)
    await refreshProfiles()
    setProfile(profile)
    navigate('/library')
  }

  if (showCreate) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Nuevo Perfil</h1>
          <input
            style={styles.input}
            placeholder="Nombre"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  ...styles.avatarBtn,
                  border: avatar === a ? '2px solid #e50914' : '2px solid transparent',
                  transform: avatar === a ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={styles.btnSecondary} onClick={() => setShowCreate(false)}>Cancelar</button>
            <button style={styles.btnPrimary} onClick={handleCreate}>Crear</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>TulennTv</h1>
        <p style={styles.subtitle}>¿Quién está viendo?</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {profiles.map(p => (
            <button key={p.id} style={styles.profileBtn} onClick={() => handleSelect(p)}>
              <span style={{ fontSize: 48 }}>{p.avatar || '😎'}</span>
              <span style={styles.profileName}>{p.name}</span>
            </button>
          ))}
          <button style={styles.profileBtn} onClick={() => setShowCreate(true)}>
            <span style={{ fontSize: 48, opacity: 0.5 }}>+</span>
            <span style={styles.profileName}>Agregar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'var(--bg-primary)', padding: 20,
  },
  card: {
    textAlign: 'center' as const, maxWidth: 600,
  },
  logo: {
    fontSize: 48, color: '#e50914', fontWeight: 800, marginBottom: 8, letterSpacing: -1,
  },
  subtitle: {
    color: '#a0a0a0', fontSize: 20, marginBottom: 32,
  },
  profileBtn: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer',
    padding: 16, borderRadius: 8, transition: 'background 0.2s',
  },
  profileName: {
    fontSize: 14, color: '#a0a0a0',
  },
  input: {
    width: '100%', padding: '12px 16px', fontSize: 16,
    background: 'var(--bg-card)', border: '1px solid #333', borderRadius: 8,
    color: '#fff', marginTop: 16,
  },
  avatarBtn: {
    fontSize: 32, background: 'var(--bg-card)', border: '2px solid transparent',
    borderRadius: 8, padding: 8, cursor: 'pointer', transition: 'all 0.2s',
  },
  btnPrimary: {
    flex: 1, padding: '12px 24px', fontSize: 16, fontWeight: 600,
    background: '#e50914', color: '#fff', borderRadius: 8, border: 'none',
  },
  btnSecondary: {
    flex: 1, padding: '12px 24px', fontSize: 16, fontWeight: 600,
    background: '#333', color: '#fff', borderRadius: 8, border: 'none',
  },
}
