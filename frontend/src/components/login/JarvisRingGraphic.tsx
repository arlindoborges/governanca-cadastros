const SEGMENTS = 52;
const CX = 160;
const CY = 160;
const SEGMENT_RADIUS = 132;

function RingSegments() {
  return (
    <g className="jarvis-hud__ring-layer jarvis-hud__ring-layer--segments">
      {Array.from({ length: SEGMENTS }, (_, index) => {
        const angle = (index / SEGMENTS) * 360;
        return (
          <rect
            key={index}
            className="jarvis-hud__ring-segment"
            x={CX - 1.6}
            y={CY - SEGMENT_RADIUS}
            width={3.2}
            height={9}
            rx={0.6}
            transform={`rotate(${angle} ${CX} ${CY})`}
          />
        );
      })}
    </g>
  );
}

export function JarvisRingGraphic() {
  return (
    <svg className="jarvis-hud__ring-svg" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <radialGradient id="jarvis-ring-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(8, 36, 22, 0.95)" />
          <stop offset="55%" stopColor="rgba(2, 12, 7, 0.98)" />
          <stop offset="100%" stopColor="rgba(0, 4, 2, 1)" />
        </radialGradient>
        <filter id="jarvis-ring-bloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="jarvis-ring-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle className="jarvis-hud__ring-halo" cx={CX} cy={CY} r="154" />

      <g className="jarvis-hud__ring-layer jarvis-hud__ring-layer--spin-slow">
        <circle className="jarvis-hud__ring-orbit jarvis-hud__ring-orbit--far" cx={CX} cy={CY} r="148" />
        <circle className="jarvis-hud__ring-orbit jarvis-hud__ring-orbit--dashed" cx={CX} cy={CY} r="140" />
      </g>

      <RingSegments />

      <g className="jarvis-hud__ring-layer jarvis-hud__ring-layer--spin-reverse">
        <circle className="jarvis-hud__ring-orbit jarvis-hud__ring-orbit--ticks" cx={CX} cy={CY} r="108" />
        <circle className="jarvis-hud__ring-orbit jarvis-hud__ring-orbit--inner" cx={CX} cy={CY} r="92" />
      </g>

      <circle className="jarvis-hud__ring-core" cx={CX} cy={CY} r="76" />
      <circle className="jarvis-hud__ring-core-glow" cx={CX} cy={CY} r="80" filter="url(#jarvis-ring-bloom)" />

      <path
        className="jarvis-hud__ring-cross"
        d={`M${CX} 24 L${CX} 40 M${CX} 280 L${CX} 296 M24 ${CY} L40 ${CY} M280 ${CY} L296 ${CY}`}
      />
    </svg>
  );
}
