import React, { useEffect, useMemo, useState } from 'react'

const dashboardUrl = 'https://dashboard.convex.dev/t/pius-agbenyo-dawfor/datahub-backend/proficient-mule-800'
const cloudUrl = 'https://proficient-mule-800.convex.cloud'
const httpActionsUrl = 'https://proficient-mule-800.convex.site'
const POLL_INTERVAL_MS = 10000

const initialMetrics = {
  checkedAt: null,
  endpoints: [],
  client: null,
  error: '',
}

const HISTORY_LIMIT = 18
const CHART_WIDTH = 640
const CHART_HEIGHT = 140

const monitoredEndpoints = [
  { label: 'Cloud endpoint', url: cloudUrl },
  { label: 'HTTP actions endpoint', url: httpActionsUrl },
]

function formatMs(value) {
  if (!Number.isFinite(value)) return 'Pending'
  return `${Math.max(0, Math.round(value))} ms`
}

function formatCount(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '0'
}

function averageEndpointMs(endpoints) {
  const completed = endpoints.filter((endpoint) => Number.isFinite(endpoint.durationMs))
  if (!completed.length) return 0
  return completed.reduce((sum, endpoint) => sum + endpoint.durationMs, 0) / completed.length
}

function buildSeriesPath(values) {
  if (!values.length) return ''

  const max = Math.max(...values, 1)
  const xStep = values.length > 1 ? CHART_WIDTH / (values.length - 1) : CHART_WIDTH
  const points = values.map((value, index) => {
    const x = values.length > 1 ? index * xStep : CHART_WIDTH
    const y = CHART_HEIGHT - (value / max) * (CHART_HEIGHT - 20) - 10
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  })

  return points.join(' ')
}

function buildAreaPath(values) {
  const line = buildSeriesPath(values)
  if (!line) return ''

  return `${line} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`
}

function MetricChart({ label, values }) {
  const visibleValues = values.length ? values : [0]
  const latest = visibleValues[visibleValues.length - 1]
  const linePath = buildSeriesPath(visibleValues)
  const areaPath = buildAreaPath(visibleValues)

  return (
    <div className="admin-chart-line" aria-label={label}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden="true" focusable="false">
        <path className="admin-chart-area" d={areaPath} />
        <path className="admin-chart-path" d={linePath} />
      </svg>
      <span className="admin-chart-latest">{formatCount(Math.round(latest))}</span>
    </div>
  )
}

function formatPreviewValue(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getClientMetrics() {
  if (typeof window === 'undefined' || !window.performance) return null

  const navigation = performance.getEntriesByType('navigation')[0]
  const resources = performance.getEntriesByType('resource')
  const apiResources = resources.filter((resource) =>
    ['fetch', 'xmlhttprequest', 'beacon'].includes(resource.initiatorType)
  )
  const slowestResource = resources.reduce((slowest, resource) => {
    if (!slowest || resource.duration > slowest.duration) return resource
    return slowest
  }, null)
  const memory = performance.memory

  return {
    pageLoadMs: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
    domReadyMs: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
    transferKb: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0) / 1024,
    resourceCount: resources.length,
    apiCallCount: apiResources.length,
    apiAvgMs: apiResources.length
      ? apiResources.reduce((sum, resource) => sum + resource.duration, 0) / apiResources.length
      : 0,
    slowestResource: slowestResource
      ? {
          name: slowestResource.name.split('/').pop() || slowestResource.name,
          durationMs: slowestResource.duration,
        }
      : null,
    heapMb: memory ? memory.usedJSHeapSize / 1024 / 1024 : null,
  }
}

function endpointStatus(endpoint) {
  if (endpoint.ok) return 'Healthy'
  if (endpoint.status) return `HTTP ${endpoint.status}`
  return 'Unavailable'
}

async function checkEndpointFromBrowser(endpoint) {
  const started = performance.now()

  try {
    const response = await fetch(endpoint.url, {
      method: 'GET',
      cache: 'no-store',
      mode: 'no-cors',
    })

    return {
      ...endpoint,
      ok: true,
      status: response.status || 0,
      durationMs: performance.now() - started,
    }
  } catch (error) {
    return {
      ...endpoint,
      ok: false,
      status: 0,
      durationMs: performance.now() - started,
      error: error.message,
    }
  }
}

