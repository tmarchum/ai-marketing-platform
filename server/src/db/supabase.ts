import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _warned = false;

function getUrl() { return process.env.SUPABASE_URL || ''; }
function getKey() { return process.env.SUPABASE_SERVICE_KEY || ''; }

function warn() {
  if (!_warned) {
    console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — DB operations will be skipped');
    _warned = true;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getUrl() && getKey());
}

// Lazy init — only create client when actually needed and configured
function getClient(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = getUrl();
  const key = getKey();
  if (!url || !key) {
    warn();
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}

// ═══════════════════════════════════════════════════════════════════
// NOOP PROXY — returns empty results when Supabase is not configured
// ═══════════════════════════════════════════════════════════════════
const EMPTY_RESPONSE = { data: null, error: null, count: null, status: 200, statusText: 'OK' };

function noopChain(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      // Terminal methods that return a promise
      if (['single', 'maybeSingle', 'then', 'csv'].includes(prop as string)) {
        if (prop === 'then') {
          return (resolve: any) => resolve(EMPTY_RESPONSE);
        }
        return () => Promise.resolve(EMPTY_RESPONSE);
      }
      // Chainable methods
      return (..._args: any[]) => new Proxy({}, handler);
    }
  };
  return new Proxy({}, handler);
}

// Main export — works like supabase client but safely handles missing config
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    if (client) {
      return (client as any)[prop];
    }
    // No client — return noop chain for .from(), .auth, .storage, etc.
    warn();
    if (prop === 'auth') {
      return {
        admin: {
          listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
          inviteUserByEmail: () => Promise.resolve({ data: { user: { id: 'noop' } }, error: null }),
          deleteUser: () => Promise.resolve({ error: null }),
        }
      };
    }
    if (prop === 'storage') {
      return {
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        })
      };
    }
    if (prop === 'from') {
      return (_table: string) => noopChain();
    }
    return noopChain();
  }
});
