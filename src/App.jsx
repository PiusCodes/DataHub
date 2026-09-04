import React, { useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuthActions } from '@convex-dev/auth/react'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Upload from './pages/Upload'
import Requests from './pages/Requests'
import Explore from './pages/Explore'
import Admin from './pages/Admin'
import { useConvexUser } from './utils/convexAuth'

const sidebarItems = [
  { label: 'Home', to: '/', icon: 'H' },
  { label: 'Datasets', to: '/explore', icon: 'D' },
  { label: 'Upload', to: '/upload', icon: 'U', requiresAuth: true },
  { label: 'Requests', to: '/requests', icon: 'R', requiresAuth: true },
  { label: 'Admin', to: '/admin', icon: 'A', developerOnly: true },
  { label: 'Sign In', to: '/signin', icon: 'S', hideWhenSignedIn: true },
]

const topLinks = [
  { label: 'Home', to: '/' },
  { label: 'Datasets', to: '/explore' },
  { label: 'Upload', to: '/upload', requiresAuth: true },
  { label: 'Requests', to: '/requests', requiresAuth: true },
  { label: 'Admin', to: '/admin', developerOnly: true },
]

const routeMeta = {
  '/': {
    badge: 'Open Source Data Workspace',
    title: 'DataHub',
    detail: 'Open datasets by default, paid only when the publisher sets a price.',
  },
  '/explore': {
    badge: 'Dataset Discovery',
    title: 'Explore',
    detail: 'Search open datasets, compare quality signals, and unlock paid listings when needed.',
  },
  '/upload': {
    badge: 'Publisher Flow',
    title: 'Upload',
    detail: 'Submit a dataset, choose a license, and keep it free or set a fair price.',
  },
  '/requests': {
    badge: 'Requests Marketplace',
    title: 'Requests',
    detail: 'Create demand signals and track open data sourcing opportunities.',
  },
  '/admin': {
    badge: 'Admin Console',
    title: 'Admin',
    detail: 'Restricted controls for moderation, integrity, and platform configuration.',
  },
  '/signin': {
    badge: 'Access',
    title: 'Account',
    detail: 'Sign in to publish datasets, request access, and manage marketplace workflows.',
  },
  '/signup': {
    badge: 'Access',
    title: 'Create Account',
    detail: 'Join DataHub as a requester or publisher.',
  },
}

function DeveloperGate({ children }) {
  const { authLoading, isAuthenticated, profileLoading, developerAllowed } = useConvexUser()
  if (authLoading || profileLoading) return null
  if (!isAuthenticated || !developerAllowed) return <Navigate to="/" replace />
  return children
}

function AuthGate({ children }) {
  const { authLoading, isAuthenticated } = useConvexUser()
  if (authLoading || !isAuthenticated) return <Navigate to="/signin" replace />
  return children
}

function ShellLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, developerAllowed } = useConvexUser()
  const devVisible = developerAllowed
  const { signOut } = useAuthActions()

  const meta = useMemo(() => routeMeta[location.pathname] || routeMeta['/'], [location.pathname])
  const visibleSidebarItems = sidebarItems.filter(
    (item) => (!item.developerOnly || devVisible) && (!item.requiresAuth || isAuthenticated)
  )
  const visibleTopLinks = topLinks.filter(
    (item) => (!item.developerOnly || devVisible) && (!item.requiresAuth || isAuthenticated)
  )
  const visibleSidebarWithAuth = visibleSidebarItems.filter((item) => !item.hideWhenSignedIn || !isAuthenticated)

  function handleSignOut() {
    signOut().catch((error) => console.error('Failed to sign out', error))
    navigate('/signin', { replace: true })
  }

  return (
    <div className={`shell ${sidebarOpen ? 'shell-sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink className="brand" to="/" onClick={() => setSidebarOpen(false)}>
            <span className="brand-mark">DataHub</span>
          </NavLink>

          <NavLink className="create-button" to={isAuthenticated ? '/upload' : '/signin'} onClick={() => setSidebarOpen(false)}>
            <span className="create-plus">+</span>
            Publish Dataset
          </NavLink>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {visibleSidebarWithAuth.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <p className="sidebar-note-label">Marketplace rule</p>
          <strong>Open by default</strong>
          <span className="sidebar-note-small">Datasets are free unless the uploader sets a price.</span>
        </div>

        {isAuthenticated ? (
          <button type="button" className="sidebar-link signout-button" onClick={handleSignOut}>
            <span className="sidebar-icon">Q</span>
            <span>Sign out</span>
          </button>
        ) : null}
      </aside>

      <div className="page">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              aria-label="Toggle navigation"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <p className="eyebrow topbar-badge">{meta.badge}</p>
              <div className="topbar-title-row">
                <h1 className="topbar-title">{meta.title}</h1>
                <p className="topbar-detail">{meta.detail}</p>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <nav className="top-links" aria-label="Sections">
              {visibleTopLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.to === '/'}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <NavLink className="register-button" to={isAuthenticated ? '/upload' : '/signup'}>
              {isAuthenticated ? 'Publish' : 'Register'}
            </NavLink>
            {isAuthenticated ? (
              <button className="register-button signout-button" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route
          path="/upload"
          element={
            <AuthGate>
              <Upload />
            </AuthGate>
          }
        />
        <Route
          path="/requests"
          element={
            <AuthGate>
              <Requests />
            </AuthGate>
          }
        />
        <Route
          path="/admin"
          element={
            <DeveloperGate>
              <Admin />
            </DeveloperGate>
          }
        />
        <Route path="/signin" element={<Auth mode="signin" />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
      </Route>
    </Routes>
  )
}
