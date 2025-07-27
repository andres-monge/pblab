/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-restricted-syntax */
/**
 * Notification RLS Policy Tests
 *
 * Validates that:
 * 1. Students can INSERT notifications with auto-populated actor_id.
 * 2. Admins can INSERT via the same policy (no owner bypass).
 * 3. @mention flow works end-to-end (insert → select).
 * 4. RLS security enforces recipient_id = auth.uid() and actor_id = auth.uid().
 *
 * Follows testing protocol in docs/testing-requirements.md – ALL tests run with
 * real authenticated users (never service roles).
 */

const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')
const dotenv = require('dotenv')

// Load env vars – assumes .env.local present like other tests
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper copied from test-authentication.js to ensure consistency
async function testWithAuthenticatedUser(email, password, testFn) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) throw new Error(`Auth failed for ${email}: ${authError.message}`)

  try {
    return await testFn(supabase, data.user)
  } finally {
    await supabase.auth.signOut()
  }
}

async function runNotificationTests() {
  console.log('\n🔔 Notification RLS Tests')
  const results = []

  // --- 1. Student INSERT success & actor_id auto-populated ---
  try {
    await testWithAuthenticatedUser('student1@university.edu', 'password123', async (supabase, _user) => {
      console.log('  ▶️ Student INSERT test')
      const newNotif = {
        // recipient must be the same user (policy requirement)
        recipient_id: _user.id,
        // actor_id intentionally omitted – BEFORE INSERT trigger should set it
        reference_id: randomUUID(),
        type: 'mention_in_comment',
        reference_url: 'https://example.com/comment/123'
      }

      const { data: insertData, error: insertErr } = await supabase
        .from('notifications')
        .insert(newNotif)
        .select('*')
        .single()

      if (insertErr) throw new Error(`Student insert failed: ${insertErr.message}`)

      if (insertData.actor_id !== _user.id) {
        throw new Error(`actor_id mismatch – expected ${_user.id}, got ${insertData.actor_id}`)
      }

      console.log('    ✅ Student insert succeeded & actor_id auto-populated')

      // @mention retrieval (end-to-end)
      const { data: fetched, error: fetchErr } = await supabase
        .from('notifications')
        .select('id, actor_id, recipient_id')
        .eq('id', insertData.id)
        .single()

      if (fetchErr) throw new Error(`Select after insert failed: ${fetchErr.message}`)
      if (!fetched) throw new Error('Inserted notification not found')

      console.log('    ✅ @mention retrieval confirmed')
    })
    results.push({ test: 'student_insert', status: 'success' })
  } catch (err) {
    console.error(`    ❌ Student insert test: ${err.message}`)
    results.push({ test: 'student_insert', status: 'failed', error: err.message })
  }

  // --- 2. RLS security: student cannot insert for someone else ---
  try {
    await testWithAuthenticatedUser('student1@university.edu', 'password123', async supabase => {
      console.log('  ▶️ Student unauthorized insert test')
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert({
          recipient_id: randomUUID(), // someone else
          reference_id: randomUUID(),
          type: 'mention_in_comment'
        })
        .select()

      if (!insertErr) throw new Error('Unauthorized insert unexpectedly succeeded')
      if (!/42501|row-level security/i.test(insertErr.message)) {
        throw new Error(`Unexpected error message: ${insertErr.message}`)
      }
      console.log('    ✅ Unauthorized insert correctly blocked')
    })
    results.push({ test: 'student_security', status: 'success' })
  } catch (err) {
    console.error(`    ❌ Student security test: ${err.message}`)
    results.push({ test: 'student_security', status: 'failed', error: err.message })
  }

  // --- 3. Admin INSERT success through same policy ---
  try {
    await testWithAuthenticatedUser('admin@university.edu', 'password123', async (supabase, user) => {
      console.log('  ▶️ Admin INSERT test')
      const { data: insertData, error: insertErr } = await supabase
        .from('notifications')
        .insert({
          recipient_id: user.id,
          reference_id: randomUUID(),
          type: 'mention_in_comment'
        })
        .select('*')
        .single()

      if (insertErr) throw new Error(`Admin insert failed: ${insertErr.message}`)
      if (insertData.actor_id !== user.id) {
        throw new Error('Admin actor_id not auto-populated correctly')
      }
      console.log('    ✅ Admin insert succeeded & actor_id correct')
    })
    results.push({ test: 'admin_insert', status: 'success' })
  } catch (err) {
    console.error(`    ❌ Admin insert test: ${err.message}`)
    results.push({ test: 'admin_insert', status: 'failed', error: err.message })
  }

  // Summary
  const passed = results.filter(r => r.status === 'success').length
  console.log(`\n📊 Notification Tests: ${passed}/${results.length} passed`)
  if (passed !== results.length) {
    console.log('Failed tests:\n', results.filter(r => r.status === 'failed'))
    process.exit(1)
  }
}

if (require.main === module) {
  runNotificationTests().catch(err => {
    console.error('❌ Notification tests crashed:', err)
    process.exit(1)
  })
}

module.exports = { runNotificationTests } 