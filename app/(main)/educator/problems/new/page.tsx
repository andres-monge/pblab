import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { requireProjectCreationPermissions } from "@/lib/shared/authorization-utils";
import Link from "next/link";
import { CreateProblemForm } from "@/components/pblab/educator/create-problem-form";

interface Course {
  id: string;
  name: string;
}

async function getEducatorCourses(): Promise<Course[]> {
  const user = await getAuthenticatedUser();
  requireProjectCreationPermissions(user.role);
  
  const supabase = await createClient();
  
  // Fetch courses that the educator has access to via RLS policies
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
  
  return courses || [];
}

export default async function CreateProblemPage() {
  const courses = await getEducatorCourses();
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/educator/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>→</span>
        <span>Create New Problem</span>
      </div>
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Problem</h1>
        <p className="text-muted-foreground">
          Define a new problem-based learning scenario with assessment rubric for your students.
        </p>
      </div>
      
      {/* Form Section */}
      <div className="max-w-4xl">
        <CreateProblemForm courses={courses} />
      </div>
    </div>
  );
}