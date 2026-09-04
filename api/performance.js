const endpoints = [
  {
    label: 'Cloud endpoint',
    url: 'https://proficient-mule-800.convex.cloud',
  },
  {
    label: 'HTTP actions endpoint',
    url: 'https://proficient-mule-800.convex.site',
  },
]

async function checkEndpoint(endpoint) {
  const started = performance.now()

  try {
    const response = await fetch(endpoint.url, {
      method: 'GET',
      cache: 'no-store',
    })

    return {
      ...endpoint,
      ok: response.ok || response.status < 500,
      status: response.status,
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const results = await Promise.all(endpoints.map(checkEndpoint))

  res.status(200).json({
    checkedAt: new Date().toISOString(),
    endpoints: results,
  })
}
