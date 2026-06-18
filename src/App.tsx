import { useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProfileSelector from './pages/ProfileSelector'
import Library from './pages/Library'
import Zapper from './pages/Zapper'
import Guide from './pages/Guide'
import ChannelsPage from './pages/Channels'
import Folders from './pages/Folders'
import TvConnect from './pages/TvConnect'
import FaqModal from './components/FaqModal'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useApp()
  if (loading) return null
  if (!profile) return <Navigate to="/profiles" replace />
  return <>{children}</>
}

function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useApp()
  if (!profile || location.pathname === '/zapper') return null

  const tabs = [
    { path: '/library', icon: '📚', label: 'Biblioteca' },
    { path: '/zapper', icon: '📺', label: 'Zapping' },
    { path: '/guide', icon: '📋', label: 'Guía' },
    { path: '/tv-connect', icon: '📡', label: 'Conectar' },
  ]

  return (
    <div className="mobile-nav" style={mobileNav.container}>
      {tabs.map(t => (
        <button
          key={t.path}
          style={{
            ...mobileNav.tab,
            color: location.pathname === t.path ? '#e50914' : '#666',
          }}
          onClick={() => navigate(t.path)}
        >
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={mobileNav.label}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

const mobileNav: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
    background: '#141414', borderTop: '1px solid #333',
    padding: '6px 0', display: 'flex', justifyContent: 'space-around',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
  },
  label: { fontSize: 10, fontWeight: 600 },
}

export default function App() {
  const { profile, loading } = useApp()
  const location = useLocation()
  const isZapping = location.pathname === '/zapper'
  const [faqOpen, setFaqOpen] = useState(false)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
        <div style={{ color: '#e50914', fontSize: 24 }}>TulennTv</div>
      </div>
    )
  }

  return (
    <>
      <MobileNav />
      <Routes>
        <Route path="/profiles" element={profile ? <Navigate to="/library" replace /> : <ProfileSelector />} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/zapper" element={<ProtectedRoute><Zapper /></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
        <Route path="/channels" element={<ProtectedRoute><ChannelsPage /></ProtectedRoute>} />
        <Route path="/folders" element={<ProtectedRoute><Folders /></ProtectedRoute>} />
        <Route path="/tv-connect" element={<TvConnect />} />
        <Route path="*" element={<Navigate to={profile ? '/library' : '/profiles'} replace />} />
      </Routes>

      {profile && !isZapping && (
        <button style={styles.faqBtn} onClick={() => setFaqOpen(true)} title="Ayuda">?</button>
      )}

      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  faqBtn: {
    position: 'fixed', bottom: 80, right: 20, zIndex: 999,
    width: 40, height: 40, borderRadius: '50%',
    background: '#e50914', color: '#fff', fontSize: 18, fontWeight: 700,
    border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(229,9,20,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}
