import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Layers, Wand2, Clock, Folder } from "lucide-react";
import { useListRecentImages } from "@workspace/api-client-react";
import { ImageCard } from "@/components/image-card";

function LandingPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="h-20 border-b border-white/5 glass-panel flex items-center justify-between px-6 lg:px-12 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Lumina</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`${basePath}/sign-in`} className="text-sm font-medium text-white/80 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href={`${basePath}/sign-up`}>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              Start Creating
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative flex-1 flex items-center justify-center py-20 px-6 overflow-hidden min-h-[600px]">
          <div className="absolute inset-0 animated-gradient-bg opacity-30"></div>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-4">
              <Zap size={14} /> <span>The next generation of AI creation</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-tight">
              Bring your imagination <br/>
              <span className="neon-text">into reality.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Lumina is a premium AI studio that transforms your words into stunning visual masterpieces. Precision tools, infinite styles, zero friction.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href={`${basePath}/sign-up`}>
                <Button size="lg" className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] rounded-full w-full sm:w-auto">
                  <Wand2 className="mr-2" /> Start Creating for Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
        
        {/* Features minimal */}
        <section className="py-24 px-6 bg-black/40 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Hyper-Realistic Detail</h3>
              <p className="text-muted-foreground">Generate images with unparalleled clarity, perfect lighting, and cinematic composition.</p>
            </div>
            <div className="glass-panel p-8 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Infinite Styles</h3>
              <p className="text-muted-foreground">From cyberpunk to watercolor, select from dozens of curated style presets or invent your own.</p>
            </div>
            <div className="glass-panel p-8 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <Folder size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Organized Collections</h3>
              <p className="text-muted-foreground">Curate your history into moodboards and projects. Your personal creative history, always accessible.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Dashboard() {
  const { data: recentImages, isLoading } = useListRecentImages({ limit: 20 });
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Dashboard Hero */}
      <div className="relative py-16 px-8 border-b border-white/5 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 animated-gradient-bg opacity-[0.15]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">What will you create today?</h1>
          <div className="glass-panel p-2 rounded-full flex items-center max-w-2xl mx-auto border-white/10 shadow-2xl">
            <Link href={`${basePath}/generate`} className="flex-1">
              <div className="w-full flex items-center justify-between px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-text text-muted-foreground">
                <span>Describe your imagination...</span>
                <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90">
                  <Sparkles size={16} className="mr-2" /> Generate
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock size={24} className="text-primary" /> Recent Creations
          </h2>
          <Link href={`${basePath}/history`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-white">View all history</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-xl bg-card/50 border border-white/5 animate-pulse w-full" style={{ height: `${Math.random() * 200 + 200}px` }}></div>
            ))}
          </div>
        ) : recentImages && recentImages.length > 0 ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {recentImages.map((img) => (
              <div key={img.id} className="break-inside-avoid">
                <ImageCard image={img} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center glass-panel rounded-2xl">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/40">
              <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">It's quiet in here</h3>
            <p className="text-muted-foreground mb-6">You haven't generated any images yet.</p>
            <Link href={`${basePath}/generate`}>
              <Button className="bg-primary text-white">Create your first image</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Dashboard />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}
