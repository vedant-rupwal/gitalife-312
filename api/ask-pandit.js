const DEFAULT_HF_MODEL = 'openai/gpt-oss-20b:fastest';
const FALLBACK_HF_MODELS = [
  DEFAULT_HF_MODEL,
  'openai/gpt-oss-120b:fastest',
  'Qwen/Qwen2.5-7B-Instruct:fastest',
];
const DEFAULT_HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_ROUTER_BASE_URL = 'https://router.huggingface.co/v1';
const HF_INFERENCE_BASE_URL = 'https://router.huggingface.co/hf-inference/models';
const CHAT_TIMEOUT_MS = 25000;
const EMBEDDING_TIMEOUT_MS = 12000;
const VECTOR_SEARCH_TIMEOUT_MS = 8000;
const MAX_VISIBLE_TEXT_CHARS = 6000;
const MAX_HISTORY_ITEMS = 8;
const MAX_VERSES = 750;
const MAX_CONTEXT_VERSES = 6;
const MAX_CONTEXT_CHUNKS = 6;

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

const timed = async (label, work, metrics) => {
  const start = Date.now();
  try {
    return await work();
  } finally {
    metrics[label] = Date.now() - start;
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeChatModel = (rawModel) => {
  const model = (rawModel || DEFAULT_HF_MODEL).trim().replace(/-Turbo(?=(:|$))/i, '');
  if (!model) return DEFAULT_HF_MODEL;

  if (!model.includes(':')) return `${model}:fastest`;

  return model;
};

const getChatModelCandidates = () => {
  const configuredModel = normalizeChatModel(getEnv('HF_MODEL'));
  return unique([configuredModel, ...FALLBACK_HF_MODELS]);
};

const getSupabaseConfig = () => ({
  url: getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/+$/, ''),
  key: getEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
});

const buildChunkCitation = (chunk) => {
  if (chunk.citation) return chunk.citation;
  if (chunk.source_ref) return chunk.source_ref;
  if (chunk.book_title && chunk.chapter_num && chunk.verse_num) {
    return `${chunk.book_title} ${chunk.chapter_num}.${chunk.verse_num}`;
  }
  if (chunk.book_title && chunk.verse_num) return `${chunk.book_title} ${chunk.verse_num}`;
  if (chunk.book_title && chunk.chapter_num) return `${chunk.book_title} Chapter ${chunk.chapter_num}`;
  return chunk.book_title || chunk.source_collection || 'Scripture corpus';
};

const formatVectorContext = (chunks) => {
  if (!chunks.length) return 'No matching passages were found in the vector scripture corpus.';

  return chunks
    .map((chunk) => {
      const citation = buildChunkCitation(chunk);
      return [
        `Citation: ${citation}`,
        chunk.content_type ? `Type: ${chunk.content_type}` : '',
        `Text: ${chunk.text_content}`,
        chunk.source_url ? `Source: ${chunk.source_url}` : '',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
};

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
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

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

const normalizeEmbeddingResponse = (data) => {
  if (Array.isArray(data) && data.every((item) => typeof item === 'number')) return data;
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0];
  if (Array.isArray(data?.embeddings) && data.embeddings.every((item) => typeof item === 'number')) return data.embeddings;
  if (Array.isArray(data?.embeddings?.[0])) return data.embeddings[0];
  return null;
};

const fetchQueryEmbedding = async (text) => {
  const token = getEnv('HF_TOKEN', 'HUGGING_FACE_TOKEN');
  if (!token) throw new Error('Missing HF_TOKEN in Vercel environment variables.');

  const model = getEnv('HF_EMBEDDING_MODEL') || DEFAULT_HF_EMBEDDING_MODEL;
  const response = await fetchWithTimeout(`${HF_INFERENCE_BASE_URL}/${model}/pipeline/feature-extraction`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text,
      normalize: true,
      truncate: true,
    }),
  }, EMBEDDING_TIMEOUT_MS);

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
    throw new Error(message || data?.message || 'Hugging Face embedding request failed.');
  }

  const embedding = normalizeEmbeddingResponse(data);
  if (!embedding?.length) {
    throw new Error('Hugging Face embedding response did not include a usable vector.');
  }

  return embedding;
};

const fetchVectorContext = async (question, bookFilter) => {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    return {
      context: 'The Supabase vector scripture table is not configured for this Vercel function.',
      citations: [],
      available: false,
    };
  }

  const queryEmbedding = await fetchQueryEmbedding(question);
  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/rpc/match_scripture_chunks`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_count: MAX_CONTEXT_CHUNKS,
      book_filter: bookFilter ? [bookFilter] : null,
    }),
  }, VECTOR_SEARCH_TIMEOUT_MS);

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Vector scripture search unavailable: ${response.status} ${errorText}`);
    return {
      context: 'The Supabase vector scripture table could not be searched yet.',
      citations: [],
      available: false,
    };
  }

  const rows = await response.json();
  const chunks = Array.isArray(rows) ? rows : [];

  return {
    context: formatVectorContext(chunks),
    citations: chunks.map(buildChunkCitation),
    available: true,
  };
};

const fetchScriptureContext = async (question, bookFilter) => {
  try {
    const vectorContext = await fetchVectorContext(question, bookFilter);
    if (vectorContext.available && vectorContext.citations.length) return vectorContext;
  } catch (error) {
    console.warn('Vector scripture search failed, falling back to verses:', error);
  }

  return fetchVerseContext(question);
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

const callHuggingFaceModel = async (prompt, model) => {
  const token = getEnv('HF_TOKEN', 'HUGGING_FACE_TOKEN');
  if (!token) {
    throw new Error('Missing HF_TOKEN in Vercel environment variables.');
  }

  const response = await fetchWithTimeout(
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
    CHAT_TIMEOUT_MS,
  );

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
    throw new Error(message || data?.message || 'Hugging Face request failed.');
  }

  return data?.choices?.[0]?.message?.content?.trim();
};

const callHuggingFace = async (prompt) => {
  const errors = [];

  for (const model of getChatModelCandidates()) {
    try {
      const answer = await callHuggingFaceModel(prompt, model);
      return { answer, model };
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : 'failed'}`);
      console.warn(`Hugging Face chat model failed for ${model}:`, error);
    }
  }

  throw new Error(`All Hugging Face chat models failed. ${errors.join(' | ')}`);
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
    const metrics = {};
    const debug = body?.debug === true || req.headers['x-pandit-debug'] === '1';
    const visibleScreenText = String(body?.visible_screen_text || '').slice(0, MAX_VISIBLE_TEXT_CHARS);
    const history = Array.isArray(body?.history) ? body.history : [];
    const bookFilter = String(body?.book_filter || '').trim();
    const { context, citations } = await timed('retrieve_ms', () => fetchScriptureContext(question, bookFilter), metrics);
    const prompt = buildPrompt({ question, visibleScreenText, history, context });
    const { answer, model } = await timed('chat_ms', () => callHuggingFace(prompt), metrics);
    const citationText = citations.length ? `\n\nCitations: ${unique(citations).join(', ')}` : '';

    if (debug) {
      res.setHeader('x-pandit-debug', JSON.stringify({
        ...metrics,
        model,
        context_citations: citations.length,
      }));
    }

    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.status(200).send(`${answer || 'I do not have enough retrieved scripture to answer that.'}${citationText}`);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Ask the Pandit failed.',
    });
  }
}
