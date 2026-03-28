"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const links = [
    { href: "/", label: "Voices" },
    { href: "/write", label: "Write" },
    { href: "/refine", label: "Refine" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-lg text-slate-900 tracking-tight hover:text-violet-700 transition-colors"
          >
            Essay<span className="text-violet-600">Voice</span>
          </Link>

          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1 mr-3">
              {links.map(({ href, label }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-violet-100 text-violet-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/essays"
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        pathname.startsWith("/essays")
                          ? "bg-violet-100 text-violet-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      My Essays
                    </Link>
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    <span className="text-sm text-slate-500 font-medium">
                      {user.username}
                    </span>
                    <button
                      onClick={logout}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
