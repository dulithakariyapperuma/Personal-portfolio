import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { DURATION, EASE } from '@/design/motion';

// three.js is by far the heaviest dependency on the site. Loading it lazily
// lets the headline and the lessons paint before the 3D cortex arrives; the
// existing 'Assembling the mind…' status covers the gap.
const BrainScene = lazy(() => import('@/components/BrainScene'));
import { REGIONS, type Activity, type RegionId } from '@/lib/brainRegions';
import type { HemisphereId } from '@/lib/constants';
import { useBrainSound } from '@/lib/useBrainSound';
import AskPanel from '@/components/AskPanel';
import '@/components/ask.css';
import './journey.css';
import './journey-immersive.css';

const SOURCES = {
  code: 'https://news.mit.edu/2020/brain-reading-computer-code-1215',
  myth: 'https://uofuhealth.utah.edu/index.php/newsroom/news/2013/no-evidence-right-brained-vs-left-brained',
  creativity: 'https://pubmed.ncbi.nlm.nih.gov/29339474/',
  einstein: 'https://www.einstein.caltech.edu/news/for-einstein-music-exists-for-the-soul',
  nobel: 'https://www.nobelprize.org/prizes/physics/1921/einstein/biographical/',
  cajal: 'https://www.nobelprizemuseum.se/en/exhibition/synapses-science-and-art-in-spain-from-ramon-y-cajal-to-the-21st-century/',
};
type Lesson = { region: RegionId; verb: string; title: string; text: string; example: string };
const LESSONS: Record<Activity, Lesson[]> = {
  coding: [
    { region: 'md', verb: 'Reason', title: 'Hold a world in your mind.', text: 'Following code means keeping rules and changing values in mind. Code-comprehension research finds strong engagement of the multiple demand network across frontal and parietal regions in both hemispheres.', example: 'Trace a loop. Remember the current value. Predict what comes next.' },
    { region: 'prefrontal', verb: 'Plan', title: 'Give the idea a structure.', text: 'Frontal systems support planning and goal-directed behavior. A useful way to connect that general function to programming is to think about choosing a solution before writing it.', example: 'Break a difficult feature into small steps. Compare two possible approaches.' },
    { region: 'parietal', verb: 'Connect', title: 'See how the pieces fit.', text: 'Parietal regions contribute to spatial relationships and attention. Some also belong to the network recruited during code comprehension. Complex tasks draw on interacting systems.', example: 'Sketch a data flow. Move from a visual relationship to a working algorithm.' },
  ],
  photography: [
    { region: 'visual', verb: 'Notice', title: 'Before the shutter, light.', text: 'Occipital visual cortex helps process color, form, and motion. Noticing a bright edge against a shadow is one everyday way to connect this general function to photography.', example: 'Find the light first. Notice a shape before you decide what it means.' },
    { region: 'parietal', verb: 'Compose', title: 'Turn space into a story.', text: 'Parietal systems help integrate sensory information and spatial relationships. Framing a scene puts those general abilities to use as you compare the subject, edges, and surrounding space.', example: 'Move the frame. Leave room in the direction a subject is looking.' },
    { region: 'motor', verb: 'Capture', title: 'Make intention a movement.', text: 'Motor cortex helps direct voluntary movement; the cerebellum contributes to coordination. Holding a camera steady and pressing the shutter brings perception and action together.', example: 'Steady your hands. Time the shutter. Review the image and try again.' },
  ],
};
function Source({ href, children }: { href: string; children: React.ReactNode }) { return <a className="j-source" href={href} target="_blank" rel="noreferrer">{children} ↗</a>; }

