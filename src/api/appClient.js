import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const resolvedSupabaseUrl = supabaseUrl || 'https://example.supabase.co';
const resolvedSupabaseAnonKey = supabaseAnonKey || 'missing-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Supabase calls will fail until these are configured.');
}

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const tableNames = {
  CommunityEvent: 'community_events',
  EventSignup: 'event_signups',
  Hub: 'hubs',
  ImpactStat: 'impact_stats',
  JapaLog: 'japa_logs',
  User: 'profiles',
  Verse: 'verses',
  VolunteerOpportunity: 'volunteer_opportunities',
  VolunteerSignup: 'volunteer_signups',
};

const orderFieldAliases = {
  created_date: 'created_at',
};

const normalizeRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    created_date: row.created_date || row.created_at,
    updated_date: row.updated_date || row.updated_at,
  };
};

const normalizeRows = (rows) => (Array.isArray(rows) ? rows.map(normalizeRow) : rows);

const throwIfError = ({ error }) => {
  if (error) throw error;
};

const HUB_IMAGES_BUCKET = 'hub-images';
const EVENT_IMAGES_BUCKET = 'event-images';
const DEFAULT_GEOCODE_REGION = import.meta.env.VITE_GEOCODE_REGION || 'Chicago, IL, USA';

const cleanFileName = (fileName = 'hub-image') => {
  const [name, ...rest] = fileName.split('.');
  const extension = rest.pop() || 'jpg';
  const safeName = (name || 'hub-image')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'hub-image';

  return `${safeName}.${extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'}`;
};

const toCoordinate = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const buildHubGeocodeQuery = ({ campus, neighborhood, name } = {}) => {
  const location = [campus, neighborhood].filter(Boolean).join(', ') || name;
  return [location, DEFAULT_GEOCODE_REGION].filter(Boolean).join(', ');
};

const applyFilters = (query, filters = {}) => {
  return Object.entries(filters).reduce((nextQuery, [key, value]) => {
    if (Array.isArray(value)) return nextQuery.in(key, value);
    if (value === null) return nextQuery.is(key, null);
    return nextQuery.eq(key, value);
  }, query);
};

const applyOrder = (query, order) => {
  if (!order) return query;
  const descending = order.startsWith('-');
  const field = descending ? order.slice(1) : order;
  return query.order(orderFieldAliases[field] || field, { ascending: !descending });
};

const applyLimit = (query, limit) => {
  return limit ? query.limit(limit) : query;
};

const createEntity = (entityName) => {
  const tableName = tableNames[entityName];

  if (!tableName) {
    throw new Error(`No Supabase table configured for ${entityName}.`);
  }

  return {
    async list(order, limit) {
      let query = supabase.from(tableName).select('*');
      query = applyOrder(query, order);
      query = applyLimit(query, limit);
      const { data, error } = await query;
      throwIfError({ error });
      return normalizeRows(data || []);
    },

    async filter(filters = {}, order, limit) {
      let query = supabase.from(tableName).select('*');
      query = applyFilters(query, filters);
      query = applyOrder(query, order);
      query = applyLimit(query, limit);
      const { data, error } = await query;
      throwIfError({ error });
      return normalizeRows(data || []);
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      throwIfError({ error });
      return normalizeRow(data);
    },

    async create(values) {
      const { data, error } = await supabase.from(tableName).insert(values).select('*').single();
      throwIfError({ error });
      return normalizeRow(data);
    },

    async update(id, values) {
      const { data, error } = await supabase.from(tableName).update(values).eq('id', id).select('*').single();
      throwIfError({ error });
      return normalizeRow(data);
    },

    async updateMany(filters = {}, updateSpec = {}) {
      const values = updateSpec.$set || updateSpec;
      let query = supabase.from(tableName).update(values);
      query = applyFilters(query, filters);
      const { data, error } = await query.select('*');
      throwIfError({ error });
      return normalizeRows(data || []);
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      throwIfError({ error });
      return true;
    },
  };
};

const toAppUser = async (authUser) => {
  if (!authUser) return null;

  const { data: profile, error } = await supabase
    .from(tableNames.User)
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;

  return normalizeRow({
    id: authUser.id,
    email: authUser.email,
    role: 'user',
    ...(profile || {}),
    data: profile || {},
  });
};

const redirectTo = (path = '/') => {
  const target = new URL(path || '/', window.location.origin);
  return target.href;
};

const getAccessToken = async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  throwIfError({ error: sessionError });

  const expiresAt = sessionData.session?.expires_at;
  if (expiresAt && expiresAt * 1000 < Date.now() + 60_000) {
    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    throwIfError({ error: refreshError });
    return refreshedData.session?.access_token;
  }

  return sessionData.session?.access_token;
};

export const appClient = {
  supabase,

  storage: {
    async uploadImage(file, bucketName) {
      if (!file) return null;

      const imageId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${imageId}-${cleanFileName(file.name)}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type || undefined,
          upsert: false,
        });

      throwIfError({ error });

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    },

    async uploadHubImage(file) {
      return this.uploadImage(file, HUB_IMAGES_BUCKET);
    },

    async uploadEventImage(file) {
      return this.uploadImage(file, EVENT_IMAGES_BUCKET);
    },
  },

  locations: {
    async geocodeHub(hub) {
      const query = buildHubGeocodeQuery(hub);
      if (!query) return null;

      const searchParams = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'us',
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) return null;
      const results = await response.json();
      const bestMatch = Array.isArray(results) ? results[0] : null;
      if (!bestMatch) return null;

      const lat = toCoordinate(bestMatch.lat);
      const lng = toCoordinate(bestMatch.lon);
      if (lat === null || lng === null) return null;

      return { lat, lng };
    },
  },

  entities: Object.fromEntries(
    Object.keys(tableNames).map((entityName) => [entityName, createEntity(entityName)]),
  ),

  auth: {
    async me() {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('Not authenticated');
      return toAppUser(data.user);
    },

    async loginViaEmailPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      throwIfError({ error });
      return this.me();
    },

    async register({ email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo('/'),
        },
      });
      throwIfError({ error });
      return data;
    },

    async verifyOtp({ email, otpCode }) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });
      throwIfError({ error });
      return data.session || data;
    },

    async verifyTokenHash({ tokenHash, type }) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      throwIfError({ error });
      return data.session || data;
    },

    async resendOtp(email) {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      throwIfError({ error });
      return data;
    },

    async loginWithProvider(provider, returnTo = '/') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo(returnTo),
        },
      });
      throwIfError({ error });
    },

    async resetPasswordRequest(email) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo('/reset-password'),
      });
      throwIfError({ error });
      return data;
    },

    async resetPassword({ newPassword }) {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      throwIfError({ error });
      return data;
    },

    async logout(returnTo) {
      await supabase.auth.signOut();
      if (returnTo) window.location.href = returnTo;
    },

    redirectToLogin(returnTo = '/') {
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
    },

    setToken(_token) {
      // Supabase manages the browser session when verifyOtp or OAuth succeeds.
    },
  },

  users: {
    async inviteUser(email, role = 'user', values = {}) {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('You must be logged in as an admin to invite users.');
      }

      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role, ...values }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Invite failed.');
      }

      return payload;
    },

    async deleteUser(userId) {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('You must be logged in as an admin to delete users.');
      }

      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Delete failed.');
      }

      return payload;
    },
  },
};
