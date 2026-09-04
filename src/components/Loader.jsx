import React from 'react'

export default function Loader({ size = 16 }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 50 50" className="loader" aria-hidden>
      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" stroke="currentColor" opacity="0.22"></circle>
      <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
    </svg>
  )
}
