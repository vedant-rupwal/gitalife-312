import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).json(body);

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getConfiguredRecipients = () => {
  const value = process.env.SIGNUP_NOTIFICATION_EMAILS || process.env.ADMIN_NOTIFICATION_EMAIL || '';
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
};

const createServiceClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const getAdminRecipients = async (serviceClient) => {
  const configured = getConfiguredRecipients();
  if (configured.length > 0) return configured;

  if (!serviceClient) return [];

  const { data, error } = await serviceClient
    .from('profiles')
    .select('email')
    .eq('role', 'admin');

  if (error) return [];
  return [...new Set((data || []).map((profile) => profile.email).filter(Boolean))];
};

const getSignupRecord = async ({ kind, signupId, serviceClient }) => {
  if (kind === 'event') {
    const { data: signup, error } = await serviceClient
      .from('event_signups')
      .select('id, event_id, event_title, name, email, phone, created_at')
      .eq('id', signupId)
      .single();
    if (error) throw error;

    const { data: item } = await serviceClient
      .from('community_events')
      .select('id, title, event_date, location, hub_id')
      .eq('id', signup.event_id)
      .maybeSingle();

    return {
      signup,
      item: item ? {
        id: item.id,
        title: item.title,
        date: item.event_date,
        location: item.location,
        hub_id: item.hub_id,
      } : {
        id: signup.event_id,
        title: signup.event_title,
      },
    };
  }

  const { data: signup, error } = await serviceClient
    .from('volunteer_signups')
    .select('id, opportunity_id, opportunity_title, name, email, phone, note, created_at')
    .eq('id', signupId)
    .single();
  if (error) throw error;

  const { data: item } = await serviceClient
    .from('volunteer_opportunities')
    .select('id, title, starts_at, location, hub_id')
    .eq('id', signup.opportunity_id)
    .maybeSingle();

  return {
    signup,
    item: item ? {
      id: item.id,
      title: item.title,
      date: item.starts_at,
      location: item.location,
      hub_id: item.hub_id,
    } : {
      id: signup.opportunity_id,
      title: signup.opportunity_title,
    },
  };
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Chicago',
  });
};

const buildMessage = ({ kind, signup, item }) => {
  const label = kind === 'volunteer' ? 'volunteer signup' : 'event signup';
  const title = item?.title || signup?.event_title || signup?.opportunity_title || 'Untitled';
  const subject = `New ${label}: ${title}`;
  const rows = [
    ['Type', kind === 'volunteer' ? 'Volunteer' : 'Event'],
    ['For', title],
    ['Date', formatDate(item?.date)],
    ['Location', item?.location || 'Not set'],
    ['Name', signup?.name],
    ['Email', signup?.email],
    ['Phone', signup?.phone],
  ];

  if (signup?.note) rows.push(['Note', signup.note]);

  const text = rows
    .map(([key, value]) => `${key}: ${value || 'Not provided'}`)
    .join('\n');

  const htmlRows = rows.map(([key, value]) => `
    <tr>
      <td style="padding:8px 12px;color:#6b7280;font-weight:700;text-transform:uppercase;font-size:12px;">${escapeHtml(key)}</td>
      <td style="padding:8px 12px;color:#111827;">${escapeHtml(value || 'Not provided')}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(subject)}</h1>
      <table style="border-collapse:collapse;border:1px solid #e5e7eb;">${htmlRows}</table>
    </div>
  `;

  return { subject, text, html };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return json(res, 202, { skipped: true, reason: 'RESEND_API_KEY is not configured.' });
  }

  const { kind, signup, token } = req.body || {};
  const serviceClient = createServiceClient();
  const recipients = await getAdminRecipients(serviceClient);
  if (recipients.length === 0) {
    return json(res, 202, { skipped: true, reason: 'No admin notification recipients configured.' });
  }

  if (kind === 'test') {
    if (!process.env.SIGNUP_TEST_TOKEN || token !== process.env.SIGNUP_TEST_TOKEN) {
      return json(res, 403, { error: 'Invalid test token.' });
    }

    const message = {
      subject: 'GitaLife 312 signup email test',
      text: 'This is a test notification from GitaLife 312.',
      html: '<p>This is a test notification from GitaLife 312.</p>',
    };
    return sendEmail({ res, recipients, replyTo: recipients[0], message });
  }

  if (!serviceClient) {
    return json(res, 202, { skipped: true, reason: 'Supabase server env vars are not configured.' });
  }

  if (!['event', 'volunteer'].includes(kind) || !signup?.id) {
    return json(res, 400, { error: 'Invalid signup notification payload.' });
  }

  let record;
  try {
    record = await getSignupRecord({ kind, signupId: signup.id, serviceClient });
  } catch {
    return json(res, 404, { error: 'Signup was not found.' });
  }

  const message = buildMessage({ kind, signup: record.signup, item: record.item });
  return sendEmail({ res, recipients, replyTo: record.signup.email, message });
}

const sendEmail = async ({ res, recipients, replyTo, message }) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.SIGNUP_NOTIFICATION_FROM || 'GitaLife 312 <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Resend notification failed', response.status, body);
    return json(res, response.status, { error: body.message || 'Email notification failed.' });
  }

  console.info('Signup notification sent', { id: body.id, recipients });
  return json(res, 200, { sent: true, id: body.id });
};
