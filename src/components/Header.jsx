import React from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="header">
      <nav className="nav container">
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <Link to="/" className="brand">DataHub </Link>
          <div className="nav-links" style={{display:'flex', gap:12}}>
            <Link to="/explore">Explore</Link>
            <Link to="/upload">Upload</Link>
            <Link to="/requests">Data Requests</Link>
          </div>
        </div>

        <div style={{display:'flex', alignItems:'center', gap: '0.75rem'}}>
          <input aria-label="search" className="search-input" placeholder="Search datasets, tags..." />
          <Link to="/signin">Sign in</Link>
          <Link to="/signup" className="cta">Get started</Link>
        </div>
      </nav>
    </header>
  )
}
