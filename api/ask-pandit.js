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
const MAX_WEBSITE_ITEMS = 100;
const FOLLOW_UP_PATTERNS = [
  /^(tell me )?more\.?$/i,
  /^tell me more( about (it|that|this))?\.?$/i,
  /^(go|continue) (on|deeper)\.?$/i,
  /^explain (more|that|this)\.?$/i,
  /^what (does that mean|about that|about this)\??$/i,
  /^why\??$/i,
  /^how so\??$/i,
];

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

const sanitizeAssistantAnswer = (value = '') =>
  String(value)
    .replace(/\\+\s*\n/g, '\n')
    .replace(/\\([*_`[\]()#+\-.!])/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const textIncludesAny = (text, terms) => terms.some((term) => text.includes(term));

const editDistance = (left, right) => {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
};

const tokensMatch = (sourceToken, targetToken) => {
  if (sourceToken === targetToken) return true;
  if (targetToken.length < 5 || sourceToken.length < 5) return false;
  return editDistance(sourceToken, targetToken) <= 2;
};

const tokenOverlapScore = (source, target) => {
  const sourceTokens = unique(tokenize(source));
  const targetTokens = unique(tokenize(target));
  if (!sourceTokens.length || !targetTokens.length) return 0;

  return targetTokens.reduce((score, token) => (
    sourceTokens.some((sourceToken) => tokensMatch(sourceToken, token)) ? score + 1 : score
  ), 0) / targetTokens.length;
};

const fieldMatchScore = (question, value) => {
  const normalizedQuestion = normalizeText(question);
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return 0;
  if (normalizedQuestion.includes(normalizedValue)) return 1;

  const questionTokens = normalizedQuestion.split(' ');
  const valueTokens = normalizedValue.split(' ').filter(Boolean);
  if (valueTokens.some((token) => token.length >= 3 && questionTokens.includes(token))) {
    return 0.8;
  }

  return tokenOverlapScore(normalizedQuestion, normalizedValue);
};

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
  urls: unique([
    getEnv('SUPABASE_URL'),
    getEnv('VITE_SUPABASE_URL'),
  ].filter(Boolean).map((url) => url.replace(/\/+$/, ''))),
  keys: unique([
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
  ].filter(Boolean)),
});

const getHost = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
};

const fetchSupabase = async (path, options = {}, timeoutMs) => {
  const { urls, keys } = getSupabaseConfig();
  if (!urls.length || !keys.length) {
    return {
      response: null,
      host: null,
      keyIndex: -1,
      error: 'missing_supabase_config',
    };
  }

  let lastText = '';

  for (const supabaseUrl of urls) {
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const response = await fetchWithTimeout(`${supabaseUrl}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          apikey: key,
          authorization: `Bearer ${key}`,
        },
      }, timeoutMs);

      if (response.status !== 401 && response.status !== 403 && response.status !== 404) {
        return { response, host: getHost(supabaseUrl), keyIndex: index, error: null };
      }

      lastText = await response.text();
    }
  }

  return {
    response: null,
    host: getHost(urls[urls.length - 1]),
    keyIndex: keys.length - 1,
    error: lastText || 'supabase_auth_failed',
  };
};

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

