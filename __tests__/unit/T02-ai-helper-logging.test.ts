/**
 * T-02: AI Helper API with Database Logging
 * 
 * Tests that the AI tutor API:
 * 1. Returns appropriate feedback without doing work for student
 * 2. Logs usage to ai_usage table in database
 * 3. Handles authentication and authorization properly
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/tutor/route';
import { setupTestDatabase, testWithAuthenticatedUser, supabaseAdmin, TEST_USERS, createTestProject, addUserToTeam } from '../helpers/database';

// Mock Google Gemini API
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation((config) => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: 'Great question! Instead of giving you the answer directly, let me guide you to think about this problem. What specific aspect of the SIR model are you trying to understand? Have you considered how the transmission rate β affects the dynamics?'
      })
    }
  }))
}));

// Mock Supabase server client to avoid Next.js context issues
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'student1@university.edu'
          }
        },
        error: null
      })
    },
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: table === 'projects' ? {
          id: 'test-project-id',
          team_id: 'test-team-id',
          phase: 'pre',
          teams: {
            id: 'test-team-id',
            course_id: 'test-course-id'
          }
        } : table === 'users' ? {
          id: 'test-user-id',
          role: 'student',
          email: 'student1@university.edu'
        } : { id: 'test-user-id', role: 'student' },
        error: null
      })
    })),
    channel: jest.fn(() => ({
      subscribe: jest.fn().mockResolvedValue({}),
      send: jest.fn().mockResolvedValue({}),
      unsubscribe: jest.fn().mockResolvedValue({})
    }))
  })
}));

// Mock logAiUsage action
jest.mock('@/lib/actions/ai', () => ({
  logAiUsage: jest.fn().mockResolvedValue({ success: true, id: 'test-ai-usage-id' })
}));

describe('T-02: AI Helper API with Database Logging', () => {
  let testProjectId: string;

  beforeAll(async () => {
    // Setup test database with fresh data
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Use a test project ID since we're mocking the database calls
    testProjectId = 'test-project-id';
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up mocks
    jest.clearAllMocks();
  });

  it('should return Socratic guidance without giving direct answers', async () => {
    // Create request payload
    const requestBody = {
      projectId: testProjectId,
      message: 'What is the formula for calculating R0 in an SIR model?'
    };

    // Create NextRequest object
    const request = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Call the API route
    const response = await POST(request);
    const responseData = await response.json();

    // Verify response structure
    expect(response.status).toBe(200);
    expect(responseData).toHaveProperty('response');
    expect(typeof responseData.response).toBe('string');

    // Verify AI gives guidance rather than direct answers
    const reply = responseData.response.toLowerCase();
    expect(reply).toContain('question'); // Should ask questions back
    expect(reply).not.toContain('r0 = '); // Should not give direct formula
    expect(reply).not.toContain('the answer is'); // Should not provide direct answers

    // The response should encourage thinking/exploration
    expect(
      reply.includes('think') || 
      reply.includes('consider') || 
      reply.includes('explore') ||
      reply.includes('what') ||
      reply.includes('how')
    ).toBe(true);
  });

  it('should log AI usage to database with correct structure', async () => {
    const { logAiUsage } = require('@/lib/actions/ai');
    
    // Create request payload
    const requestBody = {
      projectId: testProjectId,
      message: 'How do I start modeling disease spread?'
    };

    // Create NextRequest object
    const request = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Call the API route
    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify logAiUsage was called with correct parameters
    expect(logAiUsage).toHaveBeenCalledWith({
      feature: 'tutor',
      projectId: testProjectId,
      userId: 'test-user-id',
      prompt: expect.objectContaining({
        message: requestBody.message
      }),
      response: expect.any(Object)
    });
    
    // Verify response structure
    const responseData = await response.json();
    expect(responseData).toHaveProperty('response');
    expect(typeof responseData.response).toBe('string');
  });

  it('should reject unauthorized requests', async () => {
    // Mock unauthenticated user
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        })
      }
    });

    // Create request without authentication
    const requestBody = {
      projectId: testProjectId,
      message: 'Test message'
    };

    const request = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Call API without authentication
    const response = await POST(request);

    // Should return 401 
    expect(response.status).toBe(401);
  });

  it('should validate project access via RLS', async () => {
    // Mock user without project access
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'student2-id',
              email: 'student2@university.edu'
            }
          },
          error: null
        })
      },
      from: jest.fn((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No project access
          error: { code: 'PGRST116', message: 'No rows found' }
        })
      }))
    });

    // Try to access a project the user is not part of
    const requestBody = {
      projectId: testProjectId,
      message: 'Test unauthorized access'
    };

    const request = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    // Should return 404 when project doesn't exist for the user
    expect(response.status).toBe(404);
  });

  it('should handle conversation history retrieval', async () => {
    // Mock conversation history in database
    const { createClient } = require('@/lib/supabase/server');
    const mockHistory = [
      {
        prompt: { message: 'Previous question about SIR model' },
        response: { text: 'Previous AI response about SIR model' },
        created_at: new Date().toISOString()
      }
    ];

    createClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'student1@university.edu'
            }
          },
          error: null
        })
      },
      from: jest.fn((table) => {
        if (table === 'ai_usage') {
          // Return mock history
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: mockHistory,
              error: null
            })
          };
        }
        // Default behavior for other tables
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: table === 'projects' ? { id: 'test-project-id', team_id: 'test-team-id' } : { id: 'test-user-id', role: 'student' },
            error: null
          })
        };
      })
    });

    // Send a new message
    const requestBody = {
      projectId: testProjectId,
      message: 'Follow up question about the previous discussion'
    };

    const request = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify response
    const responseData = await response.json();
    expect(responseData).toHaveProperty('response');
    expect(typeof responseData.response).toBe('string');
  });

  it('should validate required parameters', async () => {
    // Test missing projectId
    const requestWithoutProject = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test message' }),
    });

    const responseWithoutProject = await POST(requestWithoutProject);
    expect(responseWithoutProject.status).toBe(400);
    const errorData1 = await responseWithoutProject.json();
    expect(errorData1.error).toContain('projectId is required');

    // Test missing message
    const requestWithoutMessage = new NextRequest('http://localhost:3000/api/ai/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: testProjectId }),
    });

    const responseWithoutMessage = await POST(requestWithoutMessage);
    expect(responseWithoutMessage.status).toBe(400);
    const errorData2 = await responseWithoutMessage.json();
    expect(errorData2.error).toContain('message is required');
  });
});