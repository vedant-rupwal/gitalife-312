import fs from 'node:fs';

const env = {};
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const supabaseUrl = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY.');
}

const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/match_scripture_chunks`, {
  method: 'POST',
  headers: {
    apikey: supabaseKey,
    authorization: `Bearer ${supabaseKey}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    query_embedding: `[${Array(384).fill(0.01).join(',')}]`,
    match_count: 3,
    book_filter: null,
  }),
});

const text = await response.text();
console.log(JSON.stringify({
  status: response.status,
  body_preview: text.slice(0, 900),
}, null, 2));
