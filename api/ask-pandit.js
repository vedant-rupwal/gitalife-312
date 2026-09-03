const DEFAULT_HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const HF_ROUTER_BASE_URL = 'https://router.huggingface.co/v1';
const MAX_VISIBLE_TEXT_CHARS = 6000;
const MAX_HISTORY_ITEMS = 8;
const MAX_VERSES = 750;
const MAX_CONTEXT_VERSES = 6;

const getEnv = (...names) => {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return '';
};

const parseRequestBody = (body) => {
  if (!body) return {};
  if (typeof body !== 'string') return body;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const tokenize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

const unique = (items) => [...new Set(items)];

const normalizeVerse = (verse) => ({
  chapter: verse.chapter,
  verse_ref: verse.verse_ref || verse.verse_number,
  sanskrit: verse.sanskrit || '',
  transliteration: verse.transliteration || '',
  translation: verse.translation || '',
  source_url: verse.source_url || '',
});

const scoreVerse = (verse, tokens) => {
  const haystack = `${verse.translation} ${verse.transliteration} ${verse.sanskrit}`.toLowerCase();
  return tokens.reduce((score, token) => {
    if (haystack.includes(token)) return score + 1;
    return score;
  }, 0);
};

const formatContext = (verses) => {
  if (!verses.length) return 'No matching verses were found in the local Bhagavad-gita table.';

  return verses
    .map((verse) => {
      const citation = `BG ${verse.chapter}.${verse.verse_ref}`;
      return [
        `Citation: ${citation}`,
        verse.sanskrit ? `Devanagari: ${verse.sanskrit}` : '',
        verse.transliteration ? `Transliteration: ${verse.transliteration}` : '',
        `Translation: ${verse.translation}`,
        verse.source_url ? `Source: ${verse.source_url}` : '',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
};

const fetchVerseContext = async (question) => {
  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return {
      context: 'The Supabase verse table is not configured for this Vercel function.',
      citations: [],
    };
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/verses?select=chapter,verse_ref,verse_number,sanskrit,transliteration,translation,source_url&is_active=eq.true&limit=${MAX_VERSES}`,
    {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
      },
    },
  );

  if (!response.ok) {
    return {
      context: `The Supabase verse table could not be loaded. Status ${response.status}.`,
      citations: [],
    };
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    return {
      context: 'The Supabase verse table returned an unexpected response.',
      citations: [],
    };
  }

  const tokens = unique(tokenize(question)).slice(0, 24);
  const ranked = rows
    .map(normalizeVerse)
    .map((verse) => ({ verse, score: scoreVerse(verse, tokens) }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, MAX_CONTEXT_VERSES)
    .map((item) => item.verse);

  const fallback = rows.slice(0, 3).map(normalizeVerse);
  const selected = ranked.length ? ranked : fallback;

  return {
    context: formatContext(selected),
    citations: selected.map((verse) => `BG ${verse.chapter}.${verse.verse_ref}`),
  };
};

const buildPrompt = ({ question, visibleScreenText, history, context }) => {
  const recentHistory = history
    .slice(-MAX_HISTORY_ITEMS)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${String(message.text || '').slice(0, 900)}`)
    .join('\n');

  return [
    'You are Ask the Pandit for the GitaLife 312 website.',
    'Answer in clear, gentle English for students and young professionals.',
    'Use only the scripture context provided below when making scriptural claims.',
    'If the context does not contain enough information, say that you do not have enough retrieved scripture to answer fully.',
    'Keep the answer concise and practical.',
    '',
    `Current page text: ${visibleScreenText || 'No page text provided.'}`,
    '',
    `Recent chat:\n${recentHistory || 'No previous messages.'}`,
    '',
    `Retrieved scripture context:\n${context}`,
    '',
    `User question: ${question}`,
  ].join('\n');
};

const callHuggingFace = async (prompt) => {
  const token = getEnv('HF_TOKEN', 'HUGGING_FACE_TOKEN');
  if (!token) {
    throw new Error('Missing HF_TOKEN in Vercel environment variables.');
  }

  const model = getEnv('HF_MODEL') || DEFAULT_HF_MODEL;
  const response = await fetch(
    `${HF_ROUTER_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are Ask the Pandit for GitaLife 312. Answer in English only and do not hallucinate scripture.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: 650,
        temperature: 0.45,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'Hugging Face request failed.');
  }

  return data?.choices?.[0]?.message?.content?.trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseRequestBody(req.body);
  const question = String(body?.user_question || '').trim();
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const visibleScreenText = String(body?.visible_screen_text || '').slice(0, MAX_VISIBLE_TEXT_CHARS);
    const history = Array.isArray(body?.history) ? body.history : [];
    const { context, citations } = await fetchVerseContext(question);
    const prompt = buildPrompt({ question, visibleScreenText, history, context });
    const answer = await callHuggingFace(prompt);
    const citationText = citations.length ? `\n\nCitations: ${unique(citations).join(', ')}` : '';

    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.status(200).send(`${answer || 'I do not have enough retrieved scripture to answer that.'}${citationText}`);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Ask the Pandit failed.',
    });
  }
}
