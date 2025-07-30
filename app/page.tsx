import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { PBLabLogo } from "@/components/pblab/pblab-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Brain, Target, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  // Check if user is authenticated and redirect to dashboard
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!error && user) {
      redirect("/dashboard");
    }
  }
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>
                <PBLabLogo />
              </Link>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {/* Hero Section */}
          <div className="flex flex-col gap-16 items-center text-center">
            <div className="flex flex-col gap-6 items-center">
              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Transform Learning with AI-Powered PBL
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
                Engage students in authentic problem-solving experiences with intelligent guidance, 
                collaborative tools, and seamless assessment.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link href={hasEnvVars ? "/auth/sign-up" : "#setup"}>
                  Get Started
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link href="#features">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <section id="features" className="w-full">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why Choose PBLab?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built specifically for Problem-Based Learning, PBLab combines proven pedagogy 
                with cutting-edge AI to create engaging learning experiences.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Collaborative Teams</CardTitle>
                  <CardDescription>
                    Foster teamwork with structured group formation, role assignments, and collaborative workspaces.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>AI Tutor Guidance</CardTitle>
                  <CardDescription>
                    Get Socratic guidance that promotes critical thinking without giving away answers.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Smart Assessment</CardTitle>
                  <CardDescription>
                    AI-powered rubric assessment saves time while providing detailed, personalized feedback.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>

          {/* Process Section */}
          <section className="w-full">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                The PBL Process
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Follow the proven Problem-Based Learning methodology with digital tools 
                that enhance every step of the journey.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold">Problem Discovery</h3>
                <p className="text-muted-foreground">
                  Teams explore authentic, real-world problems and define their learning objectives.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold">Research & Collaboration</h3>
                <p className="text-muted-foreground">
                  Students research, create artifacts, and collaborate with AI tutor guidance.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold">Solution & Assessment</h3>
                <p className="text-muted-foreground">
                  Teams present solutions and receive comprehensive AI-assisted feedback.
                </p>
              </div>
            </div>
          </section>

          {!hasEnvVars && (
            <section id="setup" className="w-full">
              <Card className="border-2 border-destructive/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Setup Required
                  </CardTitle>
                  <CardDescription>
                                         To get started with PBLab, you&apos;ll need to configure your environment variables.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please set up your Supabase project and add the required environment variables 
                                         to begin using PBLab&apos;s full feature set.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/auth/login">
                      Continue Setup
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p className="text-muted-foreground">
            Empowering educators with AI-augmented Problem-Based Learning
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
