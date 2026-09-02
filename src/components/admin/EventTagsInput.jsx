import React, { useState } from "react";
import { Plus, X } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

const normalizeTag = (value) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32);

export default function EventTagsInput({ tags = [], onChange }) {
  const [draftTag, setDraftTag] = useState("");

  const addTag = () => {
    const tag = normalizeTag(draftTag);
    if (!tag) return;
    const exists = tags.some((existing) => existing.toLowerCase() === tag.toLowerCase());
    if (!exists) onChange([...tags, tag]);
    setDraftTag("");
  };

  const removeTag = (tag) => {
    onChange(tags.filter((existing) => existing !== tag));
  };

  return (
    <div>
      <label className={labelCls}>Event Tags (Optional)</label>
      <div className="flex gap-2">
        <input
          value={draftTag}
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          className={inputCls}
          placeholder="Add a tag, then press Enter"
        />
        <button
          type="button"
          onClick={addTag}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron text-white transition-all hover:scale-105"
          aria-label="Add event tag"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="inline-flex items-center gap-1 rounded-full bg-navy/8 px-3 py-1.5 font-heading text-xs font-semibold text-navy transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
