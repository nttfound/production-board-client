export const SUPABASE_URL =
  process.env.REACT_APP_SUPABASE_URL ||
  'https://llurondjovelnqsqwwnr.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_mCeYTIrrSySREJWgAIct7w_dzIvNO4i';

// The endpoint path already includes the function slug `api`; callers append
// `/api/...` because that is the route prefix handled by the Hono app.
export const API_BASE_URL = `${SUPABASE_URL}/functions/v1`;
