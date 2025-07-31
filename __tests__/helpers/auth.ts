/**
 * Authentication Testing Helpers
 * 
 * Utilities for handling authentication in E2E tests.
 * Provides login/logout functions for different user roles.
 */

import { Page, expect } from '@playwright/test';
import { TEST_USERS } from './database';

/**
 * Login a user via the auth form
 * 
 * @param page - Playwright page object
 * @param userKey - Test user to login as
 */
export async function loginUser(page: Page, userKey: keyof typeof TEST_USERS): Promise<void> {
  const user = TEST_USERS[userKey];
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill in login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard|\/student\/dashboard|\/educator\/dashboard|\/admin\/dashboard/);
  
  // Verify we're logged in by checking for user menu or dashboard content
  await expect(page.locator('[data-testid="user-menu"], [data-testid="dashboard-header"], h1:has-text("Dashboard")')).toBeVisible();
}

/**
 * Logout current user
 * 
 * @param page - Playwright page object
 */
export async function logoutUser(page: Page): Promise<void> {
  // Try to find and click logout button (could be in user menu)
  try {
    // Look for user menu first
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('text="Logout"');
    } else {
      // Fallback: look for direct logout button
      await page.click('text="Logout"');
    }
    
    // Wait for redirect to login page
    await page.waitForURL('/auth/login');
  } catch (error) {
    // If logout fails, navigate directly to login (will redirect due to auth middleware)
    await page.goto('/auth/login');
  }
}

/**
 * Verify user is on the correct dashboard for their role
 * 
 * @param page - Playwright page object
 * @param userKey - Expected user role
 */
export async function verifyUserDashboard(page: Page, userKey: keyof typeof TEST_USERS): Promise<void> {
  const user = TEST_USERS[userKey];
  
  switch (user.role) {
    case 'admin':
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
      break;
    case 'educator':
      await expect(page).toHaveURL(/\/educator\/dashboard/);
      await expect(page.locator('h1:has-text("Educator Dashboard")')).toBeVisible();
      break;
    case 'student':
      await expect(page).toHaveURL(/\/student\/dashboard/);
      await expect(page.locator('h1:has-text("Student Dashboard")')).toBeVisible();
      break;
  }
}

/**
 * Get user ID for authenticated user (for database operations)
 * 
 * @param page - Playwright page object
 * @returns User ID from browser storage or cookies
 */
export async function getAuthenticatedUserId(page: Page): Promise<string> {
  // Evaluate JavaScript to get user ID from Supabase session
  const userId = await page.evaluate(() => {
    // Try to get from localStorage (Supabase stores session there)
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(key => key.includes('supabase.auth.token'));
    
    if (supabaseKey) {
      try {
        const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
        return session.user?.id;
      } catch {
        return null;
      }
    }
    return null;
  });
  
  if (!userId) {
    throw new Error('Could not extract user ID from authenticated session');
  }
  
  return userId;
}