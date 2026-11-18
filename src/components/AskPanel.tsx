import { useEffect, useRef, useState } from 'react';
import { ApiOffline, askAssistant, type ChatSource } from '@/lib/api';

type Turn = {
  question: string;
  answer: string;
  sources: ChatSource[];
  provider?: string;
  notice?: string;
  failed?: boolean;
};

const STARTERS = [
  'What is the 3D brain on the landing page?',
  'How does the load balancing work?',
  'How is the photo search built?',
  'Who is Dulitha?',
];

/**
 * A retrieval-grounded assistant.
 *
 * Answers stream in token by token, so the first words appear long before
 * the last. Everything it says is drawn from an indexed knowledge file — it
 * has no general knowledge to fall back on and is told to admit when a
 * question is not covered, which is the only way a portfolio assistant stays
 * trustworthy.
 */
export default function AskPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) setOpen(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  // Stop generating if the panel closes or the component unmounts. The
  // server watches for the dropped connection and stops the model too.
  useEffect(() => () => abort.current?.abort(), []);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setQuestion('');
    setBusy(true);
    const index = turns.length;
    setTurns(current => [...current, { question: trimmed, answer: '', sources: [] }]);

    const controller = new AbortController();
    abort.current = controller;
    const update = (patch: Partial<Turn>) =>
      setTurns(current => current.map((turn, i) => (i === index ? { ...turn, ...patch } : turn)));

    try {
      let answer = '';
      for await (const event of askAssistant(trimmed, controller.signal)) {
        if (event.type === 'sources') update({ sources: event.sources });
        else if (event.type === 'text') { answer += event.text; update({ answer }); }
        else if (event.type === 'notice') update({ notice: event.text });
        else if (event.type === 'error') update({ answer: event.text, failed: true });
        else if (event.type === 'done') update({ provider: event.provider });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        update({
          failed: true,
          answer: error instanceof ApiOffline
            ? 'The assistant needs the API service running. Start the cluster with `docker compose up`, or run the API on its own with `npm --prefix services/api run dev`.'
            : error instanceof Error ? error.message : 'Something went wrong.',
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={`ask-launcher ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="ask-panel"
      >
        <span className="ask-launcher-dot" aria-hidden="true" />
        {open ? 'Close' : 'Ask about this site'}
      </button>

      {open && (
        <aside className="ask-panel" id="ask-panel" aria-label="Portfolio assistant">
          <header className="ask-head">
            <div>
              <span className="ask-kicker">RETRIEVAL-GROUNDED ASSISTANT</span>
              <h2>Ask about this site.</h2>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close the assistant">×</button>
          </header>

          <div className="ask-scroll" ref={scroller}>
            {turns.length === 0 && (
              <div className="ask-empty">
                <p>
                  Everything below comes from an indexed set of passages about this
                  portfolio. Ask something it does not cover and it will say so rather
                  than invent an answer.
                </p>
                <div className="ask-starters">
                  {STARTERS.map(starter => (
                    <button key={starter} onClick={() => ask(starter)}>{starter}</button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn, i) => (
              <article className="ask-turn" key={i}>
                <p className="ask-question">{turn.question}</p>
                {turn.notice && <p className="ask-notice">{turn.notice}</p>}
                <div className={`ask-answer ${turn.failed ? 'is-failed' : ''}`}>
                  {turn.answer
                    ? turn.answer.split('\n\n').map((paragraph, p) => <p key={p}>{paragraph}</p>)
                    : <p className="ask-thinking"><i /><i /><i /></p>}
                </div>
                {turn.sources.length > 0 && turn.answer && !turn.failed && (
                  <details className="ask-sources">
                    <summary>{turn.sources.length} passages retrieved{turn.provider ? ` · ${turn.provider}` : ''}</summary>
                    <ul>
                      {turn.sources.map(source => (
                        <li key={source.id}>
                          <b>{source.topic}</b>
                          <span>{source.score.toFixed(3)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            ))}
          </div>

          <form
            className="ask-form"
            onSubmit={event => { event.preventDefault(); ask(question); }}
          >
            <input
              ref={input}
              value={question}
              onChange={event => setQuestion(event.target.value)}
              placeholder={busy ? 'Answering…' : 'Ask a question…'}
              aria-label="Ask the assistant a question"
              maxLength={1000}
              disabled={busy}
            />
            {busy ? (
              <button type="button" onClick={() => abort.current?.abort()}>Stop</button>
            ) : (
              <button type="submit" disabled={!question.trim()}>Ask</button>
            )}
          </form>
        </aside>
      )}
    </>
  );
}