export default function Admin() {
  const [metrics, setMetrics] = useState(initialMetrics)
  const [metricHistory, setMetricHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewRows, setPreviewRows] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function refreshMetrics() {
      const client = getClientMetrics()

      try {
        const response = await fetch('/api/performance', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Performance endpoint returned ${response.status}`)
        const serverMetrics = await response.json()
        if (!cancelled) {
          const nextMetrics = {
            ...serverMetrics,
            client,
            error: '',
          }
          setMetrics(nextMetrics)
          setMetricHistory((history) => [
            ...history,
            {
              checkedAt: nextMetrics.checkedAt || new Date().toISOString(),
              apiCallCount: nextMetrics.client?.apiCallCount || 0,
              siteTimingMs: Math.max(nextMetrics.client?.pageLoadMs || 0, averageEndpointMs(nextMetrics.endpoints)),
            },
          ].slice(-HISTORY_LIMIT))
        }
      } catch (error) {
        console.warn('Performance endpoint unavailable; using browser-side timing.', error)
        const browserEndpoints = await Promise.all(monitoredEndpoints.map(checkEndpointFromBrowser))
        if (!cancelled) {
          const nextMetrics = {
            checkedAt: new Date().toISOString(),
            endpoints: browserEndpoints,
            client,
            error: 'Using browser-side endpoint timing because the server metrics route is unavailable here.',
          }
          setMetrics(nextMetrics)
          setMetricHistory((history) => [
            ...history,
            {
              checkedAt: nextMetrics.checkedAt,
              apiCallCount: nextMetrics.client?.apiCallCount || 0,
              siteTimingMs: Math.max(nextMetrics.client?.pageLoadMs || 0, averageEndpointMs(nextMetrics.endpoints)),
            },
          ].slice(-HISTORY_LIMIT))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    refreshMetrics()
    const timer = window.setInterval(refreshMetrics, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  async function loadPreviewRows() {
    setPreviewLoading(true)
    setPreviewError('')

    try {
      const response = await fetch('/api/preview?limit=50', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Preview endpoint returned ${response.status}`)

      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Preview data must be an array.')

      setPreviewRows(data.slice(0, 50))
    } catch (error) {
      setPreviewError(error.message || 'Could not load preview rows.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const openPreview = async () => {
    setPreviewOpen(true)
    if (!previewRows.length && !previewLoading) {
      await loadPreviewRows()
    }
  }

  const closePreview = () => setPreviewOpen(false)

  const endpointAverageMs = useMemo(() => {
    return averageEndpointMs(metrics.endpoints)
  }, [metrics.endpoints])

  const failingEndpoints = metrics.endpoints.filter((endpoint) => !endpoint.ok).length
  const endpointHealthValue = failingEndpoints
    ? `${failingEndpoints} issue${failingEndpoints > 1 ? 's' : ''}`
    : 'Healthy'
  const previewColumns = previewRows.length ? Object.keys(previewRows[0]) : []
  let previewContent = <p>No preview rows available.</p>

  if (previewLoading) {
    previewContent = <p>Loading preview rows...</p>
  } else if (previewError) {
    previewContent = <p className="admin-warning">{previewError}</p>
  } else if (previewRows.length) {
    previewContent = (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead style={{ background: '#f5f5f5' }}>
            <tr>
              {previewColumns.map((column) => (
                <th
                  key={column}
                  style={{ textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #ddd', fontWeight: 600 }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={JSON.stringify(row)} style={{ borderBottom: '1px solid #eee' }}>
                {previewColumns.map((column) => (
                  <td key={column} style={{ padding: '10px', verticalAlign: 'top' }}>
                    {formatPreviewValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const healthCards = [
    {
      label: 'Observed API calls',
      value: formatCount(metrics.client?.apiCallCount),
      detail: `Average client API timing: ${formatMs(metrics.client?.apiAvgMs)}.`,
    },
    {
      label: 'Endpoint latency',
      value: formatMs(endpointAverageMs),
      detail: 'Live server-side checks against deployment endpoints.',
    },
    {
      label: 'Page load',
      value: formatMs(metrics.client?.pageLoadMs),
      detail: `DOM ready in ${formatMs(metrics.client?.domReadyMs)}.`,
    },
    {
      label: 'Endpoint health',
      value: endpointHealthValue,
      detail: metrics.error || 'All live endpoint checks completed.',
    },
  ]

  const functionRows = [
    {
      name: 'Client API calls',
      calls: formatCount(metrics.client?.apiCallCount),
      latency: formatMs(metrics.client?.apiAvgMs),
      status: metrics.client?.apiCallCount ? 'Observed' : 'Quiet',
    },
    ...metrics.endpoints.map((endpoint) => ({
      name: endpoint.label,
      calls: 'Live check',
      latency: formatMs(endpoint.durationMs),
      status: endpointStatus(endpoint),
    })),
  ]

  const checkedLabel = metrics.checkedAt
    ? new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(metrics.checkedAt))
    : 'Pending'
  const apiCallSeries = metricHistory.map((point) => point.apiCallCount)
  const siteTimingSeries = metricHistory.map((point) => point.siteTimingMs)

  return (
    <div className="page-stack">
      <section className="section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Platform administration</p>
            <h2>Live function calls and site performance.</h2>
            <p className="section-copy">
              Real-time browser performance and server-side endpoint checks refresh every {POLL_INTERVAL_MS / 1000} seconds.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="button button-secondary" type="button" onClick={openPreview}>
              Preview data
            </button>
            <a className="button button-dark" href={dashboardUrl} target="_blank" rel="noreferrer">
              Open dashboard
            </a>
          </div>
        </div>

        <div className="admin-health-summary">
          <div className="admin-deployment-card">
            <div>
              <p className="eyebrow">Deployment</p>
              <h3>proficient-mule-800</h3>
              <p>Live status checked at {checkedLabel}</p>
              <p>{loading ? 'Collecting live metrics...' : 'Metrics are refreshing automatically.'}</p>
              {metrics.error ? <p className="admin-warning">{metrics.error}</p> : null}
            </div>
            <div className="admin-url-list">
              <a href={cloudUrl} target="_blank" rel="noreferrer">
                <strong>Cloud URL</strong>
                <span>{cloudUrl}</span>
              </a>
              <a href={httpActionsUrl} target="_blank" rel="noreferrer">
                <strong>HTTP Actions URL</strong>
                <span>{httpActionsUrl}</span>
              </a>
            </div>
          </div>

          <div className="admin-health-grid">
            {healthCards.map((card) => (
              <article className="admin-card admin-health-card" key={card.label}>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
                <span>{card.detail}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="admin-performance-grid">
          <article className="admin-card admin-chart-card">
            <div className="admin-chart-header">
              <h3>Function Calls</h3>
              <span>Live browser session</span>
            </div>
            <MetricChart
              label={`${formatCount(metrics.client?.apiCallCount)} observed API calls in this browser session`}
              values={apiCallSeries}
            />
            <p>
              {formatCount(metrics.client?.apiCallCount)} API calls observed from this admin browser session.
            </p>
          </article>

          <article className="admin-card admin-chart-card">
            <div className="admin-chart-header">
              <h3>Overall Site Performance</h3>
              <span>Live page timing</span>
            </div>
            <MetricChart
              label={`${formatMs(metrics.client?.pageLoadMs)} page load timing with live endpoint timing samples`}
              values={siteTimingSeries}
            />
            <p>
              Loaded {formatCount(metrics.client?.resourceCount)} resources, transferred{' '}
              {formatCount(Math.round(metrics.client?.transferKb || 0))} KB.
              {metrics.client?.slowestResource
                ? ` Slowest resource: ${metrics.client.slowestResource.name} (${formatMs(metrics.client.slowestResource.durationMs)}).`
                : ''}
              {Number.isFinite(metrics.client?.heapMb)
                ? ` JS heap: ${Math.round(metrics.client.heapMb)} MB.`
                : ''}
            </p>
          </article>
        </div>

        <div className="admin-table-card">
          <div className="admin-chart-header">
            <h3>Live Health Checks</h3>
            <span>Last refresh: {checkedLabel}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Calls</th>
                  <th scope="col">Latency</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {functionRows.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td>{row.calls}</td>
                    <td>{row.latency}</td>
                    <td>
                      <span className={`admin-status-pill ${row.status === 'Healthy' || row.status === 'Observed' ? '' : 'admin-status-pill-warn'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {previewOpen ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.72)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#fff',
                borderRadius: '18px',
                boxShadow: '0 32px 80px rgba(0, 0, 0, 0.25)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Dataset preview</h3>
                  <p style={{ margin: '6px 0 0', color: '#555' }}>Showing the first 50 rows of actual data.</p>
                </div>
                <button
                  type="button"
                  onClick={closePreview}
                  style={{
                    border: 'none',
                    background: '#111',
                    color: '#fff',
                    padding: '10px 16px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>

              {previewLoading ? (
                <p>Loading preview rows…</p>
              ) : previewError ? (
                <p className="admin-warning">{previewError}</p>
              ) : previewRows.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead style={{ background: '#f5f5f5' }}>
                      <tr>
                        {previewColumns.map((column) => (
                          <th
                            key={column}
                            style={{ textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #ddd', fontWeight: 600 }}
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`preview-row-${JSON.stringify(row)}`} style={{ borderBottom: '1px solid #eee' }}>
                          {previewColumns.map((column) => (
                            <td key={column} style={{ padding: '10px', verticalAlign: 'top' }}>
                              {formatPreviewValue(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No preview rows available.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
