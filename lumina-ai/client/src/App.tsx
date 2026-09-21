import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { History } from "./pages/History";
import { Favorites } from "./pages/Favorites";
import { Collections } from "./pages/Collections";
import { CollectionDetail } from "./pages/CollectionDetail";

export default function App() {
  const { isSignedIn } = useAuth();
  const [guestMode, setGuestMode] = useState(() => {
    return localStorage.getItem("lumina_guest_mode") === "true";
  });

  useEffect(() => {
    if (guestMode) {
      localStorage.setItem("lumina_guest_mode", "true");
    }
  }, [guestMode]);

  const canAccessApp = isSignedIn || guestMode;

  return (
    <div className="min-h-screen">
      <Navbar guestMode={guestMode} />

      {!canAccessApp ? (
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
          <span className="mb-6 h-12 w-12 rounded-full bg-prism animate-shimmer bg-[length:200%_200%]" />
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Welcome to <span className="prism-text">Lumina</span>
          </h1>
          <p className="mt-3 max-w-md text-muted">
            Sign in with your <strong>Email</strong> or <strong>Google account</strong> to sync your creations, favorites, and collections across devices, or explore as a guest.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <SignInButton mode="modal">
              <button className="rounded-full bg-prism px-7 py-3 text-sm font-semibold text-canvas transition-opacity hover:opacity-90">
                Sign in (Email / Google)
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-full border border-violet/60 bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-violet hover:bg-surface2">
                Create Account
              </button>
            </SignUpButton>
            <button
              onClick={() => setGuestMode(true)}
              className="rounded-full border border-line/80 bg-surface/80 px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-ink hover:bg-surface2"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
        </Routes>
      )}
    </div>
  );
}
