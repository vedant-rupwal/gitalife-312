import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Mail, MapPin } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <BrandLogo className="h-14 w-14 border border-white/20" />
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="font-heading text-2xl font-bold">GitaLife</span>
                <span className="font-heading text-2xl font-bold text-saffron">312</span>
              </div>
            </div>
            <p className="font-display text-2xl text-white/90 leading-snug max-w-md">
              Ancient Wisdom.<br />WindyCity Rhythm.
            </p>
            <p className="mt-4 font-body text-sm text-white/60 max-w-sm">
              A youth & young professional spiritual community living the Bhagavad Gita in Chicago.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold text-saffron uppercase tracking-wider mb-4">Explore</h4>
            <ul className="space-y-3 font-body text-sm">
              <li><Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/dashboard" className="text-white/70 hover:text-white transition-colors">Today's Practice</Link></li>
              <li><Link to="/events" className="text-white/70 hover:text-white transition-colors">Events & Seva</Link></li>
              <li><Link to="/volunteer" className="text-white/70 hover:text-white transition-colors">Volunteer</Link></li>
              <li><Link to="/impact" className="text-white/70 hover:text-white transition-colors">Impact</Link></li>
              <li><Link to="/gallery" className="text-white/70 hover:text-white transition-colors">Gallery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold text-saffron uppercase tracking-wider mb-4">Connect</h4>
            <ul className="space-y-3 font-body text-sm">
              <li className="flex items-center gap-2 text-white/70">
                <MapPin className="h-4 w-4 text-river" /> Chicago, IL 60601
              </li>
              <li className="flex items-center gap-2 text-white/70">
                <Mail className="h-4 w-4 text-river" /> hello@gitalife312.org
              </li>
              <li>
                <a
                  href="https://instagram.com/gitalife312"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4 text-river" /> @gitalife312
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-body text-xs text-white/40">© 2026 GitaLife 312. Built with devotion in the Windy City.</p>
          <div className="flex gap-6 font-body text-xs text-white/40">
            <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
            <Link to="/login" className="hover:text-white/70 transition-colors">Login</Link>
            <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
