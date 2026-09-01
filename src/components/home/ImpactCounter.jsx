import React, { useState, useEffect, useRef } from "react";
import { appClient } from "@/api/appClient";
import { BookOpen, UtensilsCrossed, Users, Mountain } from "lucide-react";

const iconMap = {
  BookOpen,
  UtensilsCrossed,
  Users,
  Mountain,
};

function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function AnimatedNumber({ value, inView }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);
  return <>{display.toLocaleString()}</>;
}

export default function ImpactCounter() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ref, inView] = useInView();

  useEffect(() => {
    appClient.entities.ImpactStat.list("sort_order", 50)
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-cream animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon] || BookOpen;
        return (
          <div
            key={stat.id}
            className="group relative overflow-hidden rounded-2xl border border-navy/8 bg-cream p-6 transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-saffron scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-saffron/10 text-saffron mb-4">
              <Icon className="h-6 w-6" />
            </div>
            <div className="font-heading text-4xl lg:text-5xl font-bold text-navy">
              <AnimatedNumber value={stat.value} inView={inView} />
              {stat.unit && stat.unit.startsWith("/") && <span className="text-2xl text-navy/40">{stat.unit}</span>}
            </div>
            <div className="mt-2 font-body text-sm text-navy/60">{stat.label}</div>
            {stat.unit && !stat.unit.startsWith("/") && (
              <div className="mt-1 font-body text-xs text-saffron font-medium">{stat.unit}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}