function Experiment({ activity }: { activity: Activity }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const [frame, setFrame] = useState(0);
  return <div className="j-experiment">
    <span className="j-kicker">TRY IT / A SMALL CREATIVE EXPERIMENT</span>
    {activity === 'coding' ? <>
      <h3>Run this in your mind.</h3><pre><span>let</span> light = 1;{'\n'}<span>for</span> (let i = 0; i &lt; 3; i++) {'{'}{'\n'}  light = light * 2;{'\n'}{'}'}</pre>
      <p>What is the final value of <code>light</code>?</p><div className="j-answers">{[6, 8, 16].map(n => <button key={n} aria-pressed={answer === n} onClick={() => setAnswer(n)}>{n}</button>)}</div>
      <p className="j-feedback" role="status">{answer === null ? 'Predict, then test. The same rhythm can shape an artwork.' : answer === 8 ? 'Exactly: 1 → 2 → 4 → 8. You tracked a changing value through three steps.' : 'Trace three doublings: 1 → 2 → 4 → 8. Try again with the loop in mind.'}</p>
    </> : <>
      <h3>One scene. Two intentions.</h3><div className={`j-frame frame-${frame}`} role="img" aria-label={frame ? 'Abstract landscape with the sun offset to the right, leaving open space on the left' : 'Abstract landscape with the sun centered for a symmetrical composition'}><div className="j-sun" /><div className="j-mountain back" /><div className="j-mountain" /><div className="j-thirds" /></div>
      <div className="j-answers"><button aria-pressed={frame === 0} onClick={() => setFrame(0)}>Find symmetry</button><button aria-pressed={frame === 1} onClick={() => setFrame(1)}>Leave space</button></div>
      <p className="j-feedback" role="status">{frame ? 'The offset subject leaves room for the eye to travel. Compare the feeling; neither framing is universally better.' : 'A centered subject can suggest stillness. Change the composition and notice what happens to your attention.'}</p><small>Illustrated composition study, not a photograph or a brain test.</small>
    </>}
  </div>;
}

function ConnectionLab() {
  const [mode, setMode] = useState(2);
  const labels = ['Imagine', 'Evaluate', 'Connect'];
  return <div className={`j-lab mode-${mode}`}>
    <div className="j-network" aria-hidden="true"><svg viewBox="0 0 600 240"><defs><linearGradient id="j-network-gradient"><stop stopColor="#64dbe6" /><stop offset="1" stopColor="#efbd7e" /></linearGradient></defs><g fill="none" stroke="url(#j-network-gradient)"><path d="M90 120 C180 5 420 235 510 120 M90 120 C180 235 420 5 510 120 M90 120 H510" />{[0, 1, 2].map(i => <circle key={i} cx={i === 0 ? 90 : i === 1 ? 510 : 300} cy="120" r={i === 2 ? 45 : 61} />)}</g><g fill="#64dbe6"><circle cx="90" cy="120" r="7" /><circle className="j-travel" cx="300" cy="120" r="5" /></g><circle fill="#efbd7e" cx="510" cy="120" r="7" /></svg><div className="j-network-labels"><span>POSSIBILITY</span><span>CREATIVE PRACTICE</span><span>PRECISION</span></div></div>
    <div className="j-mode-buttons" aria-label="Explore a creative process">{labels.map((label, i) => <button key={label} aria-pressed={mode === i} onClick={() => setMode(i)}><span>0{i + 1}</span>{label}</button>)}</div>
    <div className="j-lab-copy" key={mode} aria-live="polite"><h3>{['Ask “what if?”', 'Ask “does it work?”', 'Let the two talk.'][mode]}</h3><p>{['Generate alternatives before judging them. Sketch three interfaces, try an unusual crop, or imagine a different solution.', 'Check the constraints. Does the code handle an edge case? Does the photograph direct attention where you intended?', 'Alternate possibility with precision: imagine a solution, test it, then revise. Balance means making room for both habits, not dividing your day or your brain into equal halves.'][mode]}</p></div><small>A creative-process illustration, not a map or measurement of brain activity.</small>
  </div>;
}