const formatWebsiteContext = ({ hubs, events, volunteerOpportunities, impactStats }) => {
  const sections = [];

  if (hubs.length) {
    sections.push([
      'Hubs:',
      ...hubs.map((hub) => [
        `- ${hub.name}`,
        hub.campus ? `campus: ${hub.campus}` : '',
        hub.neighborhood ? `neighborhood: ${hub.neighborhood}` : '',
        hub.meeting_day || hub.meeting_time ? `meeting: ${[hub.meeting_day, hub.meeting_time].filter(Boolean).join(' ')}` : '',
        hub.description ? `description: ${hub.description}` : '',
      ].filter(Boolean).join('; ')),
    ].join('\n'));
  }

  if (events.length) {
    sections.push([
      'Upcoming events:',
      ...events.map((event) => [
        `- ${event.title}`,
        event.type ? `type: ${event.type}` : '',
        event.event_date ? `date: ${event.event_date}` : '',
        event.location ? `location: ${event.location}` : '',
        event.description ? `description: ${event.description}` : '',
      ].filter(Boolean).join('; ')),
    ].join('\n'));
  }

  if (volunteerOpportunities.length) {
    sections.push([
      'Volunteer opportunities:',
      ...volunteerOpportunities.map((opportunity) => [
        `- ${opportunity.title}`,
        opportunity.location ? `location: ${opportunity.location}` : '',
        opportunity.starts_at ? `starts: ${opportunity.starts_at}` : '',
        opportunity.description ? `description: ${opportunity.description}` : '',
      ].filter(Boolean).join('; ')),
    ].join('\n'));
  }

  if (impactStats.length) {
    sections.push([
      'Impact stats:',
      ...impactStats.map((stat) => `- ${stat.label}: ${stat.value}${stat.unit ? ` ${stat.unit}` : ''}`),
    ].join('\n'));
  }

  return sections.join('\n\n') || 'No live website data was retrieved.';
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
  const result = await fetchSupabase(
    `/rest/v1/verses?select=chapter,verse_ref,verse_number,sanskrit,transliteration,translation,source_url&is_active=eq.true&limit=${MAX_VERSES}`,
    {},
  );

  if (!result.response) {
    return {
      context: 'The Supabase verse table is not configured for this Vercel function.',
      citations: [],
      source: 'verses',
      host: result.host || null,
      row_count: 0,
      selected_count: 0,
      reason: result.error,
    };
  }

  const { response } = result;

  if (!response.ok) {
    return {
      context: `The Supabase verse table could not be loaded. Status ${response.status}.`,
      citations: [],
      source: 'verses',
      host: result.host || null,
      row_count: 0,
      selected_count: 0,
      reason: `rest_${response.status}`,
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
    source: 'verses',
    host: result.host || null,
    row_count: rows.length,
    selected_count: selected.length,
  };
};

const fetchTableRows = async (path) => {
  let result;
  try {
    result = await fetchSupabase(path, {}, VECTOR_SEARCH_TIMEOUT_MS);
  } catch (error) {
    console.warn(`Website context fetch failed for ${path}:`, error);
    return [];
  }

  if (!result.response?.ok) return [];

  const rows = await result.response.json();
  return Array.isArray(rows) ? rows : [];
};

const fetchWebsiteContext = async () => {
  const today = new Date().toISOString();
  const [hubs, events, volunteerOpportunities, impactStats] = await Promise.all([
    fetchTableRows(`/rest/v1/hubs?select=id,name,campus,neighborhood,meeting_day,meeting_time,description&order=name.asc&limit=${MAX_WEBSITE_ITEMS}`),
    fetchTableRows(`/rest/v1/community_events?select=id,title,type,event_date,location,description&event_date=gte.${encodeURIComponent(today)}&order=event_date.asc&limit=${MAX_WEBSITE_ITEMS}`),
    fetchTableRows(`/rest/v1/volunteer_opportunities?select=id,title,description,location,starts_at&is_active=eq.true&order=starts_at.asc.nullslast&limit=${MAX_WEBSITE_ITEMS}`),
    fetchTableRows(`/rest/v1/impact_stats?select=label,value,unit&order=sort_order.asc&limit=${MAX_WEBSITE_ITEMS}`),
  ]);

  return {
    text: formatWebsiteContext({ hubs, events, volunteerOpportunities, impactStats }),
    hubs,
    events,
    volunteerOpportunities,
    impactStats,
  };
};

const findBestMatch = (question, items, fields) => {
  let best = null;

  for (const item of items) {
    const score = Math.max(
      ...fields.map((field) => fieldMatchScore(question, item[field])),
      fieldMatchScore(question, fields.map((field) => item[field]).filter(Boolean).join(' ')),
    );

    if (!best || score > best.score) best = { item, score };
  }

  return best?.score >= 0.55 ? best.item : null;
};

const determineNavigationAction = (question, websiteContext) => {
  const normalizedQuestion = normalizeText(question);
  const hubs = websiteContext?.hubs || [];
  const events = websiteContext?.events || [];
  const volunteerOpportunities = websiteContext?.volunteerOpportunities || [];

  const matchedHub = findBestMatch(question, hubs, ['name', 'campus', 'neighborhood']);
  if (matchedHub?.id && textIncludesAny(normalizedQuestion, ['hub', 'center', 'campus', 'neighborhood', 'group', 'club', 'meet', 'meeting', 'class', 'session', normalizeText(matchedHub.name), normalizeText(matchedHub.campus)])) {
    return {
      type: 'navigate',
      path: `/hubs/${matchedHub.id}`,
      label: `Opening ${matchedHub.name}`,
    };
  }

  const matchedOpportunity = findBestMatch(question, volunteerOpportunities, ['title', 'description', 'location']);
  if (matchedOpportunity?.id && textIncludesAny(normalizedQuestion, ['volunteer', 'seva', 'help', 'service', normalizeText(matchedOpportunity.title)])) {
    return {
      type: 'navigate',
      path: '/volunteer',
      label: `Opening volunteer opportunities`,
    };
  }

  const matchedEvent = findBestMatch(question, events, ['title', 'type', 'location']);
  if (matchedEvent?.type && textIncludesAny(normalizedQuestion, ['event', 'class', 'kirtan', 'retreat', 'program', normalizeText(matchedEvent.title)])) {
    return {
      type: 'navigate',
      path: `/events?type=${encodeURIComponent(matchedEvent.type)}`,
      label: `Opening ${matchedEvent.type} events`,
    };
  }

  if (textIncludesAny(normalizedQuestion, ['kirtan', 'harinam', 'chanting'])) {
    return { type: 'navigate', path: '/events?type=kirtan', label: 'Opening kirtan events' };
  }

  if (textIncludesAny(normalizedQuestion, ['retreat', 'retreats'])) {
    return { type: 'navigate', path: '/events?type=retreat', label: 'Opening retreat events' };
  }

  if (textIncludesAny(normalizedQuestion, ['volunteer', 'volunteering', 'seva', 'service opportunities'])) {
    return { type: 'navigate', path: '/volunteer', label: 'Opening volunteer opportunities' };
  }

  if (textIncludesAny(normalizedQuestion, ['impact', 'stats', 'service numbers'])) {
    return { type: 'navigate', path: '/impact', label: 'Opening impact' };
  }

  if (textIncludesAny(normalizedQuestion, ['gallery', 'photos', 'pictures'])) {
    return { type: 'navigate', path: '/gallery', label: 'Opening photo gallery' };
  }

  if (textIncludesAny(normalizedQuestion, ['hubs', 'hub', 'find a hub', 'map'])) {
    return { type: 'navigate', path: '/hubs', label: 'Opening hubs' };
  }

  if (textIncludesAny(normalizedQuestion, ['events', 'programs', 'classes'])) {
    return { type: 'navigate', path: '/events', label: 'Opening events' };
  }

  return null;
};

const isWebsiteQuestion = (question, navigationAction) => {
  if (navigationAction) return true;

  return textIncludesAny(normalizeText(question), [
    'website',
    'site',
    'gitalife',
    'hub',
    'hubs',
    'event',
    'events',
    'kirtan',
    'retreat',
    'volunteer',
    'volunteering',
    'impact',
    'gallery',
    'photos',
    'signup',
    'sign up',
    'where is',
    'when is',
    'show me',
    'open',
    'take me',
  ]);
};

const stripCurrentQuestionFromHistory = (history, question) => {
  const cleanHistory = history
    .filter((message) => message && ['user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role,
      text: String(message.text || '').trim(),
    }))
    .filter((message) => message.text);

  const last = cleanHistory[cleanHistory.length - 1];
  if (last?.role === 'user' && last.text === question) {
    return cleanHistory.slice(0, -1);
  }

  return cleanHistory;
};

