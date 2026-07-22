import { Link, useLocation } from "wouter";
import { Sparkles, Home, Clock, Folder, BarChart3, Menu, X, LogOut } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isAdmin = user?.emailAddresses?.some(e => e.emailAddress.includes("admin"));

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/generate", label: "Generate", icon: Sparkles },
    { href: "/history", label: "History", icon: Clock },
    { href: "/collections", label: "Collections", icon: Folder },
  ];

  if (isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin", icon: BarChart3 });
  }

  const handleSignOut = () => {
    signOut({ redirectUrl: basePath || "/" });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between py-6">
      <div className="px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Lumina</span>
        </Link>
        
        <nav className="mt-10 flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {user && (
        <div className="px-6">
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar className="h-9 w-9 border border-white/10">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium text-white truncate">{user.fullName || "Creator"}</span>
                <span className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-white" onClick={handleSignOut}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/5 glass-panel z-10 relative">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass-panel z-50 flex items-center justify-between px-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={14} />
          </div>
          <span className="font-bold text-lg text-white">Lumina</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-16">
          <SidebarContent />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background noise and gradient elements */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-[-1]"></div>
        
        <div className="flex-1 overflow-auto md:pt-0 pt-16">
          {children}
        </div>
      </main>
    </div>
  );
}
