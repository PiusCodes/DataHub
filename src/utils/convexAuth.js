import { useMemo } from 'react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { isConvexConfigured } from '../convexClient'

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function getDeveloperAllowlist() {
  const raw = import.meta.env.VITE_DEVELOPER_EMAILS || ''
  return raw
    .split(',')
    .map(normalize)
    .filter(Boolean)
}

export function useConvexUser() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const profile = useQuery(api.myFunctions.getCurrentUserProfile, isConvexConfigured && isAuthenticated ? {} : 'skip')
  const email = normalize(profile?.email)
  const role = normalize(profile?.role)
  const developerAllowed = Boolean(email && getDeveloperAllowlist().includes(email))
  const profileLoading = isConvexConfigured && isAuthenticated && profile === undefined

  return {
    authLoading: isLoading,
    isAuthenticated,
    profile,
    profileLoading,
    email,
    role,
    developerAllowed,
  }
}
