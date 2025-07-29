import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/debug/ai-usage?projectId=xxx
 * 
 * Diagnostic endpoint to verify AI usage data exists in database.
 * Uses service role key to bypass RLS and see all data.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    // Create client with service role to bypass RLS
    const supabase = await createClient();
    
    // Get current user for logging
    const { data: { user } } = await supabase.auth.getUser();
    
    // Query with service role to see all data
    const { data, error } = await supabase
      .from('ai_usage')
      .select('id, project_id, user_id, created_at, feature')
      .eq('project_id', projectId)
      .eq('feature', 'tutor')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Debug query error:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // Also get team members for this project
    const { data: teamData } = await supabase
      .from('projects')
      .select(`
        id,
        team_id,
        teams!inner (
          id,
          name,
          teams_users!inner (
            user_id,
            users!inner (
              id,
              name,
              email
            )
          )
        )
      `)
      .eq('id', projectId)
      .single();

    return NextResponse.json({
      debug_info: {
        querying_user: user?.id || 'anonymous',
        project_id: projectId,
        total_messages: data?.length || 0,
        team_info: teamData ? {
          team_id: teamData.team_id,
          team_name: teamData.teams?.name,
          team_members: teamData.teams?.teams_users?.map((tu: any) => ({
            user_id: tu.user_id,
            name: tu.users?.name,
            email: tu.users?.email
          }))
        } : null
      },
      messages: data || []
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}