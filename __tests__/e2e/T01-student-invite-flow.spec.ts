/**
 * T01: Student Invite Flow E2E Test
 * 
 * Tests the full student invite flow from admin dashboard.
 * Verifies that an admin can generate an invite link and a new user
 * can sign up successfully.
 */

import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/auth';
import { setupTestDatabase } from '../helpers/database';

test.describe('Student Invite Flow', () => {
  test.beforeAll(async () => {
    // Ensure test database is ready
    await setupTestDatabase();
  });

  test('admin can invite a student who can sign up successfully', async ({ page, browser }) => {
    // Step 1: Login as admin
    await loginUser(page, 'admin');
    
    // Step 2: Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // Step 3: Click "Invite User" button
    await page.click('button:has-text("Invite User")');
    
    // Step 4: Fill in the invite form
    const testEmail = `test.student.${Date.now()}@university.edu`;
    await page.fill('input[id="name"]', 'Test Student');
    await page.fill('input[id="email"]', testEmail);
    await page.selectOption('select', 'student'); // Select student role
    
    // Step 5: Generate invite
    await page.click('button:has-text("Generate Invite")');
    
    // Step 6: Wait for and copy the invite link
    await expect(page.locator('text=Invite link generated successfully!')).toBeVisible();
    const inviteLinkInput = page.locator('input[id="invite-link"]');
    const inviteLink = await inviteLinkInput.inputValue();
    expect(inviteLink).toContain('/invite?token=');
    
    // Step 7: Close modal
    await page.click('button:has-text("Close")');
    
    // Step 8: Open invite link in new incognito context (simulating new user)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto(inviteLink);
    
    // Step 9: Should redirect to signup with invite context
    await expect(newPage).toHaveURL(/\/auth\/sign-up\?invite=/);
    await expect(newPage.locator('text=Join as student')).toBeVisible();
    
    // Step 10: Verify form is pre-filled
    const nameInput = newPage.locator('input[id="fullName"]');
    const emailInput = newPage.locator('input[id="email"]');
    await expect(nameInput).toHaveValue('Test Student');
    await expect(emailInput).toHaveValue(testEmail);
    await expect(nameInput).toBeDisabled();
    await expect(emailInput).toBeDisabled();
    
    // Step 11: Enter password and complete signup
    await newPage.fill('input[id="password"]', 'TestPassword123!');
    await newPage.click('button:has-text("Accept invite")');
    
    // Clean up
    await newPage.close();
    await newContext.close();
  });
});