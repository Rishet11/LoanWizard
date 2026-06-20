'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import {
  Radio, Mic, ScanFace, ShieldCheck, FileCheck2, Gauge, Cpu,
  ChevronRight, Lock, Power, Activity,
} from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useT } from '../components/I18nProvider';

/* ─────────── live value hooks ─────────── */

function useClock() {
  const [t, setT] = useState('--:--:--');
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// gentle jitter around a base so gauges feel "live"
function useJitter(base: number, amp: number, decimals = 2) {
  const [v, setV] = useState(base);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const wob = Math.sin(i / 3) * amp * 0.6 + (Math.sin(i * 1.7) * amp * 0.4);
      setV(Number((base + wob).toFixed(decimals)));
    }, 900);
    return () => clearInterval(id);
  }, [base, amp, decimals]);
  return v;
}

/* ─────────── page ─────────── */

export default function OperatorConsole() {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const clock = useClock();

  async function startSession() {
    setLoading(true);
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaign_source: new URLSearchParams(window.location.search).get('src') ?? 'direct',
          device_user_agent: navigator.userAgent,
        }),
      });
      const { session_id } = await res.json();
      router.push(`/session/${session_id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-(--color-fg) text-(--color-bg) font-mono flex flex-col overflow-hidden">
      <StatusBar clock={clock} />

      {/* Console body */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-5 py-4 grid gap-3
                      lg:grid-cols-[280px_1fr_280px] lg:grid-rows-[1fr_auto]">
        {/* Left rail: input signals */}
        <Panel label="PERCEPTION SIGNALS" tag="cam-01" className="lg:row-span-1">
          <div className="flex flex-col gap-5 h-full justify-center">
            <SignalGauge icon={ScanFace} name="LIVENESS" base={0.92} amp={0.02} good />
            <SignalGauge icon={ShieldCheck} name="FRAUD RISK" base={0.16} amp={0.03} invert />
            <SignalGauge icon={FileCheck2} name="DOC MATCH" base={0.97} amp={0.01} good />
            <Readout rows={[['blink', 'detected'], ['head-pose', 'tracking'], ['texture', 'real']]} />
          </div>
        </Panel>

        {/* Center: live feed + headline */}
        <div className="flex flex-col gap-3 min-w-0">
          <Marquee />
          <VideoModule />
          <Headline t={t} />
        </div>

        {/* Right rail: decision */}
        <Panel label="DECISION ENGINE" tag="risk v1.2" className="lg:row-span-1">
          <div className="flex flex-col gap-5 h-full justify-center">
            <BigStat k="RISK BAND" v="B" sub="low" />
            <BigStat k="OFFERED RATE" v="12.0%" sub="p.a. fixed" accent />
            <ReasonBars />
            <Readout rows={[['cibil', '763'], ['persona', 'salaried'], ['policy', 'pass']]} />
          </div>
        </Panel>

        {/* Bottom: command bar spans all columns */}
        <div className="lg:col-span-3">
          <CommandBar loading={loading} startSession={startSession} cta={t('landing.cta')} />
        </div>
      </div>
    </div>
  );
}

/* ─────────── status bar ─────────── */

function StatusBar({ clock }: { clock: string }) {
  const leds = [
    { l: 'ENGINE', ok: true }, { l: 'CAMERA', ok: true },
    { l: 'BUREAUS', ok: true }, { l: 'KYC', ok: true },
  ];
  return (
    <header className="border-b border-(--color-bg)/12 bg-black/20">
      <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-7 h-7 rounded bg-(--color-accent) text-(--color-fg)">
            <Cpu size={15} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-(--color-bg) truncate">
            LoanWizard
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.25em] text-(--color-bg)/40">
            // operator console
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            {leds.map((d) => (
              <span key={d.l} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-(--color-bg)/50">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-(--color-success)"
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
                />
                {d.l}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-(--color-bg)/60 nums tabular-nums">{clock} IST</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

/* ─────────── panel shell ─────────── */

function Panel({ label, tag, className = '', children }: { label: string; tag?: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-[var(--radius-md)] border border-(--color-bg)/12 bg-(--color-bg)/[0.03] p-4 ${className}`}
    >
      <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-(--color-accent)" />
      <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-(--color-accent)" />
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-(--color-bg)/50">{label}</span>
        {tag && <span className="text-[9px] text-(--color-accent)">{tag}</span>}
      </div>
      {children}
    </motion.section>
  );
}

