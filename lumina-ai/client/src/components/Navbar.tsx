import { NavLink } from "react-router-dom";
import { useAuth, useUser, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";

const links = [
  { to: "/", label: "Generate" },
  { to: "/history", label: "History" },
  { to: "/favorites", label: "Favorites" },
  { to: "/collections", label: "Collections" },
];

export function Navbar({ guestMode }: { guestMode?: boolean }) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const showNav = isSignedIn || guestMode;

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="relative h-6 w-6 shrink-0 rounded-full bg-prism animate-shimmer bg-[length:200%_200%]" />
          <span className="font-display text-lg font-semibold tracking-tight">Lumina</span>
        </NavLink>

        {showNav && (
          <nav className="hidden items-center gap-1 rounded-full border border-line/60 bg-surface/60 p-1 sm:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-surface2 text-ink" : "text-muted hover:text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {guestMode && !isSignedIn && (
            <span className="hidden sm:inline-block rounded-full border border-line/80 bg-surface2 px-3 py-1 font-mono text-xs text-muted">
              Guest Mode
            </span>
          )}
          {!isSignedIn ? (
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <button className="rounded-full bg-prism px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-90">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="hidden sm:inline-block rounded-full border border-line/80 bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-violet/60 hover:bg-surface2">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {userEmail && (
                <span className="hidden md:inline-block rounded-full border border-line/60 bg-surface/60 px-3 py-1 font-mono text-xs text-muted max-w-[180px] truncate">
                  {userEmail}
                </span>
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
      </div>

      {/* mobile nav */}
      {showNav && (
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-line/60 px-4 py-2 sm:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                  isActive ? "bg-surface2 text-ink" : "text-muted"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
