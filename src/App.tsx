import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProfileSelector from './pages/ProfileSelector'
import Library from './pages/Library'
import Zapper from './pages/Zapper'
import Guide from './pages/Guide'
import TvConnect from './pages/TvConnect'
import FaqModal from './components/FaqModal'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useApp()
  if (loading) return null
  if (!profile) return <Navigate to="/profiles" replace />
  return <>{children}</>
}

export default function App() {
  const { profile, loading } = useApp()
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
      <Routes>
        <Route path="/profiles" element={profile ? <Navigate to="/library" replace /> : <ProfileSelector />} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/zapper" element={<ProtectedRoute><Zapper /></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
        <Route path="/tv-connect" element={<TvConnect />} />
        <Route path="*" element={<Navigate to={profile ? '/library' : '/profiles'} replace />} />
      </Routes>

      {profile && (
        <button style={styles.faqBtn} onClick={() => setFaqOpen(true)} title="Ayuda">?</button>
      )}

      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  faqBtn: {
    position: 'fixed', bottom: 20, right: 20, zIndex: 999,
    width: 40, height: 40, borderRadius: '50%',
    background: '#e50914', color: '#fff', fontSize: 18, fontWeight: 700,
    border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(229,9,20,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}
