import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProfileSelector from './pages/ProfileSelector'
import Library from './pages/Library'
import Zapper from './pages/Zapper'
import Guide from './pages/Guide'
import TvConnect from './pages/TvConnect'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useApp()
  if (loading) return null
  if (!profile) return <Navigate to="/profiles" replace />
  return <>{children}</>
}

export default function App() {
  const { profile, loading } = useApp()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
        <div style={{ color: '#e50914', fontSize: 24 }}>TulennTv</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/profiles" element={profile ? <Navigate to="/library" replace /> : <ProfileSelector />} />
      <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
      <Route path="/zapper" element={<ProtectedRoute><Zapper /></ProtectedRoute>} />
      <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
      <Route path="/tv-connect" element={<TvConnect />} />
      <Route path="*" element={<Navigate to={profile ? '/library' : '/profiles'} replace />} />
    </Routes>
  )
}
