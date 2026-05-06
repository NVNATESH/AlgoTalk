'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './experience.module.css';

type Feature = {
  title: string;
  desc: string;
  tag: string;
};

type StoryBeat = {
  title: string;
  desc: string;
  metric: string;
};

const FEATURES: Feature[] = [
  {
    title: 'Debug Flow',
    desc: 'A guided path from failing test to a concrete fix, with trace-based reasoning.',
    tag: 'flow',
  },
  {
    title: 'Edge Lab',
    desc: 'Auto-generate boundary inputs and expose hidden failure points in minutes.',
    tag: 'quality',
  },
  {
    title: 'Contest Radar',
    desc: 'Track momentum and recover fast with post-contest insights and drills.',
    tag: 'tempo',
  },
  {
    title: 'Focus Engine',
    desc: 'Converts goals into weekly plans with realistic pacing and priority cues.',
    tag: 'strategy',
  },
  {
    title: 'Ghost Mode',
    desc: 'Compare your past and current performance in a single cinematic view.',
    tag: 'growth',
  },
  {
    title: 'Mentor Signals',
    desc: 'Short feedback loops that teach patterns, not just solutions.',
    tag: 'mentor',
  },
];

const STORY: StoryBeat[] = [
  {
    title: 'Week One',
    desc: 'You stop guessing and start verifying complexity before writing code.',
    metric: '+34% fewer TLEs',
  },
  {
    title: 'Month One',
    desc: 'Edge cases become a habit, not a surprise on the last test.',
    metric: '+22% higher acceptance',
  },
  {
    title: 'Year One',
    desc: 'Patterns compound into speed. The contest curve tilts in your favor.',
    metric: '+180 rating shift',
  },
];

