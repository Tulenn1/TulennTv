import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Profile } from '../shared/types'
import { api } from '../lib/api'

interface AppState {
  profile: Profile | null
  profiles: Profile[]
  loading: boolean
  isElectron: boolean
  setProfile: (profile: Profile) => void
  refreshProfiles: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const isElectron = !!window.electronAPI

  const refreshProfiles = async () => {
    const list = await api.getProfiles()
    setProfiles(list)
  }

  useEffect(() => {
    const init = async () => {
      try {
        await refreshProfiles()
        const active = await api.getActiveProfile()
        if (active) setProfile(active)
      } catch (err) {
        console.error('Failed to load profiles:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  return (
    <AppContext.Provider value={{ profile, profiles, loading, isElectron, setProfile, refreshProfiles }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
