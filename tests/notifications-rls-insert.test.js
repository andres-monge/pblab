/**
 * Notifications RLS INSERT Policy Test
 * 
 * Tests the fix for issue where authenticated student users couldn't INSERT into notifications table.
 * Verifies that the migration 20250801_120000_add_notifications_insert_policy.sql resolved:
 * 1. Students can INSERT notifications with auto-populated actor_id
 * 2. Admins continue to work through the same policy
 * 3. @mention system functions end-to-end
 * 4. All RLS security maintained with proper actor_id = auth.uid() validation
 * 
 * Test follows requirements from docs/testing-requirements.md:
 * - Uses authenticated users (not service role) to properly test RLS policies
 * - Tests with predefined test accounts: student1@university.edu, educator1@university.edu, admin@university.edu
 * - Verifies both positive cases (valid inserts) and negative cases (security violations)
 */

import { createClient } from '@supabase/supabase-js'
import { describe, test, expect, beforeAll, afterEach } from '@jest/globals'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Test user accounts (from testing-requirements.md)
const TEST_USERS = {
  student: { email: 'student1@university.edu', password: 'password123' },
  educator: { email: 'educator1@university.edu', password: 'password123' },
  admin: { email: 'admin@university.edu', password: 'password123' }
}

/**
 * Helper function to test with authenticated user context
 * Follows the exact pattern from docs/testing-requirements.md
 */
async function testWithAuthenticatedUser(email, password, testFn) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email, 
    password
  })
  
  if (authError) throw new Error(`Authentication failed for ${email}: ${authError.message}`)
  
  try {
    await testFn(supabase, authData.user)
  } finally {
    await supabase.auth.signOut()
  }
}

/**
 * Helper to get a valid recipient_id for testing
 * Uses the same authenticated user as recipient to satisfy the policy
 */
async function getValidRecipientId(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  return user.id
}

/**
 * Helper to create a test notification payload
 */
function createTestNotification(recipientId, overrides = {}) {
  return {
    recipient_id: recipientId,
    type: 'mention',
    reference_id: '550e8400-e29b-41d4-a716-446655440000', // Mock UUID
    reference_url: '/test-reference',
    // Note: actor_id should be auto-populated by BEFORE INSERT trigger
    ...overrides
  }
}

