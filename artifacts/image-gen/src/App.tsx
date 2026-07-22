import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

// Pages
import HomeRoute from "@/pages/home";
import GeneratePage from "@/pages/generate";
import HistoryPage from "@/pages/history";
import CollectionsPage from "@/pages/collections";
import CollectionDetailPage from "@/pages/collection-detail";
import AdminPage from "@/pages/admin";
import { Sidebar } from "@/components/layout";

// Clerk wiring
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(262 83% 65%)",
    colorForeground: "hsl(0 0% 98%)",
    colorMutedForeground: "hsl(220 10% 65%)",
    colorDanger: "hsl(0 84.2% 60.2%)",
    colorBackground: "hsl(220 15% 10%)",
    colorInput: "hsl(220 15% 18%)",
    colorInputForeground: "hsl(0 0% 98%)",
    colorNeutral: "hsl(220 15% 16%)",
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#161719] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl border border-white/10",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-white tracking-tight",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-white/80 font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-[#161719] px-2",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-white",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white h-11 text-base font-medium shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all",
    formFieldInput: "bg-[#1c1e22] border-white/10 text-white h-11 focus:ring-primary/50",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 animated-gradient-bg opacity-[0.15]"></div>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl"></div>
      <div className="relative z-10">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 animated-gradient-bg opacity-[0.15]"></div>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl"></div>
      <div className="relative z-10">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

// Protected layout wrapper
function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Sidebar>
          <Component />
        </Sidebar>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to Lumina",
            subtitle: "Sign in to access your creative studio",
          },
        },
        signUp: {
          start: {
            title: "Join Lumina",
            subtitle: "Start forging your imagination",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={() => (
            <>
              <Show when="signed-in">
                <Sidebar><HomeRoute /></Sidebar>
              </Show>
              <Show when="signed-out">
                <HomeRoute />
              </Show>
            </>
          )} />
          
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/generate" component={() => <ProtectedRoute component={GeneratePage} />} />
          <Route path="/history" component={() => <ProtectedRoute component={HistoryPage} />} />
          <Route path="/collections" component={() => <ProtectedRoute component={CollectionsPage} />} />
          <Route path="/collections/:id" component={(params) => <ProtectedRoute component={() => <CollectionDetailPage id={params.params.id} />} />} />
          <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} />} />
          
          <Route>
            <div className="flex h-screen items-center justify-center text-white bg-background">
              404 - Not Found
            </div>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </ThemeProvider>
  );
}
