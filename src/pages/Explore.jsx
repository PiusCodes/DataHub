import React, { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useToast } from '../components/Toast'
import DatasetCard from '../components/DatasetCard'
import { useConvexUser } from '../utils/convexAuth'
import { isConvexConfigured } from '../convexClient'

const flowSteps = ['Search public listings', 'Compare quality and license', 'Open free data or start checkout']
const PREVIEW_ROW_COUNT = 20
const PREVIEW_COLUMN_COUNT = 20

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadPreviewCsv(dataset, columns, rows) {
  const header = ['Row', ...columns]
  const csv = [header, ...rows.map((row, index) => [index + 1, ...row])]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeTitle = (dataset.title || 'dataset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url
  link.download = `${safeTitle || 'dataset'}-preview.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}



function DatasetPreview({ dataset }) {
  const preview = useMemo(() => {
    if (!dataset.previewData) return null

    try {
      const parsed = JSON.parse(dataset.previewData)
      if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.rows)) return null
      const columns = parsed.columns.slice(0, PREVIEW_COLUMN_COUNT)

      return {
        columns,
        rows: parsed.rows.slice(0, PREVIEW_ROW_COUNT).map((row) => {
          if (Array.isArray(row)) return row.slice(0, PREVIEW_COLUMN_COUNT)
          if (row && typeof row === 'object') return columns.map((column) => row[column] ?? '')
          return [row ?? '']
        }),
      }
    } catch {
      return null
    }
  }, [dataset.previewData])

  const columns = preview?.columns ?? []
  const rows = preview?.rows ?? []
  const previewSummary = `Showing the first ${rows.length} rows and ${columns.length} columns of the saved data.`
  let previewContent = null

  if (rows.length) {
    previewContent = (
      <div className="dataset-preview-table-wrap">
        <table className="dataset-preview-table">
          <thead>
            <tr>
              <th scope="col">Row</th>
              {columns.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex + 1}`}>
                <th scope="row">{rowIndex + 1}</th>
                {columns.map((_, columnIndex) => (
                  <td key={`cell-${rowIndex + 1}-${columnIndex + 1}`}>{row[columnIndex] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  } else {
    previewContent = (
      <p className="dataset-preview-empty">
        No saved row preview is available for this dataset. Upload CSV, TSV, or JSON data to generate a table preview.
      </p>
    )
  }

  return (
    <section className="dataset-inline-preview" aria-label={`${dataset.title} data preview`}>
      <div className="dataset-preview-header">
        <div>
          <p className="eyebrow">Access granted</p>
          <h3>{dataset.title}</h3>
          <p>{previewSummary}</p>
        </div>
        {rows.length ? (
          <button className="button button-dark" type="button" onClick={() => downloadPreviewCsv(dataset, columns, rows)}>
            Download CSV
          </button>
        ) : null}
      </div>

      {previewContent}
    </section>
  )
}

function getDatasetActionLabel(dataset, previewDatasetId) {
  if (previewDatasetId === dataset._id) return 'Hide preview'
  if (dataset.access === 'Access granted') return 'Preview'
  if (dataset.price > 0) return 'Checkout'
  return 'Get Access'
}

export default function Explore() {
  const [search, setSearch] = useState('')
  const [previewDatasetId, setPreviewDatasetId] = useState(null)
  const { addToast } = useToast()
  const { isAuthenticated } = useConvexUser()
  const datasets = useQuery(
    api.myFunctions.listDatasets,
    isConvexConfigured ? { search: search.trim() || undefined } : 'skip'
  )
  const requestAccess = useMutation(api.myFunctions.requestAccess)
  const visibleDatasets = useMemo(() => datasets ?? [], [datasets])
  let catalogContent = (
    <div className="empty-state">
      <h3>No datasets loaded</h3>
      <p>Upload a dataset from the publisher flow and it will appear here after validation.</p>
    </div>
  )

  async function handlePurchase(dataset) {
    if (dataset.access === 'Access granted') {
      setPreviewDatasetId((currentId) => (currentId === dataset._id ? null : dataset._id))
      return
    }

    if (!isAuthenticated) {
      addToast('Sign in to unlock dataset access.', 'error')
      return
    }

    try {
      const result = await requestAccess({ datasetId: dataset._id })
      if (result.status === 'checkout_required') {
        addToast(`"${dataset.title}" is priced at $${dataset.price}. Continue to checkout to unlock access.`, 'info')
      } else {
        addToast(`Access granted for "${dataset.title}".`, 'success')
        setPreviewDatasetId(dataset._id)
      }
    } catch (error) {
      addToast(error.message || 'Could not request access.', 'error')
    }
  }

  if (visibleDatasets.length) {
    catalogContent = (
      <div className="dataset-grid">
        {visibleDatasets.map((dataset) => (
          <DatasetCard
            key={dataset._id}
            dataset={dataset}
            onPrimaryAction={() => handlePurchase(dataset)}
            actionLabel={getDatasetActionLabel(dataset, previewDatasetId)}
          >
            {previewDatasetId === dataset._id ? <DatasetPreview dataset={dataset} /> : null}
          </DatasetCard>
        ))}
      </div>
    )
  } else if (!isConvexConfigured) {
    catalogContent = (
      <div className="empty-state">
        <h3>Catalog unavailable</h3>
        <p>Live marketplace data is not connected yet.</p>
      </div>
    )
  } else if (datasets === undefined) {
    catalogContent = (
      <div className="empty-state">
        <h3>Loading datasets</h3>
        <p>Loading the marketplace catalog.</p>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Dataset discovery</p>
            <h2>Browse open datasets with quality, license, and pricing signals up front.</h2>
            <p className="section-copy">
              Listings are free by default. Publishers can set a price, and paid listings route
              through checkout before file access is granted.
            </p>
          </div>

          <label className="inline-search" aria-label="Search datasets">
            <span>/</span>
            <input
              type="search"
              placeholder="Search datasets"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="flow-strip">
          {flowSteps.map((step, index) => (
            <div key={step} className="flow-step">
              <span className="flow-step-number">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        {catalogContent}
      </section>
    </div>
  )
}
