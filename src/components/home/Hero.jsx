import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream grain">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30">
          <img
            src="https://images.unsplash.com/photo-1474181487882-5abf3f0a1d1c?w=1200&q=80"
            alt="Chicago skyline at golden hour"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/95 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-saffron/20 bg-saffron/5 px-4 py-1.5 mb-8 float-up">
            <MapPin className="h-3.5 w-3.5 text-saffron" />
            <span className="font-heading text-xs font-semibold text-saffron tracking-wide uppercase">Chicago · UIC · DePaul · Northwestern · UChicago</span>
          </div>

          <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl font-bold text-navy leading-[0.95] tracking-tight float-up" style={{ animationDelay: "0.1s" }}>
            Ancient Wisdom.<br />
            <span className="text-saffron">WindyCity</span> Rhythm.
          </h1>

          <p className="mt-8 font-body text-lg sm:text-xl text-navy/70 max-w-2xl leading-relaxed float-up" style={{ animationDelay: "0.2s" }}>
            A spiritual community for Chicago's students and young professionals. We're living the Bhagavad Gita in the Loop, Lincoln Park, Hyde Park, and Evanston—blending timeless dharma with the pulse of the city.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 float-up" style={{ animationDelay: "0.3s" }}>
            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-saffron px-7 py-4 font-heading text-base font-semibold text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-saffron/30"
            >
              Find Your WindyCity Hub
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-navy/15 bg-white px-7 py-4 font-heading text-base font-semibold text-navy transition-all hover:border-navy/30 hover:bg-navy/5"
            >
              Start Daily Practice
            </Link>
          </div>

          <div className="mt-14 flex items-center gap-8 float-up" style={{ animationDelay: "0.4s" }}>
            <div>
              <div className="font-heading text-3xl font-bold text-navy">1,200+</div>
              <div className="font-body text-sm text-navy/50">Rounds chanted today</div>
            </div>
            <div className="h-12 w-px bg-navy/10" />
            <div>
              <div className="font-heading text-3xl font-bold text-river">12</div>
              <div className="font-body text-sm text-navy/50">Active circles</div>
            </div>
            <div className="h-12 w-px bg-navy/10" />
            <div>
              <div className="font-heading text-3xl font-bold text-saffron">450</div>
              <div className="font-body text-sm text-navy/50">Meals/week served</div>
            </div>
          </div>
        </div>
      </div>

      <div className="saffron-thread h-px w-full" />
    </section>
  );
}