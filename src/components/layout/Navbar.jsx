import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Events", path: "/events" },
  { label: "Hub", path: "/hubs" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-navy/8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron text-white transition-transform group-hover:scale-110">
              <Flame className="h-5 w-5" />
            </div>
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-heading text-lg font-bold text-navy tracking-tight">GitaLife</span>
              <span className="font-heading text-lg font-bold text-saffron tracking-tight">312</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-4 py-2 rounded-lg font-body text-sm font-medium transition-all",
                  location.pathname === link.path
                    ? "text-saffron bg-saffron/8"
                    : "text-navy/70 hover:text-navy hover:bg-navy/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg bg-navy px-5 py-2.5 font-heading text-sm font-semibold text-white transition-all hover:bg-navy/90 hover:scale-105"
            >
              Start Daily Practice
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg text-navy"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-navy/8 bg-white">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-lg font-body text-sm font-medium",
                  location.pathname === link.path
                    ? "text-saffron bg-saffron/8"
                    : "text-navy/70 hover:bg-navy/5"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="block mt-2 rounded-lg bg-saffron px-4 py-3 font-heading text-sm font-semibold text-white text-center"
            >
              Start Daily Practice
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}