import { createClient } from '@supabase/supabase-js';

const MAX_RECIPIENTS = 200;

const json = (res, status, body) => res.status(status).json(body);

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

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const textToHtml = (value = '') => escapeHtml(value)
  .split(/\n{2,}/)
  .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
  .join('');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const uniqueRecipients = (rows) => {
  const seen = new Set();
  return rows
    .map((row) => ({
      email: normalizeEmail(row.email),
      name: String(row.name || row.email || '').trim(),
    }))
    .filter((row) => {
      if (!row.email || !row.email.includes('@') || seen.has(row.email)) return false;
      seen.add(row.email);
      return true;
    })
    .slice(0, MAX_RECIPIENTS);
};

const getAllowedHubIds = (profile) => {
  if (profile?.role === 'admin') return null;
  return [
    profile?.assigned_hub_id,
    ...(Array.isArray(profile?.assigned_hub_ids) ? profile.assigned_hub_ids : []),
  ].filter(Boolean);
};

const canManageHub = (profile, hubId) => {
  if (!hubId) return profile?.role === 'admin';
  if (profile?.role === 'admin') return true;
  return (getAllowedHubIds(profile) || []).includes(hubId);
};

const requireHubAccess = (profile, hubId) => {
  if (!canManageHub(profile, hubId)) {
    throw new Error('You can only email people connected to your assigned hub.');
  }
};

const getEvent = async (supabase, eventId) => {
  const { data, error } = await supabase
    .from('community_events')
    .select('id,title,hub_id')
    .eq('id', eventId)
    .single();
  if (error) throw error;
  return data;
};

const getOpportunity = async (supabase, opportunityId) => {
  const { data, error } = await supabase
    .from('volunteer_opportunities')
    .select('id,title,hub_id,event_id')
    .eq('id', opportunityId)
    .single();
  if (error) throw error;
  return data;
};

const getOpportunityHubId = async (supabase, opportunity) => {
  if (opportunity.hub_id) return opportunity.hub_id;
  if (!opportunity.event_id) return null;
  const event = await getEvent(supabase, opportunity.event_id);
  return event.hub_id;
};

const parseAudienceTypes = (body = {}) => {
  const audiences = Array.isArray(body.audience_types) ? body.audience_types : [body.audience_type];
  return [...new Set(audiences.map((audience) => String(audience || '').trim()).filter(Boolean))];
};

