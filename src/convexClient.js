import React from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'

const configuredConvexUrl = import.meta.env.VITE_CONVEX_URL?.trim().replace(/\/+$/, '')
export const isConvexConfigured = Boolean(
  configuredConvexUrl && !configuredConvexUrl.includes('<') && !configuredConvexUrl.includes('>')
)

if (!isConvexConfigured) {
  console.warn('Live data is not configured. Using a placeholder endpoint so the UI can render.')
}

const convex = new ConvexReactClient(isConvexConfigured ? configuredConvexUrl : 'https://calm-horse-123.convex.cloud', {
  skipConvexDeploymentUrlCheck: !isConvexConfigured,
})

export function ConvexClientProvider({ children }) {
  return React.createElement(ConvexAuthProvider, { client: convex }, children)
}
