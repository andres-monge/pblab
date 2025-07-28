import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { logAiUsage } from "@/lib/actions/ai";
import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime to support Google GenAI package
export const runtime = 'nodejs';

/**
 * POST /api/ai/tutor
 * 
 * AI-powered tutoring assistant with contextual memory for PBL projects.
 * Maintains conversation history across interactions within the same project.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { projectId, message } = await request.json();

    // Validate required parameters
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: "projectId is required and must be a valid string" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "message is required and must be a valid string" },
        { status: 400 }
      );
    }

    // Verify API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 }
      );
    }

    // Get model from environment variable with fallback
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user has access to the project (RLS will handle this)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Retrieve previous tutor conversations for this project
    const { data: conversationHistory, error: historyError } = await supabase
      .from('ai_usage')
      .select('prompt, response, created_at')
      .eq('project_id', projectId)
      .eq('feature', 'tutor')
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Failed to retrieve conversation history:', historyError);
      // Continue without history rather than failing completely
    }

    // Format conversation history for Gemini API
    const formattedHistory: Array<{ role: string; content: string }> = [];
    
    if (conversationHistory && conversationHistory.length > 0) {
      for (const entry of conversationHistory) {
        // Add user message
        if (entry.prompt) {
          const promptText = typeof entry.prompt === 'string' 
            ? entry.prompt 
            : (entry.prompt as Record<string, unknown>)?.message as string || JSON.stringify(entry.prompt);
          formattedHistory.push({
            role: 'user',
            content: promptText
          });
        }

        // Add AI response
        if (entry.response) {
          const responseText = typeof entry.response === 'string'
            ? entry.response
            : (entry.response as Record<string, unknown>)?.text as string || JSON.stringify(entry.response);
          formattedHistory.push({
            role: 'model',
            content: responseText
          });
        }
      }
    }

    // Add current user message
    formattedHistory.push({
      role: 'user',
      content: message
    });

    // Construct educational prompt for AI tutor
    const systemInstruction = `You are an AI tutoring assistant for Problem-Based Learning (PBL). Your role is to guide students through their learning process without giving direct answers.

Key principles:
1. Ask probing questions to help students think critically
2. Provide hints and guidance rather than complete solutions
3. Encourage students to explore, research, and collaborate
4. Help students connect new information to their existing knowledge
5. Support their problem-solving process while fostering independence
6. Be encouraging and supportive of their learning journey

Remember: This is a shared conversation for the entire project team. Previous messages in this conversation are from team members working on the same PBL project.`;

    // Initialize Gemini AI client
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Prepare conversation contents for Gemini
    const conversationContents = formattedHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Make API call to Gemini
    const response = await ai.models.generateContent({
      model: model,
      contents: conversationContents,
      config: {
        temperature: 0.7,           // Balanced creativity for educational responses
        maxOutputTokens: 65000,      // Generous limit for detailed tutoring responses
        candidateCount: 1,          // Single response
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
      }
    });

    // Extract the generated response
    const tutorResponse = response.text;
    
    if (!tutorResponse) {
      throw new Error('No response generated from AI tutor service');
    }

    // Log AI usage for analytics and audit trail
    try {
      await logAiUsage({
        userId: user.id,
        projectId: projectId,
        feature: 'tutor',
        prompt: { 
          message: message,
          conversation_length: formattedHistory.length,
          model_used: model 
        },
        response: { 
          text: tutorResponse,
          context_included: conversationHistory ? conversationHistory.length : 0
        }
      });
    } catch (logError) {
      // Log the error but don't fail the request
      console.error('Failed to log AI usage:', logError);
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      response: tutorResponse,
    });

  } catch (error: unknown) {
    console.error('AI tutor error:', error);

    // Handle specific error types
    const errorObj = error as { status?: number; message?: string };
    if (errorObj?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    if (errorObj?.message?.includes('API key')) {
      return NextResponse.json(
        { error: "AI service configuration error" },
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Failed to get tutor response. Please try again." },
      { status: 500 }
    );
  }
}