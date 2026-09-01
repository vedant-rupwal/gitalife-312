import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).json(body);

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
};

const getOrigin = (req) => {
  const configuredOrigin = process.env.APP_ORIGIN || process.env.VITE_APP_ORIGIN;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, '');
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${protocol}://${host}` : undefined;
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

  const { email, role = 'user', assigned_hub_id: assignedHubId = null } = req.body || {};
  if (!email || typeof email !== 'string') {
    return json(res, 400, { error: 'Email is required.' });
  }
  if (!['admin', 'user'].includes(role)) {
    return json(res, 400, { error: 'Invalid role.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await serviceClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json(res, 401, { error: authError?.message || 'Invalid admin session.' });
  }

  const { data: adminProfile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    return json(res, 403, { error: 'Only root admins can invite users.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const assignedHubIds = assignedHubId ? [assignedHubId] : [];
  const profileValues = {
    email: normalizedEmail,
    role,
    assigned_hub_id: assignedHubId || null,
    assigned_hub_ids: assignedHubIds,
  };

  const { data: existingProfile, error: lookupError } = await serviceClient
    .from('profiles')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    return json(res, 400, { error: lookupError.message });
  }

  if (existingProfile?.id) {
    const { data: updatedProfile, error: updateError } = await serviceClient
      .from('profiles')
      .update(profileValues)
      .eq('id', existingProfile.id)
      .select('id, email, role, assigned_hub_id, assigned_hub_ids')
      .single();

    if (updateError) {
      return json(res, 400, { error: updateError.message });
    }

    return json(res, 200, { profile: updatedProfile, already_registered: true });
  }

  const redirectTo = `${getOrigin(req)}/reset-password`;
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
  });

  if (inviteError) {
    return json(res, 400, { error: inviteError.message });
  }

  const invitedUser = inviteData.user;
  if (invitedUser?.id) {
    const { error: updateError } = await serviceClient
      .from('profiles')
      .upsert({
        id: invitedUser.id,
        ...profileValues,
      }, { onConflict: 'id' });

    if (updateError) {
      return json(res, 400, { error: updateError.message });
    }
  }

  return json(res, 200, { user: invitedUser, already_registered: false });
}
