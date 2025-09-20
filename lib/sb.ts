import { createClient } from '@supabase/supabase-js';

let _sb: ReturnType<typeof createClient> | null = null;

export const sb = () => {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _sb;
};