export default function Landing() {
  const sound = useBrainSound();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selectionButton = useRef<HTMLButtonElement>(null);
  const [activity, setActivity] = useState<Activity | null>(() => location.pathname === '/programming' ? 'coding' : location.pathname === '/photography' ? 'photography' : null);
  const [entering, setEntering] = useState<HemisphereId | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<HemisphereId | null>(null);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const lesson = activity ? LESSONS[activity][step] : null;
  const region = lesson ? REGIONS[lesson.region] : null;
  useEffect(() => {
    setActivity(pathname === '/programming' ? 'coding' : pathname === '/photography' ? 'photography' : null);
    setStep(0); setPlaying(false); setEntering(null);
  }, [pathname]);
  useEffect(() => {
    if (!entering) return;
    const previous = document.activeElement as HTMLElement;
    selectionButton.current?.focus({ preventScroll: true });
    const outside = [...document.querySelectorAll<HTMLElement>('.journey > :not(.j-mind)')];
    outside.forEach(el => { el.inert = true; });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setEntering(null); };
    window.addEventListener('keydown', escape);
    return () => { outside.forEach(el => { el.inert = false; }); window.removeEventListener('keydown', escape); previous?.focus({ preventScroll: true }); };
  }, [entering]);
  useEffect(() => {
    // Also resets the title when arriving with no activity chosen — otherwise
    // navigating back from a portfolio route leaves that page's title behind.
    if (!activity) {
      document.title = 'One connected mind — Dulitha Kariyapperuma';
      return;
    }
    setVisited(v => v.includes(`${activity}-${step}`) ? v : [...v, `${activity}-${step}`]);
    document.title = `${activity === 'coding' ? 'Code' : 'Photography'} · One connected mind — Dulitha Kariyapperuma`;
  }, [activity, step]);
  useEffect(() => { if (activity) heading.current?.focus({ preventScroll: true }); }, [activity]);
  useEffect(() => {
    if (!playing || !activity) return;
    const timer = window.setTimeout(() => { if (step === 2) setPlaying(false); else setStep(s => s + 1); }, 9000);
    return () => clearTimeout(timer);
  }, [playing, activity, step]);
  function choose(side: HemisphereId) { if (entering) return; sound.play(side); setPlaying(false); setEntering(side); setHover(null); }
  function home() { navigate('/'); setEntering(null); setActivity(null); setPlaying(false); setStep(0); setReset(r => r + 1); document.title = 'One connected mind — Dulitha Kariyapperuma'; }
  function learn() {
    sound.play('confirm');
    const next = entering === 'L' ? 'coding' : 'photography';
    setActivity(next); setStep(0); setEntering(null);
    navigate(next === 'coding' ? '/programming' : '/photography');
    document.getElementById('mind')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  function selectRegion(id: RegionId) { if (!activity) return; const index = LESSONS[activity].findIndex(l => l.region === id); if (index >= 0) { setPlaying(false); setStep(index); } }
  // A hairline that tracks how far down the page you are. useSpring smooths
  // the raw scroll value — bound directly, it jitters on a trackpad.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const reducedMotion = useReducedMotion();

  return <main className={`journey ${(entering ? entering === 'R' : activity === 'photography') ? 'j-warm' : ''} ${entering ? 'is-selecting' : ''}`}>
    <motion.div className="j-progress" style={{ scaleX: progress }} aria-hidden="true" />
    <header className="j-header"><a href="#mind" className="j-brand" onClick={home}><b>dk</b><span>DULITHA<br />KARIYAPPERUMA</span></a><nav aria-label="Page sections"><a href="#mind">The mind</a><a href="#connection">The connection</a><a href="#evidence">The evidence</a></nav><span className="j-header-note">ENGINEERING × PHOTOGRAPHY</span></header>
    <section id="mind" className={`j-mind ${activity ? 'is-exploring' : ''} ${entering ? 'is-entering' : ''}`} aria-label="Interactive brain journey">
      <button className="j-sound" onClick={sound.toggle} aria-pressed={sound.enabled} aria-label={sound.enabled ? 'Mute interaction sounds' : 'Enable interaction sounds'}><span className="j-sound-bars" aria-hidden="true"><i /><i /><i /><i /></span>Sound {sound.enabled ? 'on' : 'off'}</button>
      <div className="j-atmosphere" />
      <div className="j-intro"><span className="j-kicker"><i /> AN INTERACTIVE PORTFOLIO OF CURIOSITY</span><h1><span className="line-mask"><motion.span style={{ display: 'block' }} initial={reducedMotion ? { opacity: 0 } : { y: '110%' }} animate={reducedMotion ? { opacity: 1 } : { y: '0%' }} transition={{ duration: DURATION.slow, ease: EASE }}>Two ways of seeing.</motion.span></span><span className="line-mask"><motion.em style={{ display: 'block' }} initial={reducedMotion ? { opacity: 0 } : { y: '110%' }} animate={reducedMotion ? { opacity: 1 } : { y: '0%' }} transition={{ duration: DURATION.slow, delay: 0.09, ease: EASE }}>One connected mind.</motion.em></span></h1><p>I build with code. I compose with light.<br />Step inside the brain behind both.</p></div>
      <div className="j-brain" aria-label="Drag the brain to rotate. Scroll to zoom. Choose cyan for programming or amber for photography."><Suspense fallback={null}><BrainScene activity={activity} region={entering ? entering === 'L' ? 'md' : 'visual' : lesson?.region ?? null} reset={reset} enteringSide={entering} hoveredSide={hover} onHoverSide={setHover} onSelect={choose} onRegion={selectRegion} onReady={() => setReady(true)} onError={() => setFailed(true)} /></Suspense></div>
      {(!ready || failed) && <p className="j-loading" role="status">{failed ? '3D unavailable. The lessons below still work.' : 'Assembling the mind…'}</p>}
      {!activity ? <div className="j-choices"><button className="j-choice coding" onClick={() => choose('L')} onMouseEnter={() => setHover('L')} onMouseLeave={() => setHover(null)} disabled={!!entering}><span className="j-kicker">01 / PROGRAMMING</span><h2>Make it<br /><em>work.</em></h2><p>Reason. Plan. Connect.</p><span className="j-choice-cta">Enter the coding mind <b>↗</b></span></button><button className="j-choice photography" onClick={() => choose('R')} onMouseEnter={() => setHover('R')} onMouseLeave={() => setHover(null)} disabled={!!entering}><span className="j-kicker">02 / PHOTOGRAPHY</span><h2>Make it<br /><em>felt.</em></h2><p>Notice. Compose. Capture.</p><span className="j-choice-cta">Enter the photographic mind <b>↗</b></span></button></div> : <>
        <div className="j-explore-heading"><button className="j-back" onClick={home}>← Choose a different lens</button><span className="j-kicker">{activity === 'coding' ? '01 / PROGRAMMING' : '02 / PHOTOGRAPHY'} · INSIDE THE PROCESS</span><h2 ref={heading} tabIndex={-1}>{activity === 'coding' ? 'From thought to code.' : 'From light to story.'}</h2></div>
        <article className="j-lesson"><div className="j-lesson-top"><span className="j-kicker">YOUR BRAIN AT WORK</span><button className="j-play" onClick={() => { if (step === 2 && !playing) setStep(0); setPlaying(!playing); }}>{playing ? 'Ⅱ Pause tour' : '▷ Play tour'}</button></div>
          <div className="j-steps" aria-label="Brain lessons">{LESSONS[activity].map((l, i) => <button key={l.verb} aria-pressed={i === step} onClick={() => { setStep(i); setPlaying(false); }}><span>{visited.includes(`${activity}-${i}`) ? '✓' : `0${i + 1}`}</span>{l.verb}<i className={playing && i === step ? 'is-playing' : ''} /></button>)}</div>
          <div className="j-lesson-story" key={`${activity}-${step}`} aria-live={playing ? 'off' : 'polite'}><span className="j-location">{region?.name} · {step + 1}/3</span><h3>{lesson?.title}</h3><p>{lesson?.text}</p><div className="j-example"><span>IN PRACTICE</span><p>{lesson?.example}</p></div><Source href={activity === 'coding' && step === 0 ? SOURCES.code : region!.source}>{activity === 'coding' && step === 0 ? 'MIT · Code-comprehension research' : region!.sourceTitle}</Source></div>
          <div className="j-lesson-bottom"><span>{visited.filter(v => v.startsWith(activity)).length}/3 moments explored</span>{step < 2 ? <button onClick={() => { setStep(s => s + 1); setPlaying(false); }}>Next moment →</button> : <a href="#connection" onClick={() => setPlaying(false)}>Discover the connection ↓</a>}</div>
        </article>
      </>}
      <div className="j-controls"><button onClick={() => setReset(r => r + 1)}>↺ Reset view</button><span>DRAG TO ROTATE · SCROLL / PINCH TO ZOOM</span></div>
      <p className="j-science-note">{activity ? 'Approximate teaching overlays, not scans. Both hemispheres participate.' : 'Two entrances, not two kinds of brain. Both practices use connected networks.'}</p>
      {activity && <div className="j-switch"><button aria-pressed={activity === 'coding'} onClick={() => choose('L')} disabled={!!entering}>Code</button><button aria-pressed={activity === 'photography'} onClick={() => choose('R')} disabled={!!entering}>Photography</button></div>}
      {entering && <>
        <div className="j-game-backdrop" aria-hidden="true" />
        <div className="j-selection-bloom" aria-hidden="true" />
        <div className="j-game-label" role="status"><span className="j-kicker">{entering === 'L' ? 'PROGRAMMING' : 'PHOTOGRAPHY'}</span><p>{entering === 'L' ? 'Frontal + parietal networks' : 'Visual + spatial + motor networks'}</p></div>
        <div className="j-game-actions" role="group" aria-label="Choose your next step">
          <button ref={selectionButton} className="j-game-option portfolio-option" onClick={() => { sound.play('confirm'); navigate(entering === 'L' ? '/portfolio/programming' : '/portfolio/photography'); }}><span><small>01 / DISCOVER THE WORK</small>Go to portfolio</span><b aria-hidden="true">↗</b></button>
          <button className="j-game-option learn-option" onClick={learn}><span><small>02 / FOLLOW YOUR CURIOSITY</small>Learn about the brain</span><b aria-hidden="true">→</b></button>
        </div>
        <div className="j-game-bottom"><button onClick={() => { sound.play('back'); setEntering(null); }}>← Back</button><small>Drag to explore · Approximate regions · both hemispheres participate</small></div>
      </>}
    </section>
    {activity && <section className="j-practice j-section" key={activity}><div><span className="j-kicker">THE PORTFOLIO, IN MINIATURE</span><h2>{activity === 'coding' ? <>Think like<br />a <em>builder.</em></> : <>Look like<br />a <em>storyteller.</em></>}</h2><p>{activity === 'coding' ? 'A working solution starts with a possibility. Then comes the discipline of checking it.' : 'A compelling frame starts with attention. Then comes the discipline of making a choice.'}</p><p className="j-fine">The lesson order is a storytelling device. Your brain does not run through these regions one at a time. {activity === 'photography' ? 'These are general neuroscience principles applied to photography, not findings from a photography-specific brain scan.' : 'The exercises illustrate thinking habits, not a measurement of your brain.'}</p></div><Experiment activity={activity} /></section>}
    <section id="connection" className="j-section j-connection"><div className="j-section-label"><span className="j-kicker">03 / WHERE THE TWO MEET</span><span>LOGIC + ART</span></div><div className="j-split"><div><h2>Give imagination<br /><em>something to build on.</em></h2><p>Code needs invention. Photography needs decisions. Making room for both can enrich the way we approach a problem: generate possibilities, test them, then try again.</p></div><aside className="j-truth"><span className="j-kicker">A BETTER STORY THAN “LEFT VS RIGHT”</span><p>Some functions are lateralized. But people do not divide neatly into logical left-brain and creative right-brain types.</p><Source href={SOURCES.myth}>University of Utah · The evidence</Source></aside></div><ConnectionLab /><div className="j-research"><span className="j-kicker">WHAT RESEARCH SUPPORTS</span><p>A 2018 study linked creative thinking ability to cooperation among default, salience, and executive networks. This is an association with network connectivity—not proof that an art hobby boosts intelligence or that a 50/50 “brain balance” exists.</p><Source href={SOURCES.creativity}>Beaty et al. · PNAS, 2018</Source></div></section>
    <section id="evidence" className="j-section j-evidence"><div className="j-section-label"><span className="j-kicker">04 / REAL PEOPLE. CROSSING DISCIPLINES.</span><span>VERIFIED STORIES</span></div><h2>A curious mind<br /><em>doesn’t stay in one lane.</em></h2><div className="j-people"><article><div className="j-person-art einstein" aria-hidden="true"><span>E = mc²</span><svg viewBox="0 0 240 160"><g fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M118 12v95m5-95v95m-14-60c-35-18-40 22-18 31-26 28-15 60 28 60s55-32 29-60c22-9 17-49-18-31M95 89h49M103 123h34M164 20L70 142" /><path d="M108 12h24v17h-24z" /></g></svg></div><div className="j-person-copy"><span className="j-kicker">PHYSICS × MUSIC</span><h3>Albert Einstein</h3><p>A theoretical physicist who played the violin. His correspondence documents a lifelong relationship with music; the Nobel biography describes music as an important source of relaxation.</p><p className="j-person-take">An example of a life with room for science and art. Not evidence that playing violin caused relativity.</p><Source href={SOURCES.einstein}>Caltech · Einstein Papers Project</Source><Source href={SOURCES.nobel}>Nobel Prize · Biography</Source></div></article><article><div className="j-person-art cajal" aria-hidden="true"><svg viewBox="0 0 300 180"><g fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M150 175V120l-18-25 18-17 18 17-18 25M150 78V25M145 60L94 32 78 7M150 67l50-36 20-24M138 87L73 66 35 29M165 87l58-22 45-35M132 95L67 104 23 80M166 98l63 12 48-17M96 34l-41 5M200 31l38 7M74 65L42 67M221 65l34 4M150 25L132 8M150 25l20-19M67 104l-21 27M229 110l26 25" /></g></svg><span>OBSERVE / DRAW / UNDERSTAND</span></div><div className="j-person-copy"><span className="j-kicker">NEUROSCIENCE × DRAWING</span><h3>Santiago Ramón y Cajal</h3><p>Cajal translated observations through a microscope into remarkably clear drawings of nerve cells. The Nobel Prize Museum presents his work as a meeting of artistic skill and scientific observation.</p><p className="j-person-take">Here, drawing was part of communicating science itself: close observation made visible.</p><Source href={SOURCES.cajal}>Nobel Prize Museum · Science and art</Source></div></article></div></section>
    <section className="j-section j-finale"><span className="j-kicker">TAKE SOMETHING WITH YOU</span><h2>Make something precise.<br /><em>Make something unexpected.</em></h2><p>For your next project: sketch three possibilities, build one, and ask what you would change.<br />Let curiosity start the conversation. Let craft carry it forward.</p><a className="j-pill" href="#mind" onClick={home}>Explore the other lens ↑</a><p className="j-signature">Dulitha Kariyapperuma <span>Engineering × Photography</span></p></section>
    <AskPanel/>
    <footer className="j-footer"><span>© {new Date().getFullYear()} DULITHA KARIYAPPERUMA</span><details><summary>Sources, anatomy & accessibility</summary><p>Educational visualization: coordinate-based surface overlays are approximate, not anatomical atlas labels, neural connections, or measured activation. The cerebellum marker is schematic. Motion respects your system’s reduced-motion preference; the tour only plays when requested. All lessons are also available as buttons without interacting with the 3D model.</p><p>Cortical geometry: <a href="https://github.com/aces/brainbrowser">BrainBrowser</a> · <a href="/models/LICENSE.txt">Model license</a>. Historical illustrations on this page are original symbolic drawings, not archival images.</p><p>Sources checked 19 October 2026. Research links appear beside the claims they support.</p></details><a href="#mind">BACK TO TOP ↑</a></footer>
  </main>;
}
