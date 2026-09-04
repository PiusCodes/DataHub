export default function handler(req, res) {
  const timestamp = new Date().toISOString();
  const body = req.body ?? {};
  const entry = {
    timestamp,
    method: req.method,
    path: req.url,
    body,
  };

  console.log('[vercel-log]', JSON.stringify(entry));
  res.status(200).json({ ok: true, received: entry });
}
