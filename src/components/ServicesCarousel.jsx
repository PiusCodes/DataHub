import React, { useEffect, useState } from 'react'

const items = [
  {
    title: 'Automated Appraisal',
    desc: 'Schema inference, PII detection, completeness and quality scoring using Django appraisal service.',
  },
  {
    title: 'Publish Your Data',
    desc: 'Make your datasets discoverable and accessible to the community.',
  },
  {
    title: 'Discover & Explore',
    desc: 'Search, filter and preview dataset samples with quality scores and schema metadata.',
  },
]

export default function ServicesCarousel({ interval = 4000 }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), interval)
    return () => clearInterval(id)
  }, [interval])

  function go(i) {
    setIndex((prev) => {
      if (i === 'next') return (prev + 1) % items.length
      if (i === 'prev') return (prev - 1 + items.length) % items.length
      return i % items.length
    })
  }

  return (
    <section className="carousel container" aria-roledescription="carousel">
      <div className="carousel-inner" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((it, i) => (
          <div key={it.title} className={`carousel-item ${i === index ? 'active' : ''}`} aria-hidden={i !== index}>
            <h3>{it.title}</h3>
            <p>{it.desc}</p>
          </div>
        ))}
      </div>
      <div className="carousel-controls">
        <button className="btn" onClick={() => go('prev')} aria-label="Previous">◀</button>
        <div className="dots">
          {items.map((_, i) => (
            <button key={i} className={`dot ${i === index ? 'dot-active' : ''}`} onClick={() => go(i)} aria-label={`Go to slide ${i+1}`}></button>
          ))}
        </div>
        <button className="btn" onClick={() => go('next')} aria-label="Next">▶</button>
      </div>
    </section>
  )
}