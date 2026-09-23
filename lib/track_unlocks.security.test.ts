/**
 * Test: Can an authenticated user forge a track_unlock row?
 * Expected after hardening: 403 on INSERT
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('track_unlocks security', () => {
  let authedClient: ReturnType<typeof createClient>;
  let testUserId: string;

  beforeAll(async () => {
    // Sign in with magic link test user (awad+lyrixis@apixis.dev)
    authedClient = createClient(url, anonKey);
    
    // For this test, we need a real session
    // Skip if no session available
    const { data: { session } } = await authedClient.auth.getSession();
    if (!session) {
      console.log('No session - run: sign in with awad+lyrixis@apixis.dev first');
      return;
    }
    
    testUserId = session.user.id;
  });

  it('should reject direct INSERT from authenticated user', async () => {
    const { data: { session } } = await authedClient.auth.getSession();
    if (!session) {
      console.log('SKIP: no session');
      return;
    }

    // Try to forge an unlock
    const { data, error } = await authedClient
      .from('track_unlocks')
      .insert({
        user_id: testUserId,
        recording_public_id: 'rec_forged_test',
        receipt_id: 'FORGED',
      });

    // After hardening: should be 403/permission denied
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/permission|denied|policy/i);
    expect(data).toBeNull();
  });

  it('should allow reading own unlocks via view', async () => {
    const { data: { session } } = await authedClient.auth.getSession();
    if (!session) {
      console.log('SKIP: no session');
      return;
    }

    // Read from view (should work)
    const { data, error } = await authedClient
      .from('my_track_unlocks')
      .select('*');

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
