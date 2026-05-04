'use client';

/**
 * Cinematic background used across the landing page and authenticated app.
 * Renders a faint gold grid + three pulsing gold blurs at z-0 / fixed.
 * Always include a `relative z-10` content wrapper above this so children
 * stack on top of the decorative layers.
 */
export default function BackgroundLayers() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,208,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,208,0,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at center, black 25%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 25%, transparent 75%)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-1/4 -left-1/4 w-[55vw] h-[55vw] bg-thrivv-gold-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] bg-thrivv-gold-500/[0.06] rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute -bottom-1/4 left-1/3 w-[40vw] h-[40vw] bg-thrivv-gold-500/[0.05] rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '3s' }}
        />
      </div>
    </>
  );
}
