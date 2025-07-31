/**
 * T04: Educator Feedback & Project Locking E2E Test
 * 
 * Tests that an educator saving feedback and locking the project successfully 
 * changes the project phase to 'closed' and that student inputs are then disabled.
 */

import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/auth';
import { setupTestDatabase, supabaseAdmin } from '../helpers/database';

test.describe('Educator Feedback & Project Locking', () => {
  let projectId: string;

  test.beforeAll(async () => {
    // Ensure test database is ready
    await setupTestDatabase();
    
    // Find an existing project in 'post' phase that educator1 can assess
    // This should be the "Outbreak Simulator" project mentioned
    const { data: existingProject } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        team_id,
        final_report_url,
        problem:problems!inner(
          course:courses!inner(
            educator_id
          )
        )
      `)
      .eq('phase', 'post')
      .not('final_report_url', 'is', null)
      .single();
    
    if (existingProject) {
      projectId = existingProject.id;
      console.log(`Using existing post-phase project: ${projectId}`);
    } else {
      throw new Error('No suitable post-phase project found for testing');
    }
  });

  test('educator can assess project and lock it, disabling student inputs', async ({ page, browser }) => {
    // Step 1: Login as educator and navigate to project
    await loginUser(page, 'educator1');
    await page.goto(`/p/${projectId}`);
    
    // Step 2: Verify assessment form is visible (this confirms we're in post phase)
    await expect(page.locator('text=Project Assessment')).toBeVisible();
    
    // Step 3: Fill out assessment form (just first criterion to keep it simple)
    const firstScoreInput = page.locator('input[type="number"]').first();
    await expect(firstScoreInput).toBeVisible();
    await firstScoreInput.fill('4');
    
    const firstJustificationTextarea = page.locator('textarea').first();
    await expect(firstJustificationTextarea).toBeVisible();
    await firstJustificationTextarea.fill('Good work on this criterion.');
    
    // Debug: Take screenshot to see the form state
    await page.screenshot({ path: 'debug-before-submit.png' });
    
    // Step 4: Click "Save Feedback & Lock Project"
    await page.click('button:has-text("Save Feedback & Lock Project")');
    
    // Step 5: Confirm in dialog
    await expect(page.locator('text=Confirm Project Assessment')).toBeVisible();
    await page.click('button:has-text("Confirm & Lock Project")');
    
    // Step 6: Wait for the action to complete (no need to check redirect)
    await page.waitForTimeout(2000);
    
    // Step 7: Verify project phase changed to 'closed' in database
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('phase')
      .eq('id', projectId)
      .single();
    
    expect(project?.phase).toBe('closed');
    
    // Step 8: Test student input locking
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    
    // Login as student and navigate to locked project
    await loginUser(studentPage, 'student1');
    await studentPage.goto(`/p/${projectId}`);
    
    // Step 9: Verify project shows as closed and inputs are disabled
    await expect(studentPage.locator('text=Closed Phase')).toBeVisible();
    await expect(studentPage.locator('text=Project completed and assessed')).toBeVisible();
    
    // Step 10: Verify interactive elements are disabled
    // Check that any buttons/inputs that would normally be interactive are disabled
    const disabledElements = studentPage.locator('button[disabled], input[disabled], textarea[disabled]');
    const disabledCount = await disabledElements.count();
    expect(disabledCount).toBeGreaterThan(0); // Should have at least some disabled elements
    
    // Clean up
    await studentPage.close();
    await studentContext.close();
  });
});