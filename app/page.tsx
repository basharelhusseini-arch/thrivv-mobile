'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, Dumbbell, Gift, Layers3, Pause, Play, QrCode, Sparkles, Trophy, Users, Watch, X } from 'lucide-react';
import Logo from '@/components/Logo';
import styles from './landing.module.css';

const journey = [
  { number: '01', title: 'Show up.', text: 'Join your gym on Thrivv, train, then scan its QR code.', icon: QrCode },
  { number: '02', title: 'Earn points.', text: 'Your verified gym visit earns points. Build on it with daily habits.', icon: Sparkles },
  { number: '03', title: 'Get rewarded.', text: 'Use your points for available offers from partner brands and your gym.', icon: Gift },
];
const previews = [
  { title: 'Your effort. Verified.', label: 'GYM CHECK-IN', value: 'You showed up.', detail: 'One scan after your session.', icon: QrCode },
  { title: 'Consistency adds up.', label: 'POINTS EARNED', value: '+40', detail: 'For a verified gym visit.', icon: Sparkles },
  { title: 'A little more to train for.', label: 'YOUR NEXT REWARD', value: '10% off', detail: 'Example café offer · 400 points', icon: Gift },
];

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(1);
  const [paused, setPaused] = useState(false);
  const preview = previews[step];
  const PreviewIcon = preview.icon;

  useEffect(() => {
    const elements = root.current?.querySelectorAll('[data-reveal]');
    if (!elements || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add(styles.visible); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const openDemo = () => dialog.current?.showModal();
  return (
    <div ref={root} className={`${styles.landing} ${paused ? styles.paused : ''}`}>
      <a href="#landing-content" className={styles.skip}>Skip to content</a>
      <div className={styles.atmosphere} aria-hidden="true"><div className={styles.grid} /><div className={styles.aura} /><div className={styles.auraTwo} /></div>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Logo size="md" linkTo="/" />
          <nav className={styles.navLinks} aria-label="Website sections"><a href="#how-it-works">How it works</a><a href="#for-gyms">For gyms</a></nav>
          <div className={styles.navActions}><Link href="/member/login" className={styles.signIn}>Sign in</Link><button className={styles.smallButton} onClick={openDemo}>Book a demo <ArrowUpRight size={15} /></button></div>
        </div>
      </header>

      <main id="landing-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.liveDot} /> YOUR EFFORT GOES FURTHER</p>
            <h1 id="hero-title">Show up.<br />Feel good.<br /><span>Get rewarded.</span></h1>
            <p className={styles.intro}>Thrivv turns gym visits into points you can spend on real rewards. More reasons to train. More reasons to come back.</p>
            <div className={styles.heroActions}><button className={styles.primary} onClick={openDemo}>Book a demo <ArrowUpRight size={19} /></button><a href="#how-it-works" className={styles.textLink}>See how it works <ArrowDown size={16} /></a></div>
            <p className={styles.heroNote}><Check size={14} /> No wearable needed <span /> Connect WHOOP anytime</p>
          </div>

          <div className={styles.productScene} aria-label="Interactive example of the Thrivv experience">
            <div className={styles.orbit} aria-hidden="true" /><div className={styles.orbitTwo} aria-hidden="true" />
            <div className={styles.backPanel} aria-hidden="true" />
            <div className={styles.productCard}>
              <div className={styles.cardTop}><Logo size="sm" /><span><span className={styles.liveDot} /> YOUR DAILY MOMENTUM</span></div>
              <div key={step} className={styles.previewBody}>
                <div className={styles.previewLabel}><PreviewIcon size={16} /> {preview.label}</div>
                <div className={`${styles.scoreRing} ${step === 0 ? styles.scanning : ''}`}>
                  <span className={styles.ringTick} aria-hidden="true" />
                  <div>{step === 0 ? <QrCode size={64} strokeWidth={1.2} aria-hidden="true" /> : <strong>{preview.value}</strong>}<span>{step === 1 ? 'POINTS' : step === 2 ? 'A LITTLE THANK YOU' : 'GYM VERIFIED'}</span></div>
                </div>
                <h2>{preview.title}</h2><p>{preview.detail}</p>
              </div>
              <div className={styles.cardBottom}><span>Small steps. Real progress.</span><ArrowUpRight size={16} /></div>
            </div>
            <div className={styles.floatingVisit}><span className={styles.successIcon}><CheckCircle2 size={20} /></span><div><strong>Session verified</strong><span>You made it count.</span></div></div>
            <div className={styles.floatingStreak}><div className={styles.streakTop}><Dumbbell size={15} /><span>KEEP SHOWING UP</span></div><div className={styles.week}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i} className={i < 3 ? styles.dayDone : ''}>{i < 3 ? <Check size={12} /> : day}</span>)}</div><p>3 visits this week</p></div>
            <div className={styles.previewControls} role="group" aria-label="Explore the example">{['Scan', 'Earn', 'Redeem'].map((label, i) => <button key={label} aria-pressed={step === i} onClick={() => setStep(i)}><span>0{i + 1}</span> {label}</button>)}</div>
            <p className={styles.exampleLabel}>PRODUCT PREVIEW · ILLUSTRATIVE DATA</p>
          </div>
          <div className={styles.heroFoot}><span>BUILT AROUND THE WAY YOU TRAIN</span><a href="#how-it-works" aria-label="Explore how Thrivv works"><ArrowDown size={18} /></a><span>FOR MEMBERS. FOR GYMS.</span></div>
        </section>

        <section id="how-it-works" className={styles.how} aria-labelledby="how-title">
          <div data-reveal className={styles.sectionHeading}><p className={styles.eyebrow}>LESS FRICTION. MORE MOMENTUM.</p><h2 id="how-title">Your workout.<br /><span>With a little extra.</span></h2><p>No complicated setup. Just three simple steps.</p></div>
          <div className={styles.steps}>{journey.map(({number,title,text,icon:Icon}, i) => <article key={number} data-reveal style={{transitionDelay:`${i * 100}ms`}}><div className={styles.stepTop}><span>{number}</span><Icon size={26} strokeWidth={1.3} /></div><h3>{title}</h3><p>{text}</p>{i < 2 && <ArrowRight className={styles.stepArrow} size={19} aria-hidden="true" />}</article>)}</div>
          <div data-reveal className={styles.wearableNote}><Watch size={19} /><p><strong>Your gym visit is enough.</strong> WHOOP is optional. Connect it for workout and recovery insights whenever you’re ready.</p></div>
        </section>

        <section id="for-gyms" className={styles.gymSection} aria-labelledby="gym-title">
          <div data-reveal className={styles.gymCopy}><p className={styles.eyebrow}>A BETTER REASON TO COME BACK</p><h2 id="gym-title">Good for members.<br /><span>Great for your gym.</span></h2><p>Give your community something to work towards. Thrivv brings verified visits, friendly competition and partner rewards into one experience.</p><ul><li><Users size={18} /><span>A shared leaderboard for your gym</span></li><li><Gift size={18} /><span>Rewards that give members a reason to return</span></li><li><Layers3 size={18} /><span>A dashboard to see participation and activity</span></li></ul><button className={styles.textLink} onClick={openDemo}>Explore Thrivv for your gym <ArrowUpRight size={18} /></button></div>
          <div data-reveal className={styles.gymVisual}>
            <div className={styles.communityHalo} aria-hidden="true" />
            <div className={styles.leaderboard}><div className={styles.boardHeader}><Trophy size={20} /><span>YOUR GYM. YOUR COMMUNITY.</span></div><h3>A little friendly competition.</h3><p>Every verified visit moves you forward.</p>{[{name:'Alex',points:240},{name:'Sam',points:200},{name:'You',points:160}].map((row,i)=><div key={row.name} className={`${styles.boardRow} ${i===2 ? styles.you : ''}`}><span className={styles.rank}>0{i+1}</span><span className={styles.avatar}>{row.name[0]}</span><strong>{row.name}</strong><span>{row.points}<small> pts</small></span></div>)}<div className={styles.boardFooter}>WEEKLY POINTS <span>Everyone together <ArrowUpRight size={12} /></span></div></div>
            <div className={styles.communityTag}><span className={styles.liveDot} /> One gym. More momentum.</div><p className={styles.exampleLabel}>ILLUSTRATIVE GYM LEADERBOARD</p>
          </div>
        </section>

        <section className={styles.demoSection} aria-labelledby="demo-title">
          <div className={styles.demoRings} aria-hidden="true" /><div data-reveal className={styles.demoContent}><p className={styles.eyebrow}>LET’S MAKE IT COUNT</p><h2 id="demo-title">Your gym’s next chapter<br /><span>starts with showing up.</span></h2><p>See how Thrivv could work for your members.</p><button className={styles.primary} onClick={openDemo}>Book a demo <ArrowUpRight size={19} /></button><Link href="/member/signup" className={styles.memberLink}>Here to train? Create your member account <ArrowRight size={14} /></Link></div>
        </section>
      </main>

      <footer className={styles.footer}><Logo size="sm" /><p>Show up. Make it count.</p><div><Link href="/gym">Gym portal</Link><Link href="/privacy">Privacy</Link><a href="mailto:bashar@thrivv.dev">Contact</a><button onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Resume visual motion' : 'Pause visual motion'}>{paused ? <Play size={14} /> : <Pause size={14} />} Motion {paused ? 'off' : 'on'}</button></div></footer>

      <dialog ref={dialog} className={styles.demoDialog} aria-labelledby="demo-dialog-title" onClick={event => {if(event.target === dialog.current) dialog.current.close();}}>
        <div className={styles.dialogInner}><button className={styles.closeDialog} onClick={() => dialog.current?.close()} aria-label="Close demo request"><X size={22} /></button><p className={styles.eyebrow}>MEET THRIVV</p><h2 id="demo-dialog-title">Let’s talk about<br />your gym.</h2><p>Tell us your gym’s name, where you’re based and a time that suits you. We’ll reply to arrange your demo.</p><a className={styles.primary} href={`mailto:bashar@thrivv.dev?subject=${encodeURIComponent('Book a Thrivv demo')}&body=${encodeURIComponent('Hi Bashar,\n\nI’d like to book a Thrivv demo.\n\nName:\nGym / business:\nLocation:\nPreferred time and timezone:\n\nThank you!')}`}>Request a demo by email <ArrowUpRight size={18} /></a><p className={styles.emailHelp}>Opens your email app. You can also write directly to <a href="mailto:bashar@thrivv.dev">bashar@thrivv.dev</a>.</p></div>
      </dialog>
    </div>
  );
}
