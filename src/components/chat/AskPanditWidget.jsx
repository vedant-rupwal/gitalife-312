import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

const historyKey = "gitalife.askPandit.history";
const initialMessages = [
  {
    role: "assistant",
    text: "Hare Krishna. Ask a question about the Gita, daily practice, or a spiritual topic.",
  },
];

const getVisibleScreenText = () =>
  document.body.innerText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

const isDebugMode = () => new URLSearchParams(window.location.search).has("panditDebug");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AskPanditWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(historyKey) || "null") || initialMessages;
    } catch {
      return initialMessages;
    }
  });
  const [question, setQuestion] = useState("");
  const [bookFilter, setBookFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(messages.slice(-20)));
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const reset = () => setMessages(initialMessages);

  const typeAssistantMessage = async (text) => {
    const words = text.split(/(\s+)/).filter(Boolean);
    setMessages((current) => [...current, { role: "assistant", text: "" }]);

    let typed = "";
    for (const word of words) {
      typed += word;
      setMessages((current) => {
        const next = [...current];
        const lastIndex = next.length - 1;
        next[lastIndex] = { ...next[lastIndex], text: typed };
        return next;
      });
      await sleep(word.trim() ? 22 : 8);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const userQuestion = question.trim();
    if (!userQuestion || loading) return;

    const nextMessages = [...messages, { role: "user", text: userQuestion }];
    const debugMode = isDebugMode();
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/ask-pandit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_question: userQuestion,
          visible_screen_text: getVisibleScreenText(),
          book_filter: bookFilter || null,
          history: nextMessages,
          debug: debugMode,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        let message = text || "The Pandit could not answer right now.";
        try {
          message = JSON.parse(text).error || message;
        } catch {
          // Keep the plain text response.
        }
        throw new Error(message);
      }
      const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      const debugHeader = response.headers.get("x-pandit-debug");
      const actionHeader = response.headers.get("x-pandit-action");
      let action = null;
      try {
        action = actionHeader ? JSON.parse(actionHeader) : null;
      } catch {
        action = null;
      }

      const shouldNavigate = action?.type === "navigate" && action.path;
      if (shouldNavigate) {
        navigate(action.path);
        setOpen(false);
      }

      const debugText = debugMode && debugHeader ? `\n\nDebug: ${debugHeader}` : `\n\nAnswered in ${elapsedSeconds}s`;
      const actionText = action?.label ? `${action.label}.\n\n` : "";
      await typeAssistantMessage(`${actionText}${text.trim() || "I do not have enough retrieved scripture to answer that."}${debugText}`);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: error instanceof Error ? error.message : "The Pandit server is unavailable right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-[60] md:bottom-6 md:right-6">
      {open && (
        <div className="mb-3 flex h-[min(560px,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl md:w-[22rem]">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-saffron to-gold px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/18">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold leading-tight">Ask the Pandit</p>
                <p className="font-body text-xs text-white/85">Scripture-guided answers</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25" aria-label="Clear chat">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25" aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-navy/8 bg-cream px-4 py-3">
            <label className="block font-heading text-[11px] font-semibold uppercase tracking-wide text-navy/50">Book focus</label>
            <select
              value={bookFilter}
              onChange={(event) => setBookFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-navy/10 bg-white px-3 py-2 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20"
            >
              <option value="">All available scripture</option>
              <option value="Bhagavad-gita">Bhagavad-gita</option>
            </select>
          </div>

          <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto bg-white p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 font-body text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-navy text-white"
                      : "bg-cream text-navy"
                  )}
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        a: ({ children, href }) => (
                          <a href={href} className="font-semibold text-saffron underline underline-offset-2" target="_blank" rel="noreferrer">
                            {children}
                          </a>
                        ),
                        table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="min-w-full text-left text-xs">{children}</table></div>,
                        th: ({ children }) => <th className="border-b border-navy/10 px-2 py-1 font-semibold">{children}</th>,
                        td: ({ children }) => <td className="border-b border-navy/10 px-2 py-1 align-top">{children}</td>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 font-body text-sm text-navy/60">
                  <Loader2 className="h-4 w-4 animate-spin text-saffron" />Thinking...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-navy/8 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) submit(event);
                }}
                rows={2}
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-navy/12 px-3 py-2 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20"
                placeholder="Ask about dharma, practice, a verse..."
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-saffron text-white transition-all hover:scale-105 disabled:opacity-50"
                aria-label="Send question"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-xl shadow-navy/20 transition-all hover:scale-105"
        aria-label="Open Ask the Pandit chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