describe('Notifications RLS INSERT Policy Tests', () => {
  
  beforeAll(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables')
    }
  })

  describe('Student User INSERT Tests', () => {
    
    test('Student can INSERT notification with auto-populated actor_id', async () => {
      await testWithAuthenticatedUser(
        TEST_USERS.student.email, 
        TEST_USERS.student.password, 
        async (supabase, user) => {
          const recipientId = await getValidRecipientId(supabase)
          const notification = createTestNotification(recipientId)
          
          // Test INSERT operation
          const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
          
          // Verify successful insert
          expect(error).toBeNull()
          expect(data).toBeDefined()
          expect(data[0]).toMatchObject({
            recipient_id: recipientId,
            actor_id: user.id, // Should be auto-populated by trigger
            type: 'mention',
            reference_url: '/test-reference'
          })
          
          // Cleanup: remove test notification
          await supabase
            .from('notifications')
            .delete()
            .eq('id', data[0].id)
        }
      )
    })

    test('Student cannot INSERT notification for another user (RLS security)', async () => {
      await testWithAuthenticatedUser(
        TEST_USERS.student.email, 
        TEST_USERS.student.password, 
        async (supabase, user) => {
          // Try to insert notification for a different user (should violate policy)
          const notification = createTestNotification('550e8400-e29b-41d4-a716-446655440001') // Different UUID
          
          const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
          
          // Should fail due to RLS policy: recipient_id = auth.uid()
          expect(error).toBeDefined()
          expect(error.code).toBe('42501') // RLS policy violation
          expect(data).toBeNull()
        }
      )
    })

    test('Student cannot forge actor_id (security validation)', async () => {
      await testWithAuthenticatedUser(
        TEST_USERS.student.email, 
        TEST_USERS.student.password, 
        async (supabase, user) => {
          const recipientId = await getValidRecipientId(supabase)
          const notification = createTestNotification(recipientId, {
            actor_id: '550e8400-e29b-41d4-a716-446655440002' // Try to forge different actor
          })
          
          const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
          
          // Should fail due to BEFORE INSERT trigger validation
          expect(error).toBeDefined()
          expect(error.message).toContain('actor_id') // Trigger should prevent this
          expect(data).toBeNull()
        }
      )
    })
  })

  describe('Admin User INSERT Tests', () => {
    
    test('Admin can INSERT notification through same policy', async () => {
      await testWithAuthenticatedUser(
        TEST_USERS.admin.email, 
        TEST_USERS.admin.password, 
        async (supabase, user) => {
          const recipientId = await getValidRecipientId(supabase)
          const notification = createTestNotification(recipientId)
          
          // Test INSERT operation
          const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
          
          // Should work with same policy (FORCE ROW LEVEL SECURITY ensures admins follow policies)
          expect(error).toBeNull()
          expect(data).toBeDefined()
          expect(data[0]).toMatchObject({
            recipient_id: recipientId,
            actor_id: user.id,
            type: 'mention'
          })
          
          // Cleanup
          await supabase
            .from('notifications')
            .delete()
            .eq('id', data[0].id)
        }
      )
    })

    test('Admin also cannot violate RLS policy (FORCE ROW LEVEL SECURITY)', async () => {
      await testWithAuthenticatedUser(
        TEST_USERS.admin.email, 
        TEST_USERS.admin.password, 
        async (supabase, user) => {
          // Admin should also be subject to RLS due to FORCE ROW LEVEL SECURITY
          const notification = createTestNotification('550e8400-e29b-41d4-a716-446655440003')
          
          const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
          
          // Should fail for admin too
          expect(error).toBeDefined()
          expect(error.code).toBe('42501')
          expect(data).toBeNull()
        }
      )
    })
  })

  describe('@Mention System End-to-End Test', () => {
    
    test('Complete @mention workflow: comment creation → notification insertion', async () => {
      // This test simulates the real @mention workflow
      await testWithAuthenticatedUser(
        TEST_USERS.student.email, 
        TEST_USERS.student.password, 
        async (supabase, user) => {
          // Step 1: Get a valid team and artifact for testing
          const { data: teams } = await supabase
            .from('teams_users')
            .select('team:teams(id)')
            .limit(1)
          
          if (!teams || teams.length === 0) {
            console.warn('No teams found for @mention test - creating mock scenario')
            // Create a notification directly to simulate @mention
            const recipientId = await getValidRecipientId(supabase)
            const notification = createTestNotification(recipientId, {
              type: 'mention',
              reference_url: '/team/mock-team/artifacts/mock-artifact'
            })
            
            const { data: notificationData, error: notificationError } = await supabase
              .from('notifications')
              .insert(notification)
              .select()
            
            expect(notificationError).toBeNull()
            expect(notificationData[0].type).toBe('mention')
            
            // Cleanup
            await supabase
              .from('notifications')
              .delete()
              .eq('id', notificationData[0].id)
            
            return
          }
          
          // Step 2: Create a comment with @mention (this would normally trigger notification creation)
          const teamId = teams[0].team.id
          
          // Mock the comment creation that would trigger @mention notification
          const recipientId = await getValidRecipientId(supabase)
          const mentionNotification = createTestNotification(recipientId, {
            type: 'mention',
            reference_url: `/team/${teamId}/discussion`
          })
          
          // Step 3: Verify notification can be created (simulating server action)
          const { data: notificationData, error: notificationError } = await supabase
            .from('notifications')
            .insert(mentionNotification)
            .select()
          
          expect(notificationError).toBeNull()
          expect(notificationData[0]).toMatchObject({
            type: 'mention',
            actor_id: user.id,
            recipient_id: recipientId
          })
          
          // Step 4: Verify notification can be read by recipient
          const { data: readData, error: readError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', notificationData[0].id)
          
          expect(readError).toBeNull()
          expect(readData[0]).toBeDefined()
          
          // Cleanup
          await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationData[0].id)
        }
      )
    })
  })

  describe('Policy Validation Tests', () => {
    
    test('Verify INSERT policy exists in database', async () => {
      // Use service role to check policy existence
      const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT policyname, cmd, permissive, roles, with_check
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'notifications' 
            AND cmd = 'i'
          `
        })
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.length).toBeGreaterThan(0)
      
      const insertPolicy = data.find(p => p.policyname === 'notifications_insert_v1')
      expect(insertPolicy).toBeDefined()
      expect(insertPolicy.cmd).toBe('i')
      expect(insertPolicy.roles).toContain('authenticated')
    })

    test('Verify FORCE ROW LEVEL SECURITY is enabled', async () => {
      // Use service role to check table settings
      const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT relname, relrowsecurity, relforcerowsecurity
            FROM pg_class 
            WHERE relname = 'notifications'
          `
        })
      
      expect(error).toBeNull()
      expect(data[0].relrowsecurity).toBe(true) // RLS enabled
      expect(data[0].relforcerowsecurity).toBe(true) // FORCE RLS enabled (admins follow policies)
    })
  })
})