export default function ExperiencePage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [navSolid, setNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasFinePointer, setHasFinePointer] = useState(false);

  const navStateRef = useRef(false);

  const stories = useMemo(() => STORY, []);
  const features = useMemo(() => FEATURES, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerFine = window.matchMedia('(pointer: fine)').matches;
    setHasFinePointer(pointerFine);

    document.documentElement.style.scrollBehavior = 'smooth';

    let mouseX = window.innerWidth * 0.5;
    let mouseY = window.innerHeight * 0.4;

    let cursorX = mouseX;
    let cursorY = mouseY;
    let cursorVX = 0;
    let cursorVY = 0;

    let trailX = mouseX;
    let trailY = mouseY;
    let trailVX = 0;
    let trailVY = 0;

    const parallaxItems = Array.from(page.querySelectorAll<HTMLElement>('[data-parallax]')).map((el) => ({
      el,
      depth: Number(el.dataset.depth ?? '8'),
    }));

    const setMagnetic = (el: HTMLElement, strength: number) => {
      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const x = (dx / rect.width) * strength * 30;
        const y = (dy / rect.height) * strength * 30;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
      };

      const onLeave = () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);

      return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    };

    const setTilt = (el: HTMLElement) => {
      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const dx = (event.clientX - rect.left) / rect.width - 0.5;
        const dy = (event.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (dy * -12).toFixed(2);
        const rotateY = (dx * 14).toFixed(2);
        el.style.setProperty('--rx', `${rotateX}deg`);
        el.style.setProperty('--ry', `${rotateY}deg`);
      };

      const onLeave = () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);

      return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    };

    const magneticCleanups = Array.from(page.querySelectorAll<HTMLElement>('[data-magnetic]')).map((el) =>
      setMagnetic(el, Number(el.dataset.magnetic ?? '0.35'))
    );

    const tiltCleanups = Array.from(page.querySelectorAll<HTMLElement>('[data-tilt]')).map((el) => setTilt(el));

    const revealTargets = Array.from(page.querySelectorAll<HTMLElement>('[data-reveal]'));
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
          }
        });
      },
      { threshold: 0.22 }
    );

    revealTargets.forEach((target) => revealObserver.observe(target));

    const updateScroll = () => {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? Math.min(1, scrollTop / height) : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }

      const nextSolid = scrollTop > 32;
      if (nextSolid !== navStateRef.current) {
        navStateRef.current = nextSolid;
        setNavSolid(nextSolid);
      }
    };

    let scrollTick = 0;
    const onScroll = () => {
      if (scrollTick) return;
      scrollTick = window.requestAnimationFrame(() => {
        updateScroll();
        scrollTick = 0;
      });
    };

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      page.style.setProperty('--mx', `${mouseX}px`);
      page.style.setProperty('--my', `${mouseY}px`);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    updateScroll();

    let raf = 0;
    const animate = () => {
      if (!prefersReducedMotion) {
        const stiffness = 0.16;
        const damping = 0.72;
        cursorVX += (mouseX - cursorX) * stiffness;
        cursorVY += (mouseY - cursorY) * stiffness;
        cursorVX *= damping;
        cursorVY *= damping;
        cursorX += cursorVX;
        cursorY += cursorVY;

        trailVX += (mouseX - trailX) * 0.08;
        trailVY += (mouseY - trailY) * 0.08;
        trailVX *= 0.64;
        trailVY *= 0.64;
        trailX += trailVX;
        trailY += trailVY;
      }

      if (cursorRef.current && trailRef.current && spotlightRef.current && pointerFine) {
        cursorRef.current.style.transform = `translate3d(${cursorX - 7}px, ${cursorY - 7}px, 0)`;
        trailRef.current.style.transform = `translate3d(${trailX - 18}px, ${trailY - 18}px, 0)`;
        spotlightRef.current.style.background = `radial-gradient(260px 260px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.14), transparent 60%)`;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      const dx = (mouseX - width / 2) / width;
      const dy = (mouseY - height / 2) / height;

      parallaxItems.forEach(({ el, depth }) => {
        const x = dx * depth * 16;
        const y = dy * depth * 16;
        el.style.translate = `${x}px ${y}px`;
      });

      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const particles: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number }> = [];

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    if (canvas && ctx) {
      resizeCanvas();
      const count = 54;
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 1 + Math.random() * 2.4,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          alpha: 0.25 + Math.random() * 0.35,
        });
      }
    }

    let particleRaf = 0;
    const drawParticles = () => {
      if (!canvas || !ctx || prefersReducedMotion) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      particleRaf = window.requestAnimationFrame(drawParticles);
    };

    particleRaf = window.requestAnimationFrame(drawParticles);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resizeCanvas);
      revealObserver.disconnect();
      magneticCleanups.forEach((cleanup) => cleanup());
      tiltCleanups.forEach((cleanup) => cleanup());
      if (raf) window.cancelAnimationFrame(raf);
      if (particleRaf) window.cancelAnimationFrame(particleRaf);
      if (scrollTick) window.cancelAnimationFrame(scrollTick);
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div
      ref={pageRef}
      data-theme={theme}
      className={`${styles.page} ${hasFinePointer ? styles.cursorHidden : ''}`}
    >
      <div ref={progressRef} className={styles.progress} aria-hidden="true" />
      <div ref={spotlightRef} className={styles.spotlight} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.particles} aria-hidden="true" />
      <div ref={trailRef} className={styles.cursorTrail} aria-hidden="true" />
      <div ref={cursorRef} className={styles.cursor} aria-hidden="true" />

      <header className={`${styles.nav} ${navSolid ? styles.navSolid : ''}`}>
        <div className={styles.navBrand}>CipherFlow</div>
        <nav className={styles.navLinks}>
          <a href="#story" className={styles.navLink}>
            Story
          </a>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#lab" className={styles.navLink}>
            Lab
          </a>
          <a href="#insights" className={styles.navLink}>
            Insights
          </a>
        </nav>
        <div className={styles.navActions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-pressed={theme === 'light'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-magnetic="0.25"
          >
            <span className={styles.toggleKnob} />
            <span className={styles.toggleText}>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
          <div className={styles.dropdown}>
            <button
              type="button"
              className={styles.dropdownButton}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              data-magnetic="0.35"
            >
              Explore
            </button>
            <div className={`${styles.dropdownMenu} ${menuOpen ? styles.dropdownOpen : ''}`}>
              <a href="#" className={styles.dropdownItem}>
                Debug playbooks
              </a>
              <a href="#" className={styles.dropdownItem}>
                Practice tracks
              </a>
              <a href="#" className={styles.dropdownItem}>
                Mentor signals
              </a>
            </div>
          </div>
          <button className={styles.ctaButton} data-magnetic="0.4">
            Start Focus
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent} data-reveal>
            <p className={styles.heroEyebrow}>Precision learning for competitive coders</p>
            <h1 className={styles.heroTitle}>
              Build a debugging instinct, not just a solution.
            </h1>
            <p className={styles.heroCopy}>
              This experience blends Ghost Mode, Edge Labs, and contest-grade feedback into a single
              fluid UI. Every interaction is designed to feel alive and responsive.
            </p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} data-magnetic="0.45">
                Run a live demo
              </button>
              <button className={styles.secondaryButton} data-magnetic="0.3">
                View playbook
              </button>
            </div>
            <div className={styles.heroMetrics}>
              <div className={styles.metricCard} data-tilt>
                <span className={styles.metricValue}>92%</span>
                <span className={styles.metricLabel}>Edge case coverage</span>
              </div>
              <div className={styles.metricCard} data-tilt>
                <span className={styles.metricValue}>2.4x</span>
                <span className={styles.metricLabel}>Faster fixes</span>
              </div>
            </div>
          </div>
          <div className={styles.heroVisual} data-reveal>
            <div className={styles.orbPanel} data-tilt>
              <div className={styles.orbGlow} data-parallax data-depth="14" />
              <div className={styles.orbCore} data-parallax data-depth="8" />
              <div className={styles.orbRing} data-parallax data-depth="6" />
              <div className={styles.orbCard} data-parallax data-depth="10">
                <div className={styles.orbTitle}>Live Insight</div>
                <div className={styles.orbLine}>TLE risk detected on iteration 4</div>
                <div className={styles.orbLine}>Try prefix sums + binary search</div>
              </div>
            </div>
            <div className={styles.heroHighlights}>
              <div className={styles.highlight} data-tilt>
                <div className={styles.highlightTitle}>Ghost Mode</div>
                <div className={styles.highlightCopy}>
                  Compare last week to this week with crystal clear deltas.
                </div>
              </div>
              <div className={styles.highlight} data-tilt>
                <div className={styles.highlightTitle}>Debug Loop</div>
                <div className={styles.highlightCopy}>Find the smallest failing input in seconds.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="story" className={styles.story} data-reveal>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Sectioned story arc</h2>
            <p className={styles.sectionCopy}>
              A narrative UI that tracks how your habits evolve over week, month, and year.
            </p>
          </div>
          <div className={styles.storyGrid}>
            {stories.map((beat) => (
              <div key={beat.title} className={styles.storyCard} data-tilt>
                <div className={styles.storyTitle}>{beat.title}</div>
                <p className={styles.storyCopy}>{beat.desc}</p>
                <div className={styles.storyMetric}>{beat.metric}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className={styles.features} data-reveal>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Feature system</h2>
            <p className={styles.sectionCopy}>
              Each card is a 3D tile with tilt, glow, and animated micro details.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature) => (
              <div key={feature.title} className={styles.featureCard} data-tilt>
                <div className={styles.featureTag}>{feature.tag}</div>
                <div className={styles.featureTitle}>{feature.title}</div>
                <p className={styles.featureCopy}>{feature.desc}</p>
                <div className={styles.featureArrow} data-tooltip="Open module">
                  <span className={styles.arrowLine} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="lab" className={styles.lab} data-reveal>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Interactive lab</h2>
            <p className={styles.sectionCopy}>
              Magnetic buttons, parallax chips, and a sandbox for edge case testing.
            </p>
          </div>
          <div className={styles.labGrid}>
            <div className={styles.labPanel} data-tilt>
              <div className={styles.labHeader}>Edge case generator</div>
              <div className={styles.labBody}>
                <button className={styles.chip} data-magnetic="0.35">
                  Empty input
                </button>
                <button className={styles.chip} data-magnetic="0.35">
                  Single element
                </button>
                <button className={styles.chip} data-magnetic="0.35">
                  Max bounds
                </button>
                <button className={styles.chip} data-magnetic="0.35">
                  Duplicates
                </button>
                <button className={styles.chip} data-magnetic="0.35">
                  Negative values
                </button>
              </div>
              <button className={styles.primaryButton} data-magnetic="0.4">
                Run edge suite
              </button>
            </div>
            <div className={styles.labPanel} data-tilt>
              <div className={styles.labHeader}>Debug checklist</div>
              <ul className={styles.checklist}>
                <li>Verify constraints and complexity</li>
                <li>Reproduce on minimal failing case</li>
                <li>Check boundaries and overflow</li>
                <li>Trace invariant step-by-step</li>
                <li>Optimize hottest loop</li>
              </ul>
              <div className={styles.toggleRow}>
                <button className={styles.toggleButton} data-magnetic="0.2">
                  Toggle trace
                </button>
                <div className={styles.toggleHint}>Trace mode is ready</div>
              </div>
            </div>
            <div className={styles.labPanel} data-tilt>
              <div className={styles.labHeader}>Edge test result</div>
              <div className={styles.resultCard}>
                <div className={styles.resultTitle}>Failing input</div>
                <pre className={styles.resultCode}>n=1, arr=[0], k=2</pre>
                <div className={styles.resultBadge}>Mismatch at index 0</div>
              </div>
              <div className={styles.resultCard}>
                <div className={styles.resultTitle}>Suggested fix</div>
                <p className={styles.resultCopy}>Guard against empty and single input arrays.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="insights" className={styles.insights} data-reveal>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Live insight panels</h2>
            <p className={styles.sectionCopy}>
              Loading states, animated gradients, and progress tiles that update in real time.
            </p>
          </div>
          <div className={styles.insightGrid}>
            <div className={styles.insightCard} data-tilt>
              <div className={styles.insightHeader}>Submission pipeline</div>
              <div className={styles.skeletonRow}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.skeletonRow}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.skeletonRow}>
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className={styles.insightCard} data-tilt>
              <div className={styles.insightHeader}>Focus cadence</div>
              <div className={styles.progressStack}>
                <div className={styles.progressBar}>
                  <span style={{ width: '74%' }} />
                </div>
                <div className={styles.progressBar}>
                  <span style={{ width: '46%' }} />
                </div>
                <div className={styles.progressBar}>
                  <span style={{ width: '88%' }} />
                </div>
              </div>
              <div className={styles.legend}>
                <span>Momentum</span>
                <span>Quality</span>
                <span>Speed</span>
              </div>
            </div>
            <div className={styles.insightCard} data-tilt>
              <div className={styles.insightHeader}>AI note</div>
              <p className={styles.insightCopy}>
                Your last 5 WA results are tied to boundary handling. Run Edge Lab before the next contest.
              </p>
              <button className={styles.secondaryButton} data-magnetic="0.3">
                Create practice pack
              </button>
            </div>
          </div>
        </section>

        <section className={styles.cta} data-reveal>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ship a UI that feels alive</h2>
            <p className={styles.ctaCopy}>
              Every surface here is optimized for responsive motion, cinematic storytelling, and clarity.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <button className={styles.primaryButton} data-magnetic="0.4">
              Start building
            </button>
            <button className={styles.secondaryButton} data-magnetic="0.3">
              Share with team
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>Built for fast learning loops.</div>
        <div className={styles.footerLinks}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
