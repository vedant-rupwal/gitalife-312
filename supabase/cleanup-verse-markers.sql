update public.verses
set
  sanskrit = trim(regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(sanskrit, ''), $$class=("|'|&quot;)?av-(devanagari|verse_text|translation|synonyms|purport)("|'|&quot;)?\s*>?$$, '', 'gi'),
      $$<\s*/?\s*div[^>]*>$$,
      ' ',
      'gi'
    ),
    $$(&nbsp;|&#xA0;)$$,
    ' ',
    'gi'
  )),
  transliteration = nullif(trim(regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(transliteration, ''), $$class=("|'|&quot;)?av-(devanagari|verse_text|translation|synonyms|purport)("|'|&quot;)?\s*>?$$, '', 'gi'),
      $$<\s*/?\s*div[^>]*>$$,
      ' ',
      'gi'
    ),
    $$(&nbsp;|&#xA0;)$$,
    ' ',
    'gi'
  )), ''),
  translation = trim(regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(translation, ''), $$class=("|'|&quot;)?av-(devanagari|verse_text|translation|synonyms|purport)("|'|&quot;)?\s*>?$$, '', 'gi'),
      $$<\s*/?\s*div[^>]*>$$,
      ' ',
      'gi'
    ),
    $$(&nbsp;|&#xA0;)$$,
    ' ',
    'gi'
  )),
  updated_at = now()
where
  sanskrit ~* $$class=("|'|&quot;)?av-|<\s*/?\s*div|&nbsp;|&#xA0;$$
  or transliteration ~* $$class=("|'|&quot;)?av-|<\s*/?\s*div|&nbsp;|&#xA0;$$
  or translation ~* $$class=("|'|&quot;)?av-|<\s*/?\s*div|&nbsp;|&#xA0;$$;
