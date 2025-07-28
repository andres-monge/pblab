import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { logAiUsage } from "@/lib/actions/ai";
import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime to support Google GenAI package
export const runtime = 'nodejs';

/**
 * POST /api/ai/suggest-goals
 * 
 * Generates AI-powered learning goal suggestions for a PBL project.
 * Uses the project's associated problem title and description as context.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { projectId } = await request.json();

    // Validate required parameters
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: "projectId is required and must be a valid string" },
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

    // Fetch project and associated problem data with authorization check
    // RLS policies will ensure user only sees projects they have access to
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        problem_id,
        problems!inner (
          title,
          description
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const problem = projectData.problems;
    
    // Construct educational prompt for learning goal suggestions
    const prompt = `As an educational AI assistant for Problem-Based Learning (PBL), help students define learning goals for their project.

Problem Title: "${problem.title}"

Problem Description:
${problem.description || 'No detailed description provided.'}

Please generate 3-5 specific, measurable, and achievable learning goals that students should consider for this PBL project. Each goal should:
1. Be specific and actionable
2. Focus on skills, knowledge, or competencies students will develop
3. Be appropriate for the problem domain
4. Encourage deep learning and critical thinking

Format your response as a JSON array of strings, where each string is a complete learning goal statement.

Example format:
["Develop proficiency in...", "Understand the relationship between...", "Apply critical thinking to..."]

Learning Goals:`;

    // Initialize Gemini AI client
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Make API call to Gemini
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,           // Controls randomness (0.0-1.0, lower = more consistent)
        maxOutputTokens: 40000,      // Generous limit for detailed learning goals (within 65k limit)
        candidateCount: 1,          // Number of response variations
        responseMimeType: 'application/json',  // Encourages JSON format
        stopSequences: [']'],       // Stops generation after JSON array closes
      }
    });

    // Extract the generated text
    const generatedText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      const finishReason = response.candidates?.[0]?.finishReason;
      console.error('❌ No text found. Finish reason:', finishReason);
      throw new Error(`Gemini replied with finishReason=${finishReason || 'unknown'}`);
    }

    // Parse the response to extract the JSON array
    let suggestions: string[];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by lines and clean up
        suggestions = generatedText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
          .map(line => line.replace(/^["'`-]*\s*/, '').replace(/["'`]*\s*$/, ''))
          .filter(line => line.length > 10) // Filter out very short lines
          .slice(0, 5); // Limit to 5 suggestions
      }

      // Ensure we have valid suggestions
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Failed to parse learning goal suggestions');
      }

      // Clean up suggestions (remove quotes, numbering, etc.)
      suggestions = suggestions.map(suggestion => 
        suggestion.replace(/^\d+\.\s*/, '').replace(/^["'`]*\s*/, '').replace(/["'`]*\s*$/, '').trim()
      ).filter(suggestion => suggestion.length > 0);

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to basic text processing
      suggestions = [
        'Develop critical thinking skills related to the problem domain',
        'Apply research methods to gather and analyze relevant information',
        'Collaborate effectively with team members to solve complex problems',
        'Communicate findings clearly through written and oral presentations'
      ];
    }

    // Log AI usage for analytics and audit trail
    try {
      await logAiUsage({
        userId: user.id,
        projectId: projectId,
        feature: 'suggest_goals',
        prompt: { 
          problem_title: problem.title,
          problem_description: problem.description,
          model_used: model 
        },
        response: { 
          suggestions: suggestions,
          raw_response: generatedText 
        }
      });
    } catch (logError) {
      // Log the error but don't fail the request
      console.error('Failed to log AI usage:', logError);
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      suggestions: suggestions,
    });

  } catch (error: unknown) {
    console.error('AI suggest-goals error:', error);

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
      { error: "Failed to generate learning goal suggestions. Please try again." },
      { status: 500 }
    );
  }
}