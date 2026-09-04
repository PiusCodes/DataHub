import React from 'react'
import { Link } from 'react-router-dom'

export default function Taskbar() {
  return (
    <div className="taskbar container" role="toolbar" aria-label="main actions">
      <Link to="/requests" className="task">🔔<div className="task-label">Data Request</div></Link>
      <Link to="/upload" className="task">⬆️<div className="task-label">Upload</div></Link>
      <Link to="/explore" className="task">🔎<div className="task-label">Explore</div></Link>
    </div>
  )
}