const isFollowUpQuestion = (question) => {
  const normalized = String(question || '').trim();
  if (FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  const tokens = tokenize(normalized);
  if (tokens.length <= 4 && textIncludesAny(normalizeText(normalized), ['more', 'that', 'this', 'deeper'])) {
    return true;
  }

  return false;
};

const buildContextualQuestion = (question, history) => {
  if (!isFollowUpQuestion(question) || !history.length) return question;

  const lastUser = [...history].reverse().find((message) => message.role === 'user')?.text || '';
  const lastAssistant = [...history].reverse().find((message) => message.role === 'assistant')?.text || '';

  return [
    'The user is asking a follow-up question in the same conversation.',
    lastUser ? `Previous user topic: ${lastUser.slice(0, 500)}` : '',
    lastAssistant ? `Previous assistant answer: ${lastAssistant.slice(0, 900)}` : '',
    `Current follow-up: ${question}`,
    'Retrieve scripture context that continues the previous topic.',
  ].filter(Boolean).join('\n');
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
  const { urls, keys } = getSupabaseConfig();

  if (!urls.length || !keys.length) {
    return {
      context: 'The Supabase vector scripture table is not configured for this Vercel function.',
      citations: [],
      available: false,
      reason: 'missing_supabase_config',
    };
  }

  const queryEmbedding = await fetchQueryEmbedding(question);
  const result = await fetchSupabase('/rest/v1/rpc/match_scripture_chunks', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_count: MAX_CONTEXT_CHUNKS,
      book_filter: bookFilter ? [bookFilter] : null,
    }),
  }, VECTOR_SEARCH_TIMEOUT_MS);

  const { response } = result;

  if (!response) {
    return {
      context: 'The Supabase vector scripture table could not be searched yet.',
      citations: [],
      available: false,
      host: result.host || null,
      reason: result.error,
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Vector scripture search unavailable: ${response.status} ${errorText}`);
    return {
      context: 'The Supabase vector scripture table could not be searched yet.',
      citations: [],
      available: false,
      host: result.host || null,
      reason: `rpc_${response.status}`,
    };
  }

  const rows = await response.json();
  const chunks = Array.isArray(rows) ? rows : [];

  return {
    context: formatVectorContext(chunks),
    citations: chunks.map(buildChunkCitation),
    available: true,
    source: 'scripture_chunks',
    host: result.host || null,
    row_count: chunks.length,
  };
};

const fetchScriptureContext = async (question, bookFilter, debugInfo = {}) => {
  try {
    const vectorContext = await fetchVectorContext(question, bookFilter);
    debugInfo.vector = {
      available: vectorContext.available,
      reason: vectorContext.reason || null,
      host: vectorContext.host || null,
      row_count: vectorContext.row_count || 0,
      citations: vectorContext.citations.length,
    };
    if (vectorContext.available && vectorContext.citations.length) return vectorContext;
  } catch (error) {
    debugInfo.vector = {
      available: false,
      reason: error instanceof Error ? error.message : 'unknown_vector_error',
      row_count: 0,
      citations: 0,
    };
    console.warn('Vector scripture search failed, falling back to verses:', error);
  }

  const verseContext = await fetchVerseContext(question);
  debugInfo.fallback = {
    source: verseContext.source || 'verses',
    reason: verseContext.reason || null,
    host: verseContext.host || null,
    row_count: verseContext.row_count || 0,
    selected_count: verseContext.selected_count || 0,
    citations: verseContext.citations.length,
  };
  return verseContext;
};

const buildPrompt = ({ question, contextualQuestion, visibleScreenText, history, scriptureContext, websiteContext, websiteQuestion, navigationAction }) => {
  const recentHistory = history
    .slice(-MAX_HISTORY_ITEMS)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${String(message.text || '').slice(0, 900)}`)
    .join('\n');

  return [
    'You are Ask the Pandit for the GitaLife 312 website.',
    'Answer in clear, gentle English for students and young professionals, like a kind person having a real conversation.',
    'Give enough explanation to feel helpful: usually 2-4 short paragraphs, and brief bullets only when they make the idea easier to follow.',
    'Use simple plain-text formatting only. Do not use Markdown tables, bold markers, decorative symbols, stray backslashes, or raw formatting symbols.',
    'Your theological viewpoint must be strictly ISKCON and Srila Prabhupada centered.',
    'For scripture, philosophy, theology, practice, Krishna consciousness, guru, devotional life, or meaning-of-life questions, use only the retrieved scriptures, translations, and purports provided below.',
    'Do not use outside traditions, speculative interpretations, generic Hinduism, Advaita, New Age ideas, or non-ISKCON commentary as authority.',
    'If the retrieved scripture context does not contain enough information for a scriptural claim, say that you do not have enough retrieved Srila Prabhupada/ISKCON scripture context to answer fully.',
    'For questions about this website, GitaLife 312, events, hubs, volunteering, impact, navigation, or signups, you may answer from the website context and current page text below.',
    'If this is a website or navigation question, focus on helping the visitor use the site. Do not force a scripture citation into the answer.',
    navigationAction ? `The website will navigate for the visitor: ${navigationAction.label} (${navigationAction.path}). Briefly acknowledge that naturally.` : '',
    websiteQuestion ? 'This user question is classified as a website/navigation question.' : 'This user question is classified as a scripture/philosophy/practice question.',
    'Keep the answer concise, practical, and natural, like an ongoing conversation.',
    '',
    `Current page text: ${visibleScreenText || 'No page text provided.'}`,
    '',
    `Website context:\n${websiteContext || 'No live website context provided.'}`,
    '',
    `Recent chat:\n${recentHistory || 'No previous messages.'}`,
    '',
    `Retrieved Srila Prabhupada/ISKCON scripture context:\n${scriptureContext}`,
    '',
    contextualQuestion !== question ? `Contextual meaning of the user question:\n${contextualQuestion}` : '',
    '',
    `User question: ${question}`,
  ].filter(Boolean).join('\n');
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
            content: 'You are Ask the Pandit for GitaLife 312. Answer in English only. Sound warm and human, like an ongoing conversation. Scripture and theology answers must be strictly ISKCON and Srila Prabhupada centered, using only retrieved scripture, translation, and purport context. Website questions may use provided website context. Keep formatting plain; avoid Markdown symbols.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: 850,
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
    const retrievalDebug = {};
    const debug = body?.debug === true || req.headers['x-pandit-debug'] === '1';
    const visibleScreenText = String(body?.visible_screen_text || '').slice(0, MAX_VISIBLE_TEXT_CHARS);
    const history = stripCurrentQuestionFromHistory(Array.isArray(body?.history) ? body.history : [], question);
    const contextualQuestion = buildContextualQuestion(question, history);
    const bookFilter = String(body?.book_filter || '').trim();
    const [{ context: scriptureContext, citations, source }, websiteContext] = await timed(
      'retrieve_ms',
      () => Promise.all([
        fetchScriptureContext(contextualQuestion, bookFilter, retrievalDebug),
        fetchWebsiteContext(),
      ]),
      metrics,
    );
    const navigationAction = determineNavigationAction(question, websiteContext);
    const websiteQuestion = isWebsiteQuestion(question, navigationAction);
    const prompt = buildPrompt({
      question,
      contextualQuestion,
      visibleScreenText,
      history,
      scriptureContext,
      websiteContext: websiteContext.text,
      websiteQuestion,
      navigationAction,
    });
    const { answer, model } = await timed('chat_ms', () => callHuggingFace(prompt), metrics);
    const cleanAnswer = sanitizeAssistantAnswer(answer);
    const citationText = !websiteQuestion && citations.length ? `\n\nReferences: ${unique(citations).join(', ')}` : '';

    if (debug) {
      res.setHeader('x-pandit-debug', JSON.stringify({
        ...metrics,
        model,
        context_citations: citations.length,
        context_source: source || 'unknown',
        retrieval: retrievalDebug,
      }));
    }

    if (navigationAction) {
      res.setHeader('x-pandit-action', JSON.stringify(navigationAction));
    }

    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.status(200).send(`${cleanAnswer || 'I do not have enough retrieved scripture to answer that.'}${citationText}`);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Ask the Pandit failed.',
    });
  }
}
