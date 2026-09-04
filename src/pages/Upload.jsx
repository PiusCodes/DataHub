import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useToast } from '../components/Toast'
import { isConvexConfigured } from '../convexClient'

const checklist = [
  'Validate required metadata and ownership',
  'Store listing details securely',
  'Keep access free unless a price is entered',
]

const PREVIEW_ROW_COUNT = 20
const PREVIEW_COLUMN_COUNT = 20

function parseDelimitedText(text, delimiter = ',') {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      row.push(value)
      value = ''
    } else if (character === '\n' && !quoted) {
      row.push(value)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      value = ''
    } else if (character !== '\r') {
      value += character
    }
  }

  row.push(value)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

function uniqueColumns(values) {
  const counts = new Map()
  return values.slice(0, PREVIEW_COLUMN_COUNT).map((value, index) => {
    const base = String(value ?? '').trim() || `Column ${index + 1}`
    const count = (counts.get(base) || 0) + 1
    counts.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

function makePreviewData(file, text) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'json') {
    try {
      const parsed = JSON.parse(text)
      const sourceRows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : [parsed]
      const objectRows = sourceRows.filter((row) => row && typeof row === 'object' && !Array.isArray(row))

      if (objectRows.length) {
        const columns = uniqueColumns([...new Set(objectRows.flatMap((row) => Object.keys(row)))])
        const rows = objectRows.slice(0, PREVIEW_ROW_COUNT).map((row) => columns.map((column) => row[column] ?? ''))
        return JSON.stringify({ columns, rows })
      }

      const arrayRows = sourceRows.filter((row) => Array.isArray(row))
      const columnCount = Math.min(PREVIEW_COLUMN_COUNT, Math.max(0, ...arrayRows.map((row) => row.length)))
      const columns = Array.from({ length: columnCount }, (_, index) => `Column ${index + 1}`)
      const rows = arrayRows.slice(0, PREVIEW_ROW_COUNT).map((row) => row.slice(0, PREVIEW_COLUMN_COUNT))
      return JSON.stringify({ columns, rows })
    } catch {
      return JSON.stringify({ columns: [], rows: [] })
    }
  }

  const delimiter = extension === 'tsv' ? '\t' : ','
  const parsedRows = parseDelimitedText(text, delimiter)
  const columns = uniqueColumns(parsedRows.shift() || [])
  const rows = parsedRows.slice(0, PREVIEW_ROW_COUNT).map((row) => row.slice(0, PREVIEW_COLUMN_COUNT))
  return JSON.stringify({ columns, rows })
}

export default function Upload() {
  const [form, setForm] = useState({ title: '', description: '', license: 'CC-BY', price: '' })
  const [fileName, setFileName] = useState('')
  const [fileInput, setFileInput] = useState(null)
  const { addToast } = useToast()
  const createDataset = useMutation(api.myFunctions.createDataset)

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleFile(event) {
    const file = event.target.files?.[0]
    setFileInput(event.target)
    setFileName(file ? file.name : '')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!fileInput?.files?.length) {
      addToast('Please choose a file before submitting.', 'error')
      return
    }

    if (!isConvexConfigured) {
      addToast('Dataset publishing is not available yet.', 'error')
      return
    }

    addToast('Validating dataset metadata...', 'info')

    try {
      const file = fileInput.files[0]
      await createDataset({
        title: form.title,
        description: form.description,
        license: form.license,
        price: Number(form.price || 0),
        fileName: file.name,
        previewData: makePreviewData(file, await file.text()),
        tags: ['Open Data'],
      })
      addToast('Dataset listed. Free unless you entered a price.', 'success')
      setForm({ title: '', description: '', license: 'CC-BY', price: '' })
      setFileName('')
      if (fileInput) fileInput.value = ''
    } catch (error) {
      console.error(error)
      addToast(error.message || 'Upload error', 'error')
    }
  }

  return (
    <div className="page-stack">
      <section className="section section-form-layout">
        <div className="section-heading">
          <p className="eyebrow">Dataset upload</p>
          <h2>Publish a dataset with license, quality, and price signals buyers can trust.</h2>
          <p className="section-copy">
            Upload metadata is validated before publishing. Price can be left blank for free, open access.
          </p>
        </div>

        <div className="form-layout">
          <form className="glass-form" onSubmit={handleSubmit}>
            <div className="status-banner">
              <span className="role-pill">Uploader</span>
              <span>Authenticated publishing with ownership checks</span>
            </div>

            <label className="field-label" htmlFor="title">
              Title
            </label>
            <input id="title" className="input" name="title" value={form.title} onChange={handleChange} required />

            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="input textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
            />

            <div className="form-row">
              <div>
                <label className="field-label" htmlFor="license">
                  License
                </label>
                <select id="license" className="input" name="license" value={form.license} onChange={handleChange}>
                  <option>CC-BY</option>
                  <option>CC-BY-NC</option>
                  <option>ODbL</option>
                  <option>Custom</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="price">
                  Price (USD, optional)
                </label>
                <input
                  id="price"
                  className="input"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <label className="field-label" htmlFor="file">
              Dataset file
            </label>
            <input id="file" className="input" type="file" onChange={handleFile} />
            {fileName ? <p className="form-hint">Selected file: {fileName}</p> : null}

            <button className="button button-primary" type="submit">
              Publish dataset
            </button>
          </form>

          <aside className="info-panel">
            <p className="eyebrow">Publishing checks</p>
            <h3>Simple, secure publish flow</h3>
            <ul className="feature-list">
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="metric-pill metric-pill-strong">
              <span>Marketplace default</span>
              <strong>Free unless the uploader sets a price</strong>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
