import { createClient } from '@supabase/supabase-js';

const DEFAULT_HF_MODEL = 'openai/gpt-oss-20b:fastest';
const HF_ROUTER_BASE_URL = 'https://router.huggingface.co/v1';
const CHAT_TIMEOUT_MS = 25000;

const json = (res, status, body) => res.status(status).json(body);

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

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const safeText = (value = '', max = 800) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

const getAllowedHubIds = (profile) => {
  if (profile?.role === 'admin') return null;
  return [
    profile?.assigned_hub_id,
    ...(Array.isArray(profile?.assigned_hub_ids) ? profile.assigned_hub_ids : []),
  ].filter(Boolean);
};

const assertCanUseHub = (profile, hubId) => {
  if (!hubId || profile?.role === 'admin') return;
  const allowed = getAllowedHubIds(profile) || [];
  if (!allowed.includes(hubId)) {
    throw new Error('You can only generate drafts for your assigned hub.');
  }
};

const filterByAccess = (rows, profile, field = 'hub_id') => {
  if (profile?.role === 'admin') return rows || [];
  const allowed = new Set(getAllowedHubIds(profile) || []);
  return (rows || []).filter((row) => row?.[field] && allowed.has(row[field]));
};

const summarizeRows = (rows, fields, limit = 8) => (rows || [])
  .slice(0, limit)
  .map((row) => fields
    .map(([label, field]) => `${label}: ${safeText(row[field], 180) || 'Not set'}`)
    .join('; '))
  .join('\n');

