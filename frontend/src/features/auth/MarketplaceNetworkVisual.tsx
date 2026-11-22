import React from 'react';

export const MarketplaceNetworkVisual: React.FC = () => {
  return (
    <div className="relative w-full h-[460px] flex items-center justify-center select-none overflow-hidden rounded-[20px] bg-gradient-to-b from-[#FFFFFF] via-[#FAF3F6] to-[#F8EDF2] border border-[rgba(193,160,172,0.35)] shadow-xs">
      {/* Background ambient radial glow in Light Plum */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-[rgba(142,63,122,0.12)] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[rgba(106,99,224,0.08)] blur-3xl" />
      </div>

      {/* Main SVG Marketplace Relationship & Evidence Graph */}
      <svg
        viewBox="0 0 540 540"
        className="w-full h-full max-w-[480px] max-h-[480px] z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle gradients for connection lines */}
          <linearGradient id="lineGradPlum" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8E3F7A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6B2D5C" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="lineGradLavender" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6A63E0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8E3F7A" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="lineGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E09A12" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8E3F7A" stopOpacity="0.2" />
          </linearGradient>

          {/* Glow filter for hub nodes */}
          <filter id="glowPlum" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Curved Connection Lines Between Entities */}
        <g className="stroke-[#C1A0AC]/40" strokeWidth="1.2">
          {/* Amazon -> Canonical Hub */}
          <path
            d="M 120 130 Q 180 180 270 250"
            stroke="url(#lineGradPlum)"
            strokeDasharray="4 4"
            className="animate-dashSlow"
          />

          {/* Flipkart -> Canonical Hub */}
          <path
            d="M 420 140 Q 360 190 270 250"
            stroke="url(#lineGradPlum)"
            strokeDasharray="4 4"
            className="animate-dashSlow"
          />

          {/* Myntra -> Canonical Hub */}
          <path
            d="M 130 390 Q 190 320 270 250"
            stroke="url(#lineGradLavender)"
            strokeDasharray="4 4"
            className="animate-dashSlow"
          />

          {/* Seller Governance Hub -> Canonical Hub */}
          <path
            d="M 410 380 Q 350 320 270 250"
            stroke="url(#lineGradAmber)"
            strokeDasharray="4 4"
            className="animate-dashSlow"
          />

          {/* Cross-Seller Co-occurrence Edges */}
          <path d="M 120 130 C 180 80, 360 80, 420 140" stroke="#8E3F7A" strokeOpacity="0.2" strokeWidth="1" />
          <path d="M 130 390 C 220 440, 340 440, 410 380" stroke="#8E3F7A" strokeOpacity="0.2" strokeWidth="1" />
          <path d="M 120 130 Q 110 260 130 390" stroke="#C1A0AC" strokeOpacity="0.25" strokeWidth="1" />
          <path d="M 420 140 Q 430 260 410 380" stroke="#C1A0AC" strokeOpacity="0.25" strokeWidth="1" />

          {/* Internal Evidence Modality Branches */}
          <path d="M 270 250 L 200 190" stroke="#8E3F7A" strokeOpacity="0.4" />
          <path d="M 270 250 L 340 190" stroke="#6A63E0" strokeOpacity="0.4" />
          <path d="M 270 250 L 210 310" stroke="#12A36B" strokeOpacity="0.4" />
          <path d="M 270 250 L 330 310" stroke="#E09A12" strokeOpacity="0.4" />
        </g>

        {/* 2. Concentric Orbit Rings Around Canonical Hub */}
        <circle cx="270" cy="250" r="90" stroke="#8E3F7A" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="6 6" />
        <circle cx="270" cy="250" r="160" stroke="#C1A0AC" strokeOpacity="0.25" strokeWidth="1" />

        {/* 3. Outer Marketplace Nodes (Amazon, Flipkart, Myntra, Sellers) */}
        {/* Amazon IN Node */}
        <g className="animate-floatSlow" style={{ transformOrigin: '120px 130px' }}>
          <circle cx="120" cy="130" r="22" fill="#FFFFFF" stroke="#8E3F7A" strokeWidth="1.5" />
          <circle cx="120" cy="130" r="8" fill="#6B2D5C" />
          <text x="120" y="166" fill="#16131F" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
            AMAZON IN
          </text>
        </g>

        {/* Flipkart Node */}
        <g className="animate-floatSlow" style={{ animationDelay: '-3s', transformOrigin: '420px 140px' }}>
          <circle cx="420" cy="140" r="22" fill="#FFFFFF" stroke="#6A63E0" strokeWidth="1.5" />
          <circle cx="420" cy="140" r="8" fill="#6A63E0" />
          <text x="420" y="176" fill="#16131F" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
            FLIPKART
          </text>
        </g>

        {/* Myntra Node */}
        <g className="animate-floatSlow" style={{ animationDelay: '-6s', transformOrigin: '130px 390px' }}>
          <circle cx="130" cy="390" r="20" fill="#FFFFFF" stroke="#8E3F7A" strokeWidth="1.5" />
          <circle cx="130" cy="390" r="7" fill="#8E3F7A" />
          <text x="130" y="424" fill="#16131F" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
            MYNTRA
          </text>
        </g>

        {/* Seller Graph / Network Node */}
        <g className="animate-floatSlow" style={{ animationDelay: '-9s', transformOrigin: '410px 380px' }}>
          <circle cx="410" cy="380" r="20" fill="#FFFFFF" stroke="#E09A12" strokeWidth="1.5" />
          <circle cx="410" cy="380" r="7" fill="#E09A12" />
          <text x="410" y="414" fill="#16131F" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
            SELLER GRAPH
          </text>
        </g>

        {/* 4. Evidence Feature Sub-Nodes (Vision, NLP, Price, Risk) */}
        <circle cx="200" cy="190" r="4.5" fill="#6B2D5C" />
        <circle cx="340" cy="190" r="4.5" fill="#6A63E0" />
        <circle cx="210" cy="310" r="4.5" fill="#12A36B" />
        <circle cx="330" cy="310" r="4.5" fill="#E09A12" />

        {/* 5. Center Hub: Canonical Entity & Multimodal Fusion Core */}
        <g>
          {/* Ambient Outer Halo */}
          <circle cx="270" cy="250" r="38" fill="#F0D9E4" fillOpacity="0.6" filter="url(#glowPlum)" />
          {/* Core Shielded Circle */}
          <circle cx="270" cy="250" r="24" fill="#16131F" stroke="#8E3F7A" strokeWidth="2.5" />
          {/* Inner Light Core */}
          <circle cx="270" cy="250" r="10" fill="#F0D9E4" className="animate-pulse" />

          {/* Canonical Hub Labeling */}
          <text x="270" y="296" fill="#16131F" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="0.6">
            CANONICAL ENTITY
          </text>
          <text x="270" y="310" fill="#6F5B68" fontSize="8.5" fontWeight="600" textAnchor="middle">
            Multimodal Fusion Hub
          </text>
        </g>
      </svg>

      {/* Floating Live Anomaly Callout Overlay (Light Plum themed) */}
      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[rgba(193,160,172,0.4)] shadow-xs flex flex-col gap-0.5 z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E09A12] animate-ping" />
          <span className="text-[11px] font-bold text-[#16131F]">Price Dispersion</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FCF1D9] text-[#7A4B00] font-semibold border border-[#FDE68A]">
            -38% Anomaly
          </span>
        </div>
        <span className="text-[9.5px] text-[#6F5B68] font-medium pl-4">Cross-seller deviation detected</span>
      </div>

      {/* Floating Bottom Evidence Modality Stream */}
      <div className="absolute bottom-5 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[rgba(193,160,172,0.35)] shadow-xs flex items-center gap-2 z-20 pointer-events-none">
        <span className="text-[10px] font-mono font-semibold text-[#16131F]">5 Learned Modalities Active</span>
        <span className="text-[9px] font-mono text-[#0B5B3B] bg-[#E3F4EC] px-1.5 py-0.5 rounded font-bold border border-[#A7F3D0]">
          100% Invariant
        </span>
      </div>
    </div>
  );
};
