import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Minus, Plus, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const GOAL = 16;

export default function JapaCounter() {
  const [rounds, setRounds] = useState(0);
  const [logged, setLogged] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [todayLog, setTodayLog] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    appClient.entities.JapaLog.filter({ log_date: today }, "-created_date", 1)
      .then((logs) => {
        if (logs.length > 0) {
          setTodayLog(logs[0]);
          setRounds(logs[0].rounds);
        }
      })
      .catch(() => {});
  }, [today]);

  const progress = Math.min((rounds / GOAL) * 100, 100);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const adjust = (delta) => {
    const next = Math.max(0, Math.min(GOAL, rounds + delta));
    setRounds(next);
    if (delta > 0) {
      setRipple(true);
      if (navigator.vibrate) navigator.vibrate(15);
      setTimeout(() => setRipple(false), 800);
    }
    setLogged(false);
  };

  const saveLog = async () => {
    try {
      if (todayLog) {
        const updated = await appClient.entities.JapaLog.update(todayLog.id, { rounds });
        setTodayLog(updated);
      } else {
        const created = await appClient.entities.JapaLog.create({ rounds, log_date: today });
        setTodayLog(created);
      }
      setLogged(true);
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } catch (e) {
      // error bubbles
    }
  };

  const reset = () => {
    setRounds(0);
    setLogged(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg className="w-72 h-72 -rotate-90" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r="120" fill="none" stroke="hsl(var(--navy) / 0.08)" strokeWidth="14" />
          <circle
            cx="128" cy="128" r="120" fill="none"
            stroke="hsl(var(--saffron))" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
            className={cn(rounds >= GOAL && "[stroke:hsl(var(--river))]")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-heading text-6xl font-bold transition-colors",
            rounds >= GOAL ? "text-river" : "text-navy"
          )}>
            {rounds}
          </span>
          <span className="font-body text-sm text-navy/50 mt-1">of {GOAL} rounds</span>
          {rounds >= GOAL && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-river/10 px-3 py-1 text-xs font-semibold text-river">
              <Check className="h-3 w-3" /> Complete
            </span>
          )}
        </div>
        {ripple && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-river/40 ripple-out" />
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={() => adjust(-1)}
          disabled={rounds === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-navy/15 text-navy disabled:opacity-30 active:scale-90 transition-transform"
          aria-label="Decrease rounds"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button
          onClick={() => adjust(1)}
          disabled={rounds >= GOAL}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron text-white shadow-lg shadow-saffron/30 disabled:opacity-50 active:scale-90 transition-transform pulse-ring"
          aria-label="Add one round"
        >
          <Plus className="h-7 w-7" />
        </button>
        <button
          onClick={reset}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-navy/15 text-navy active:scale-90 transition-transform"
          aria-label="Reset"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={saveLog}
        disabled={rounds === 0 || logged}
        className={cn(
          "mt-6 rounded-xl px-8 py-3 font-heading text-sm font-semibold transition-all",
          logged
            ? "bg-river text-white"
            : "bg-navy text-white hover:scale-105 disabled:opacity-40"
        )}
      >
        {logged ? "✓ Saved for today" : "Log Today's Rounds"}
      </button>
    </div>
  );
}