"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/neon-auth/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  Target,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  Package,
  ChevronDown,
  Menu,
  Plus,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Members", href: "/members", icon: Users },
  { name: "Equipment", href: "/equipment", icon: Package },
  { name: "Exercises", href: "/exercises", icon: Dumbbell },
  { name: "Workouts", href: "/workouts", icon: ClipboardList },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI Coach", href: "/ai-coach", icon: Bot },
];

const bottomNav = [
  { name: "Account", href: "/account", icon: Settings },
];

interface Circle {
  id: string;
  name: string;
  role: string;
  memberId: string;
}

interface SidebarProps {
  circleName: string;
  circleId: string;
  circles: Circle[];
  userName?: string;
  userImage?: string;
}

function CircleSwitcher({
  circles,
  activeCircleId,
  circleName,
}: {
  circles: Circle[];
  activeCircleId: string;
  circleName: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchCircle = async (circleId: string) => {
    if (circleId === activeCircleId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/circles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to switch circle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (circles.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <Dumbbell className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <span className="font-semibold">Workout Circle</span>
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
            {circleName}
          </span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        <Button variant="ghost" className="w-full justify-start gap-2 px-2 h-auto py-2">
          <Dumbbell className="h-6 w-6 text-primary shrink-0" />
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="font-semibold text-sm">Workout Circle</span>
            <span className="text-xs text-muted-foreground truncate w-full text-left">
              {circleName}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Circle</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {circles.map((circle) => (
          <DropdownMenuItem
            key={circle.id}
            onClick={() => handleSwitchCircle(circle.id)}
            className={cn(
              "cursor-pointer",
              circle.id === activeCircleId && "bg-muted"
            )}
          >
            <div className="flex flex-col">
              <span>{circle.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {circle.role}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create New Circle
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function SidebarContent({
  circleName,
  circleId,
  circles,
  userName,
  userImage,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <CircleSwitcher
          circles={circles}
          activeCircleId={circleId}
          circleName={circleName}
        />
        <ThemeToggle />
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{userName || "User"}</span>
          </div>
        </div>
        <nav className="space-y-1">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <Separator className="my-2" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent {...props} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <span className="font-semibold">{props.circleName}</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full w-64 flex-col border-r bg-card">
        <SidebarContent {...props} />
      </div>
    </>
  );
}
