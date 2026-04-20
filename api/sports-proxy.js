const ALLOWED_HOSTS = {
  football:   'https://v3.football.api-sports.io',
  tennis:     'https://v1.tennis.api-sports.io',
  basketball: 'https://v1.basketball.api-sports.io',
  f1:         'https://v1.formula-1.api-sports.io',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { sport, path } = req.query;
  if (!sport || !path) return res.status(400).json({ error: 'Missing sport or path' });

  const base = ALLOWED_HOSTS[sport];
  if (!base) return res.status(400).json({ error: `Unknown sport: ${sport}` });

  const apiKey = process.env.API_FOOTBALL_KEY || process.env.VITE_API_FOOTBALL_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const url = `${base}${path}`;
  console.log(`[proxy] ${sport} → ${url}`);

  try {
    const upstream = await fetch(url, {
      headers: {
        'x-rapidapi-key':  apiKey,
        'x-apisports-key': apiKey,
        'x-rapidapi-host': base.replace('https://', ''),
      },
    });
    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[proxy] error:', err?.message);
    return res.status(502).json({ error: 'Upstream fetch failed', detail: err?.message });
  }
};
