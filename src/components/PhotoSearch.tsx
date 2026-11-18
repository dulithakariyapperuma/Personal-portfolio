import { useEffect, useRef, useState } from 'react';
import { ApiOffline, searchPhotos, type PhotoHit } from '@/lib/api';

type Props = {
  category: string;
  onResults: (hits: PhotoHit[] | null) => void;
};

const SUGGESTIONS = [
  'golden hour by the sea',
  'two people laughing',
  'quiet and still',
  'strong shadows',
  'walking away together',
];

/**
 * Search the photographs by meaning rather than by keyword.
 *
 * Debounced at 280 ms: the model runs on every keystroke otherwise, and the
 * edge proxy rate-limits /api/ at 10 requests a second for exactly that
 * reason. The previous request is aborted when a new one starts, so a slow
 * answer can never overwrite a newer one.
 */
export default function PhotoSearch({ category, onResults }: Props) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'searching' | 'done' | 'offline' | 'error'>('idle');
  const [meta, setMeta] = useState<{ count: number; tookMs: number; servedBy: string } | null>(null);
  const [message, setMessage] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    abort.current?.abort();

    if (trimmed.length < 2) {
      setState('idle');
      setMeta(null);
      onResults(null);
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    setState('searching');

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchPhotos(trimmed, { category, limit: 24, signal: controller.signal });
        if (controller.signal.aborted) return;
        setMeta({ count: response.count, tookMs: response.tookMs, servedBy: response.servedBy });
        setState('done');
        onResults(response.results);
      } catch (error) {
        if (controller.signal.aborted) return;
        onResults(null);
        if (error instanceof ApiOffline) {
          setState('offline');
          setMessage('Search needs the API service running. The collections below still work.');
        } else {
          setState('error');
          setMessage(error instanceof Error ? error.message : 'Search failed.');
        }
      }
    }, 280);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, category, onResults]);

  return (
    <div className="photo-search">
      <div className="photo-search-field">
        <span className="photo-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Describe a photograph…"
          aria-label="Search the photographs by describing them"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
        />
        {query && (
          <button type="button" className="photo-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      <p className="photo-search-status" role="status" aria-live="polite">
        {state === 'idle' && <>Searched by meaning, not keywords — the words in your query do not have to appear anywhere.</>}
        {state === 'searching' && <>Searching…</>}
        {state === 'done' && meta && (
          meta.count === 0
            ? <>Nothing close enough. Try describing the light, the mood, or what people are doing.</>
            : <>{meta.count} {meta.count === 1 ? 'photograph' : 'photographs'} · {meta.tookMs} ms · served by <b>{meta.servedBy}</b></>
        )}
        {(state === 'offline' || state === 'error') && <>{message}</>}
      </p>

      {state === 'idle' && (
        <div className="photo-search-suggestions">
          {SUGGESTIONS.map(suggestion => (
            <button key={suggestion} type="button" onClick={() => setQuery(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
