'use client';

export function Background() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(18,24,21,1) 0%, rgba(10,13,11,1) 70%)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(57,255,106,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,106,0.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,106,0.06) 2px, rgba(57,255,106,0.06) 4px)',
          backgroundSize: '100% 4px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute inset-0 animate-sweep-glow"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(30,122,62,0.12) 50%, transparent 100%)',
            width: '200%',
            marginLeft: '-50%',
          }}
        />
      </div>
    </>
  );
}