const getRecipientsForAudience = async ({ supabase, profile, body, audience }) => {
  const hubId = body.hub_id || null;
  if (audience === 'manual') {
    if (hubId) requireHubAccess(profile, hubId);
    const manualRows = String(body.manual_emails || '')
      .split(/[\n,;]/)
      .map((email) => ({ email, name: email }));
    return uniqueRecipients(manualRows);
  }

  if (audience === 'saved_list') {
    const listIds = Array.isArray(body.saved_list_ids) ? body.saved_list_ids.filter(Boolean) : [];
    if (!listIds.length) throw new Error('Choose at least one saved list.');

    const { data, error } = await supabase
      .from('email_audience_lists')
      .select('id,name,emails,hub_id')
      .in('id', listIds)
      .limit(50);
    if (error) throw error;

    const rows = (data || []).flatMap((list) => {
      requireHubAccess(profile, list.hub_id);
      return (Array.isArray(list.emails) ? list.emails : []).map((email) => ({ email, name: email }));
    });
    return uniqueRecipients(rows);
  }

  if (audience === 'hub_contacts') {
    requireHubAccess(profile, hubId);
    const { data, error } = await supabase
      .from('hub_contacts')
      .select('name,email')
      .eq('hub_id', hubId)
      .limit(MAX_RECIPIENTS);
    if (error) throw error;
    return uniqueRecipients(data || []);
  }

  if (audience === 'event_signups') {
    const event = await getEvent(supabase, body.event_id);
    requireHubAccess(profile, event.hub_id);
    const { data, error } = await supabase
      .from('event_signups')
      .select('name,email')
      .eq('event_id', event.id)
      .limit(MAX_RECIPIENTS);
    if (error) throw error;
    return uniqueRecipients(data || []);
  }

  if (audience === 'volunteer_signups') {
    const opportunity = await getOpportunity(supabase, body.opportunity_id);
    requireHubAccess(profile, await getOpportunityHubId(supabase, opportunity));
    const { data, error } = await supabase
      .from('volunteer_signups')
      .select('name,email')
      .eq('opportunity_id', opportunity.id)
      .limit(MAX_RECIPIENTS);
    if (error) throw error;
    return uniqueRecipients(data || []);
  }

  if (audience === 'hub_people') {
    requireHubAccess(profile, hubId);
    const { data: contacts, error: contactsError } = await supabase
      .from('hub_contacts')
      .select('name,email')
      .eq('hub_id', hubId)
      .limit(MAX_RECIPIENTS);
    if (contactsError) throw contactsError;

    const { data: events, error: eventsError } = await supabase
      .from('community_events')
      .select('id')
      .eq('hub_id', hubId)
      .limit(500);
    if (eventsError) throw eventsError;

    const eventIds = (events || []).map((event) => event.id);
    const { data: eventSignups } = eventIds.length
      ? await supabase.from('event_signups').select('name,email').in('event_id', eventIds).limit(MAX_RECIPIENTS)
      : { data: [] };

    const { data: opportunities, error: opportunitiesError } = await supabase
      .from('volunteer_opportunities')
      .select('id')
      .eq('hub_id', hubId)
      .limit(500);
    if (opportunitiesError) throw opportunitiesError;

    const opportunityIds = (opportunities || []).map((opportunity) => opportunity.id);
    const { data: volunteerSignups } = opportunityIds.length
      ? await supabase.from('volunteer_signups').select('name,email').in('opportunity_id', opportunityIds).limit(MAX_RECIPIENTS)
      : { data: [] };

    return uniqueRecipients([...(contacts || []), ...(eventSignups || []), ...(volunteerSignups || [])]);
  }

  throw new Error('Choose who should receive this email.');
};

const getRecipients = async ({ supabase, profile, body }) => {
  const audiences = parseAudienceTypes(body);
  if (!audiences.length) throw new Error('Choose who should receive this email.');

  const recipientGroups = await Promise.all(
    audiences.map((audience) => getRecipientsForAudience({ supabase, profile, body, audience })),
  );

  return uniqueRecipients(recipientGroups.flat());
};

const sendOne = async ({ apiKey, from, replyTo, recipient, subject, body }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient.email],
      reply_to: replyTo || undefined,
      subject,
      text: body,
      html: textToHtml(body),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Resend failed to send an email.');
  }
  return data.id;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Supabase server env vars are not configured.' });
  }
  if (!resendApiKey) {
    return json(res, 500, { error: 'RESEND_API_KEY is not configured.' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing admin session.' });

  const body = parseRequestBody(req.body);
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  if (!subject || !message) {
    return json(res, 400, { error: 'Subject and message are required.' });
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
  if (profile.role !== 'admin' && !(getAllowedHubIds(profile) || []).length) {
    return json(res, 403, { error: 'Only root admins and assigned hub admins can send emails.' });
  }

  let recipients;
  try {
    recipients = await getRecipients({ supabase: serviceClient, profile, body });
  } catch (error) {
    return json(res, 400, { error: error.message || 'Could not load recipients.' });
  }

  if (!recipients.length) {
    return json(res, 400, { error: 'No recipients found for that audience.' });
  }

  const from = process.env.SIGNUP_NOTIFICATION_FROM || process.env.ADMIN_EMAIL_FROM || 'GitaLife 312 <onboarding@resend.dev>';
  const sentIds = [];
  try {
    for (const recipient of recipients) {
      const id = await sendOne({
        apiKey: resendApiKey,
        from,
        replyTo: profile.email,
        recipient,
        subject,
        body: message,
      });
      sentIds.push(id);
    }
  } catch (error) {
    console.error('Admin email failed', error);
    return json(res, 502, {
      error: error.message || 'Email failed to send.',
      sent_count: sentIds.length,
      recipient_count: recipients.length,
    });
  }

  return json(res, 200, {
    sent: true,
    sent_count: sentIds.length,
    recipient_count: recipients.length,
  });
}