/* ─────────── left rail signals ─────────── */

function SignalGauge({ icon: Icon, name, base, amp, good, invert }: { icon: typeof ScanFace; name: string; base: number; amp: number; good?: boolean; invert?: boolean }) {
  const v = useJitter(base, amp);
  const pct = Math.round(v * 100);
  const color = invert
    ? (v < 0.3 ? 'var(--color-success)' : v < 0.6 ? 'var(--color-warn)' : 'var(--color-danger)')
    : (v > 0.66 ? 'var(--color-success)' : v > 0.4 ? 'var(--color-warn)' : 'var(--color-danger)');
  const label = invert ? (v < 0.3 ? 'LOW' : v < 0.6 ? 'MED' : 'HIGH') : v.toFixed(2);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-(--color-bg)/60"><Icon size={12} /> {name}</span>
        <span style={{ color }} className="nums">{label}</span>
      </div>
      <div className="flex gap-0.5 h-2.5">
        {Array.from({ length: 20 }).map((_, i) => {
          const on = i < Math.round((pct / 100) * 20);
          return <span key={i} className="flex-1 rounded-[1px]" style={{ background: on ? color : 'color-mix(in srgb, var(--color-bg) 12%, transparent)' }} />;
        })}
      </div>
    </div>
  );
}

function Readout({ rows }: { rows: [string, string][] }) {
  return (
    <div className="border-t border-(--color-bg)/10 pt-3 space-y-1.5">
      {rows.map(([k, val]) => (
        <div key={k} className="flex items-center justify-between text-[11px]">
          <span className="text-(--color-bg)/40 lowercase">{k}</span>
          <span className="flex items-center gap-1.5 text-(--color-bg)/85">
            {val}<span className="w-1 h-1 rounded-full bg-(--color-success)" />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────── center modules ─────────── */

function Marquee() {
  const items = ['DISBURSED TODAY ₹4.2 Cr', 'AVG DECISION 1:48', 'APPROVAL 71%', 'SESSIONS LIVE 38', 'CIBIL + EXPERIAN'];
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-(--color-bg)/10 bg-black/15">
      <div className="ticker-track flex w-max gap-8 py-1.5 text-[10px] tracking-wide text-(--color-bg)/55">
        {row.map((it, i) => (
          <span key={i} className="flex items-center gap-8 whitespace-nowrap">{it}<span className="text-(--color-accent)">◆</span></span>
        ))}
      </div>
    </div>
  );
}

function VideoModule() {
  const lines = ['initialising perception engine', 'subject acquired // locking face', 'transcribing: "i earn eighty five thousand a month"'];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % lines.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="scanline relative flex-1 min-h-[280px] rounded-[var(--radius-md)] overflow-hidden grid-ink
                    bg-[radial-gradient(120%_120%_at_50%_0%,#27543f_0%,#0f261c_64%)] border border-(--color-bg)/10">
      {/* top hud */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2 text-[10px] text-(--color-bg)/80 z-10">
        <span className="flex items-center gap-1.5">
          <motion.span className="w-2 h-2 rounded-full bg-(--color-danger)" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.3, repeat: Infinity }} />
          REC 00:47
        </span>
        <span className="flex items-center gap-1.5"><Radio size={11} className="text-(--color-accent)" /> 1080p · 30fps</span>
      </div>

      {/* honesty marker — this landing feed is an illustrative preview; the live session runs the real pipeline */}
      <div className="absolute top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.25em] bg-black/45 text-(--color-bg)/75 border border-(--color-bg)/15 backdrop-blur-sm">
          simulated preview
        </span>
      </div>

      {/* face */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative">
          <motion.span className="absolute inset-0 rounded-full bg-(--color-accent)/25"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.2, repeat: Infinity }} />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-(--color-accent) to-[#8a5a16] grid place-items-center text-4xl font-display font-semibold text-white">RS</div>
          {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c, i) => (
            <span key={i} className={`absolute w-5 h-5 border-(--color-accent) ${c}`} style={{ margin: '-12px' }} />
          ))}
        </div>
      </div>

      {/* transcript */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 bg-gradient-to-t from-black/55 to-transparent">
        <div className="flex items-center gap-2 text-[11px] text-(--color-bg)/90">
          <Mic size={11} className="text-(--color-accent) shrink-0" />
          <motion.span key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
            &gt; {lines[idx]}
          </motion.span>
          <motion.span className="w-1.5 h-3.5 bg-(--color-accent) shrink-0" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
        </div>
      </div>
    </div>
  );
}

function Headline({ t }: { t: (k: string) => string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-(--color-bg)/10 bg-(--color-bg)/[0.03] px-4 py-3.5">
      <p className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-tight text-(--color-bg)">
        A loan decision, <span className="text-(--color-accent)">settled in 120s.</span>
      </p>
      <p className="text-[12px] text-(--color-bg)/55 mt-1.5 max-w-lg leading-relaxed">
        {t('landing.sub')} You speak, the camera verifies, the model prices. Watch it decide in real time, then start your own.
      </p>
    </div>
  );
}

/* ─────────── right rail decision ─────────── */

function BigStat({ k, v, sub, accent }: { k: string; v: string; sub: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-bg)/45 mb-1">{k}</p>
      <p className={`font-display text-4xl font-semibold leading-none nums ${accent ? 'text-(--color-accent)' : 'text-(--color-bg)'}`}>{v}</p>
      <p className="text-[10px] text-(--color-bg)/40 mt-1 uppercase tracking-wider">{sub}</p>
    </div>
  );
}

function ReasonBars() {
  const codes = [
    { c: 'STABLE_INCOME', w: 0.42 }, { c: 'GOOD_CREDIT', w: 0.31 },
    { c: 'LOW_LTV', w: 0.18 }, { c: 'THIN_FILE', w: 0.09, neg: true },
  ];
  return (
    <div className="border-t border-(--color-bg)/10 pt-3 space-y-2">
      <p className="text-[9px] uppercase tracking-[0.2em] text-(--color-bg)/40">reason codes</p>
      {codes.map((c, i) => (
        <div key={c.c}>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-(--color-bg)/70">{c.c}</span>
            <span className="text-(--color-bg)/40 nums">{c.w.toFixed(2)}</span>
          </div>
          <div className="h-1 rounded-full bg-(--color-bg)/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${c.w * 100}%` }}
              transition={{ delay: 0.6 + i * 0.12, duration: 0.9 }}
              className="h-full rounded-full" style={{ background: c.neg ? 'var(--color-warn)' : 'var(--color-success)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── command bar ─────────── */

function CommandBar({ loading, startSession, cta }: { loading: boolean; startSession: () => void; cta: string }) {
  const fields = ['name ✓', 'employment ✓', 'income ✓', 'amount ✓', 'cibil 763'];
  return (
    <div className="rounded-[var(--radius-md)] border border-(--color-bg)/12 bg-(--color-bg)/[0.03] p-3 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
      {/* ledger feed */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
        <Activity size={14} className="text-(--color-accent) shrink-0" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-(--color-bg)/40 shrink-0 hidden sm:inline">ledger</span>
        <div className="flex gap-2 overflow-hidden flex-wrap">
          {fields.map((f, i) => (
            <motion.span key={f} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
              className="text-[11px] px-2 py-0.5 rounded border border-(--color-bg)/10 bg-(--color-bg)/[0.04] text-(--color-bg)/75 nums whitespace-nowrap">
              {f}
            </motion.span>
          ))}
        </div>
      </div>

      {/* initiate */}
      <button
        onClick={startSession} disabled={loading}
        className="group relative shrink-0 inline-flex items-center justify-center gap-2.5 bg-(--color-accent) text-(--color-fg)
                   px-7 py-3.5 rounded-[var(--radius-sm)] font-semibold tracking-wide uppercase text-sm
                   hover:brightness-110 active:brightness-95 transition disabled:opacity-60 overflow-hidden"
      >
        <motion.span aria-hidden className="absolute inset-0 bg-white/20"
          initial={{ x: '-120%' }} animate={{ x: '120%' }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} style={{ skewX: '-20deg' }} />
        {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Power size={16} />}
        <span className="relative">{loading ? 'initialising' : 'Initiate interview'}</span>
        <ChevronRight size={16} className="relative group-hover:translate-x-0.5 transition-transform" />
      </button>

      <span className="shrink-0 hidden xl:flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-(--color-bg)/40">
        <Lock size={11} className="text-(--color-success)" /> rbi · dpdp
      </span>
    </div>
  );
}
