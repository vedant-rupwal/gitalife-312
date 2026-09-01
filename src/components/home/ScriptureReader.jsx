import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Clock, Play, Pause, RotateCcw } from "lucide-react";

const READER_PASSAGES = [
  "The Supreme Lord said: My dear Arjuna, because you are never envious of Me, I shall impart to you this most confidential knowledge, which is known by direct experience. It is the king of education, the king of secrets.",
  "As the embodied soul continuously passes through boyhood, youth, and old age in this body, similarly the soul passes into another body at death. A self-realized soul is not bewildered by such a change.",
  "One who is not in transcendental consciousness can have neither a controlled mind nor steady intelligence, without which there can be no peace. And how can there be any happiness without peace?",
  "For the soul there is neither birth nor death at any time. It is unborn, eternal, ever-existing, and primeval. It is not slain when the body is slain.",
  "The work of a person who is unattached to the modes of material nature and fully situated in transcendental knowledge merges entirely into transcendence.",
];

const DURATION = 8 * 60;

export default function ScriptureReader() {
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [passageIdx, setPassageIdx] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => Math.max(0, t - 1));
      }, 1000);
    } else if (timeLeft === 0) {
      setRunning(false);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = ((DURATION - timeLeft) / DURATION) * 100;

  const toggle = () => setRunning(!running);
  const reset = () => {
    setRunning(false);
    setTimeLeft(DURATION);
    setPassageIdx(0);
  };

  const nextPassage = () => setPassageIdx((i) => (i + 1) % READER_PASSAGES.length);

  return (
    <div className="rounded-2xl border border-navy/8 bg-cream p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-saffron" />
          <span className="font-heading text-sm font-semibold text-navy">Guided Scripture Reader</span>
        </div>
        <span className="flex items-center gap-1 font-body text-xs text-navy/50">
          <Clock className="h-3.5 w-3.5" /> 8 min daily
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-heading text-2xl font-bold text-navy tabular-nums">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className="font-body text-xs text-navy/40">Passage {passageIdx + 1} of {READER_PASSAGES.length}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-navy/8 overflow-hidden">
          <div
            className="h-full rounded-full bg-saffron transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="min-h-[120px] rounded-xl bg-white border border-navy/8 p-5 mb-6">
        <p className="font-display text-base sm:text-lg text-navy/80 leading-relaxed italic">
          {READER_PASSAGES[passageIdx]}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-xl bg-saffron px-6 py-3 font-heading text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : timeLeft === DURATION ? "Begin Reading" : "Resume"}
        </button>
        <button
          onClick={nextPassage}
          className="rounded-xl border border-navy/15 px-5 py-3 font-heading text-sm font-semibold text-navy transition-all hover:bg-navy/5"
        >
          Next Passage
        </button>
        <button
          onClick={reset}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy/15 text-navy transition-all hover:bg-navy/5"
          aria-label="Reset timer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
