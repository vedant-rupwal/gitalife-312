import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Calendar, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StickyActionBar() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onDashboard = location.pathname === "/dashboard";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="glass-bar border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          {!onDashboard && (
            <Link
              to="/dashboard"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron px-4 py-3 font-heading text-sm font-semibold text-white active:scale-95 transition-transform"
            >
              <Sparkles className="h-4 w-4" />
              Log Practice
            </Link>
          )}
          <Link
            to="/events"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/15 px-4 py-3 font-heading text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            <Calendar className="h-4 w-4" />
            Sign Up
          </Link>
          <a
            href="https://chat.whatsapp.com/gitalife312"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-river px-4 py-3 font-heading text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}