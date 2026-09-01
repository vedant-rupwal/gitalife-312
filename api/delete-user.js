import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).json(body);

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(res, 500, { error: 'Supabase server env vars are not configured.' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing admin session.' });
  }

  const { user_id: userId } = req.body || {};
  if (!userId || typeof userId !== 'string') {
    return json(res, 400, { error: 'User id is required.' });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json(res, 401, { error: 'Invalid admin session.' });
  }

  const { data: adminProfile, error: adminProfileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (adminProfileError || adminProfile?.role !== 'admin') {
    return json(res, 403, { error: 'Only root admins can delete hub admins.' });
  }

  if (authData.user.id === userId) {
    return json(res, 400, { error: 'You cannot delete your own account.' });
  }

  const { data: targetProfile, error: targetProfileError } = await serviceClient
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (targetProfileError) {
    return json(res, 404, { error: 'User not found.' });
  }
  if (targetProfile.role === 'admin') {
    return json(res, 400, { error: 'Root admin accounts cannot be deleted here.' });
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json(res, 400, { error: deleteError.message });
  }

  return json(res, 200, { deleted: true });
}