const getContext = async ({ supabase, profile, hubId }) => {
  const hubFilter = hubId ? { column: 'id', value: hubId } : null;
  let hubsQuery = supabase.from('hubs').select('id,name,campus,neighborhood,meeting_day,meeting_time,description');
  if (hubFilter) hubsQuery = hubsQuery.eq(hubFilter.column, hubFilter.value);

  const [hubsRes, eventsRes, contactsRes, opportunitiesRes, eventSignupsRes, volunteerSignupsRes] = await Promise.all([
    hubsQuery.limit(25),
    supabase.from('community_events').select('id,hub_id,title,type,location,event_date,description').order('event_date', { ascending: false }).limit(30),
    supabase.from('hub_contacts').select('id,hub_id,name,email,phone,how_found,note,created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('volunteer_opportunities').select('id,hub_id,event_id,title,description,role_details,location,starts_at,signup_count,needed_count').order('starts_at', { ascending: false }).limit(30),
    supabase.from('event_signups').select('id,event_id,event_title,name,email,phone,created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('volunteer_signups').select('id,opportunity_id,opportunity_title,name,email,phone,note,created_at').order('created_at', { ascending: false }).limit(30),
  ]);

  if (hubsRes.error) throw hubsRes.error;

  const hubs = filterByAccess(hubsRes.data || [], profile, 'id');
  const allowedHubIds = new Set(hubs.map((hub) => hub.id));
  const events = filterByAccess(eventsRes.data || [], profile).filter((event) => !hubId || event.hub_id === hubId);
  const eventIds = new Set(events.map((event) => event.id));
  const opportunities = (opportunitiesRes.data || []).filter((item) => {
    const canUseOpportunity = profile.role === 'admin'
      || (item.hub_id && allowedHubIds.has(item.hub_id))
      || eventIds.has(item.event_id);
    return canUseOpportunity && (!hubId || item.hub_id === hubId || eventIds.has(item.event_id));
  });
  const opportunityIds = new Set(opportunities.map((item) => item.id));
  const contacts = filterByAccess(contactsRes.data || [], profile).filter((contact) => !hubId || contact.hub_id === hubId);
  const eventSignups = (eventSignupsRes.data || []).filter((signup) => eventIds.has(signup.event_id));
  const volunteerSignups = (volunteerSignupsRes.data || []).filter((signup) => opportunityIds.has(signup.opportunity_id));

  return [
    `Hubs:\n${summarizeRows(hubs, [['Name', 'name'], ['Campus', 'campus'], ['Neighborhood', 'neighborhood'], ['Meeting', 'meeting_day'], ['Time', 'meeting_time'], ['Description', 'description']]) || 'No hub context.'}`,
    `Recent events:\n${summarizeRows(events, [['Title', 'title'], ['Type', 'type'], ['Location', 'location'], ['Date', 'event_date'], ['Description', 'description']]) || 'No event context.'}`,
    `Volunteer opportunities:\n${summarizeRows(opportunities, [['Title', 'title'], ['Location', 'location'], ['Date', 'starts_at'], ['Description', 'description'], ['Volunteer info', 'role_details']]) || 'No volunteer context.'}`,
    `Recent hub contacts:\n${summarizeRows(contacts, [['Name', 'name'], ['How found', 'how_found'], ['Note', 'note'], ['Created', 'created_at']]) || 'No hub contacts.'}`,
    `Recent event signups:\n${summarizeRows(eventSignups, [['Event', 'event_title'], ['Name', 'name'], ['Created', 'created_at']]) || 'No event signups.'}`,
    `Recent volunteer signups:\n${summarizeRows(volunteerSignups, [['Opportunity', 'opportunity_title'], ['Name', 'name'], ['Note', 'note']]) || 'No volunteer signups.'}`,
  ].join('\n\n');
};

const callHuggingFace = async (prompt) => {
  const token = getEnv('HF_TOKEN', 'HUGGING_FACE_TOKEN');
  if (!token) throw new Error('Missing HF_TOKEN in Vercel environment variables.');

  const model = getEnv('HF_MODEL') || DEFAULT_HF_MODEL;
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
            content: 'You are a private admin content assistant for GitaLife 312. Create drafts only. Do not claim something is published, sent, or posted. Keep devotional content aligned with ISKCON and Srila Prabhupada. Use warm, clear, community-focused language. Avoid excessive symbols, markdown tables, and decorative formatting.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: 800,
        temperature: 0.55,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Supabase server env vars are not configured.' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing admin session.' });
  }

  const body = parseRequestBody(req.body);
  const draftType = safeText(body.draft_type || 'event', 40);
  const title = safeText(body.title || `AI ${draftType} draft`, 140);
  const instructions = safeText(body.instructions, 1800);
  const hubId = safeText(body.hub_id, 80) || null;

  if (!instructions) {
    return json(res, 400, { error: 'Tell the assistant what to draft.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await serviceClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json(res, 401, { error: authError?.message || 'Invalid admin session.' });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id,email,role,assigned_hub_id,assigned_hub_ids')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    return json(res, 403, { error: 'Admin profile not found.' });
  }

  const allowedHubIds = getAllowedHubIds(profile);
  if (profile.role !== 'admin' && (!allowedHubIds || allowedHubIds.length === 0)) {
    return json(res, 403, { error: 'Only root admins and assigned hub admins can generate drafts.' });
  }

  try {
    assertCanUseHub(profile, hubId);
  } catch (error) {
    return json(res, 403, { error: error.message });
  }

  const context = await getContext({ supabase: serviceClient, profile, hubId });
  const prompt = [
    `Draft type: ${draftType}`,
    `Draft title: ${title}`,
    `Admin instructions: ${instructions}`,
    '',
    'Relevant GitaLife 312 backend context:',
    context,
    '',
    'Return only the draft content. Make it ready for an admin to review, edit, copy, or paste.',
  ].join('\n');

  try {
    const content = await callHuggingFace(prompt);
    const { data: draft, error: draftError } = await serviceClient
      .from('ai_drafts')
      .insert({
        title,
        draft_type: draftType,
        body: content || '',
        prompt: instructions,
        hub_id: hubId,
        created_by: authData.user.id,
        status: 'draft',
      })
      .select('*')
      .single();

    if (draftError) throw draftError;
    return json(res, 200, { draft });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Draft generation failed.' });
  }
}
