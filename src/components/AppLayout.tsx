import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/AppSidebar";
import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/components/ui/button";
import {LogOut, Search} from "lucide-react";
import {ThemeToggle} from "@/components/ThemeToggle";
import {NotificationBell} from "@/components/NotificationBell";
import {OnboardingTour} from "@/components/OnboardingTour";
import {PageTransition} from "@/components/PageTransition";
import {ClinicInvitesBanner} from "@/components/ClinicInvitesBanner";
import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, userRole } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const initials = (profile?.full_name ?? user?.email ?? "U")[0].toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <button
                data-tour="search"
                onClick={() => {
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
                  );
                }}
                className="hidden sm:flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar...</span>
                <kbd className="pointer-events-none ml-4 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  CTRLK
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-1">
              {/* Avatar + name */}
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{initials}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {profile?.full_name ?? user?.email}
                </span>
              </div>
              <div data-tour="notifications">
                <NotificationBell />
              </div>
              <div data-tour="theme">
                <ThemeToggle />
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          {userRole === "psychologist" && <ClinicInvitesBanner />}
          <main className="flex-1 p-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <OnboardingTour />
    </SidebarProvider>
  );
}
