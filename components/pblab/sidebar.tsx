"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Settings,
  FolderOpen,
  Target,
  Bell,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ];

    if (userRole === "student") {
      return [
        ...baseItems,
        {
          title: "My Teams",
          href: "/student/teams",
          icon: Users,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Active Projects",
          href: "/student/projects",
          icon: FolderOpen,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Notifications",
          href: "/notifications",
          icon: Bell,
          disabled: true, // Will be implemented in step 21
        },
      ];
    }

    if (userRole === "educator") {
      return [
        ...baseItems,
        {
          title: "My Courses",
          href: "/educator/courses",
          icon: BookOpen,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Problems",
          href: "/educator/problems",
          icon: FileText,
          disabled: true, // Partially exists, will be enhanced
        },
        {
          title: "Teams & Projects",
          href: "/educator/projects",
          icon: FolderOpen,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Assessments",
          href: "/educator/assessments",
          icon: ClipboardCheck,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Analytics",
          href: "/educator/analytics",
          icon: BarChart3,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Notifications",
          href: "/notifications",
          icon: Bell,
          disabled: true, // Will be implemented in step 21
        },
      ];
    }

    if (userRole === "admin") {
      return [
        ...baseItems,
        {
          title: "User Management",
          href: "/admin/users",
          icon: Users,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Course Management",
          href: "/admin/courses",
          icon: BookOpen,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "System Analytics",
          href: "/admin/analytics",
          icon: BarChart3,
          disabled: true, // Will be implemented in later steps
        },
        {
          title: "Settings",
          href: "/admin/settings",
          icon: Settings,
          disabled: true, // Will be implemented in later steps
        },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <div className="hidden border-r bg-muted/10 md:block md:w-64 lg:w-72">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[60px] items-center border-b px-6">
          <h2 className="text-lg font-semibold capitalize">{userRole} Portal</h2>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Button
                  key={index}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 mb-1",
                    isActive && "bg-secondary",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  asChild={!item.disabled}
                  disabled={item.disabled}
                >
                  {item.disabled ? (
                    <div className="flex items-center gap-2 px-2 py-2">
                      <Icon className="h-4 w-4" />
                      {item.title}
                      <span className="ml-auto text-xs text-muted-foreground">
                        Soon
                      </span>
                    </div>
                  ) : (
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  )}
                </Button>
              );
            })}
          </nav>
          
          <Separator className="my-4 mx-4" />
          
          {/* Quick Actions Section */}
          <div className="px-4">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </h3>
            {userRole === "educator" && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 mb-1 opacity-50 cursor-not-allowed"
                disabled
              >
                <Target className="h-4 w-4" />
                Create Problem
                <span className="ml-auto text-xs text-muted-foreground">
                  Soon
                </span>
              </Button>
            )}
            {userRole === "student" && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 mb-1 opacity-50 cursor-not-allowed"
                disabled
              >
                <FileText className="h-4 w-4" />
                View Assignments
                <span className="ml-auto text-xs text-muted-foreground">
                  Soon
                </span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            PBLab v1.0 - AI-Powered Learning
          </p>
        </div>
      </div>
    </div>
  );
}