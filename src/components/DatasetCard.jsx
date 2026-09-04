import React from 'react'

export default function DatasetCard({ dataset, onPrimaryAction, actionLabel = 'View', children }) {
  const updated = dataset.updated || new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(dataset.updatedAt || dataset.createdAt || Date.now())
  )
  const priceLabel = dataset.price > 0 ? `$${dataset.price}` : 'Free'

  function handlePrimaryClick(event) {
    event.preventDefault()
    event.stopPropagation()
    onPrimaryAction?.(event)
  }

  return (
    <article className="dataset-card">
      <div className="dataset-card-top">
        <div>
          <p className="dataset-license">{dataset.license}</p>
          <h3>{dataset.title}</h3>
        </div>
        <span className="quality-badge">Quality {dataset.quality}</span>
      </div>

      <p className="dataset-description">{dataset.description}</p>

      <div className="preview-box">
        <span className="preview-label">Preview</span>
        <p>{dataset.preview}</p>
      </div>

      <div className="tag-list">
        {dataset.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="dataset-card-footer">
        <div className="dataset-meta">
          <span>{dataset.records}</span>
          <span>{updated}</span>
          <span>{dataset.access}</span>
        </div>

        <div className="dataset-buy">
          <strong>{priceLabel}</strong>
          <button className="button button-dark" type="button" onClick={handlePrimaryClick}>
            {actionLabel}
          </button>
        </div>
      </div>

      {children ? <div className="dataset-card-inline">{children}</div> : null}
    </article>
  )
}
