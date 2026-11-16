import React from 'react';

export const MarketplaceNetworkVisual: React.FC = () => {
  return (
    <div className="relative w-full h-[480px] flex items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-[#0D1B2A] via-[#102237] to-[#0A1624] border border-slate-800/80 shadow-2xl">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-[#3D7584] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-[#89BBBE] blur-3xl opacity-40" />
      </div>

      {/* Main SVG Marketplace Relationship & Evidence Graph */}
      <svg
        viewBox="0 0 540 540"
        className="w-full h-full max-w-[500px] max-h-[500px] z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle gradient for primary connection lines */}
          <linearGradient id="lineGradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3D7584" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#89BBBE" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="lineGradSage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A3B18A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3D7584" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="lineGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C67D3B" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#89BBBE" stopOpacity="0.2" />
          </linearGradient>

          {/* Glow filter for key hub nodes */}
          <filter id="glowSubtle" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Curved Connection Lines Between Entities */}
        <g className="stroke-[#89BBBE]/25" strokeWidth="1.2">
          {/* Amazon -> Canonical Hub */}
          <path
            d="M 120 130 Q 180 180 270 250"
            stroke="url(#lineGradTeal)"
            strokeDasharray="4 4"
            className="animate-dashSlow"
          />

          {/* Flipkart -> Canonical Hub */}
          <path
            d="M 420 140 Q 360 190 270 250"
            stroke="url(#lineGradTeal)"
            strokeDasharray="4 4"
            className="animate-dashSlow"
          />

          {/* Myntra -> Canonical Hub */}
          <path
            d="M 130 390 Q 190 320 270 250"
            stroke="url(#lineGradSage)"
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
          <path d="M 120 130 C 180 80, 360 80, 420 140" stroke="#3D7584" strokeOpacity="0.2" strokeWidth="1" />
          <path d="M 130 390 C 220 440, 340 440, 410 380" stroke="#3D7584" strokeOpacity="0.2" strokeWidth="1" />
          <path d="M 120 130 Q 110 260 130 390" stroke="#89BBBE" strokeOpacity="0.15" strokeWidth="1" />
          <path d="M 420 140 Q 430 260 410 380" stroke="#89BBBE" strokeOpacity="0.15" strokeWidth="1" />

          {/* Internal Evidence Modality Branches */}
          <path d="M 270 250 L 200 190" stroke="#89BBBE" strokeOpacity="0.4" />
          <path d="M 270 250 L 340 190" stroke="#89BBBE" strokeOpacity="0.4" />
          <path d="M 270 250 L 210 310" stroke="#A3B18A" strokeOpacity="0.4" />
          <path d="M 270 250 L 330 310" stroke="#C67D3B" strokeOpacity="0.4" />
        </g>

        {/* 2. Concentric Orbit Rings Around Canonical Hub */}
        <circle cx="270" cy="250" r="90" stroke="#3D7584" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="6 6" />
        <circle cx="270" cy="250" r="160" stroke="#89BBBE" strokeOpacity="0.12" strokeWidth="1" />

        {/* 3. Outer Marketplace Nodes (Amazon, Flipkart, Myntra, Sellers) */}
        {/* Amazon IN Node */}
        <g className="animate-floatSlow" style={{ transformOrigin: '120px 130px' }}>
          <circle cx="120" cy="130" r="22" fill="#15263A" stroke="#3D7584" strokeWidth="1.5" />
          <circle cx="120" cy="130" r="8" fill="#3D7584" />
          <text x="120" y="166" fill="#89BBBE" fontSize="10" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
            AMAZON IN
          </text>
        </g>

        {/* Flipkart Node */}
        <g className="animate-floatSlow" style={{ animationDelay: '-3s', transformOrigin: '420px 140px' }}>
          <circle cx="420" cy="140" r="22" fill="#15263A" stroke="#89BBBE" strokeWidth="1.5" />
          <circle cx="420" cy="140" r="8" fill="#89BBBE" />
          <text x="420" y="176" fill="#89BBBE" fontSize="10" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
            FLIPKART
          </text>
        </g>

        {/* Myntra Node */}
        <g className="animate-floatSlow" style={{ animationDelay: '-6s', transformOrigin: '130px 390px' }}>
          <circle cx="130" cy="390" r="20" fill="#15263A" stroke="#B8B2D8" strokeWidth="1.5" />
          <circle cx="130" cy="390" r="7" fill="#B8B2D8" />
          <text x="130" y="424" fill="#B8B2D8" fontSize="10" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
            MYNTRA
          </text>
        </g>

        {/* Merchant / Seller Governance Hub */}
        <g className="animate-floatSlow" style={{ animationDelay: '-4s', transformOrigin: '410px 380px' }}>
          <circle cx="410" cy="380" r="20" fill="#15263A" stroke="#C67D3B" strokeWidth="1.5" />
          <circle cx="410" cy="380" r="7" fill="#C67D3B" />
          <text x="410" y="414" fill="#E8EFF0" fontSize="10" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
            SELLER GRAPH
          </text>
        </g>

        {/* 4. Secondary Evidence Modality Nodes */}
        {/* NLP Sentiment Node */}
        <circle cx="200" cy="190" r="5" fill="#89BBBE" opacity="0.8" />
        {/* OCR Forensics Node */}
        <circle cx="340" cy="190" r="5" fill="#A3B18A" opacity="0.8" />
        {/* Price Dispersion Node */}
        <circle cx="210" cy="310" r="5" fill="#C67D3B" opacity="0.8" />
        {/* Topology Node */}
        <circle cx="330" cy="310" r="5" fill="#3D7584" opacity="0.8" />

        {/* 5. Central Canonical Entity Hub (Focus) */}
        <g className="animate-pulseSubtle" style={{ transformOrigin: '270px 250px' }}>
          <circle cx="270" cy="250" r="32" fill="#0D1B2A" stroke="#FAF7F2" strokeWidth="1.5" filter="url(#glowSubtle)" />
          <circle cx="270" cy="250" r="26" fill="#1C324D" stroke="#3D7584" strokeWidth="1" />
          <circle cx="270" cy="250" r="12" fill="#FAF7F2" />
          <text x="270" y="296" fill="#FAF7F2" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="0.8">
            CANONICAL ENTITY
          </text>
          <text x="270" y="310" fill="#89BBBE" fontSize="9" fontWeight="500" textAnchor="middle">
            Multimodal Fusion Hub
          </text>
        </g>
      </svg>

      {/* Floating Translucent Data Telemetry Overlays */}
      {/* 1. Price Anomaly Indicator (Top Right) */}
      <div className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-lg space-y-1 z-20 animate-floatSlow" style={{ animationDelay: '-2s' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#C67D3B]" />
          <span className="text-[11px] font-semibold text-slate-200">Price Dispersion</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#C67D3B]/30 text-[#F3D4B6] border border-[#C67D3B]/40">
            -38% Anomaly
          </span>
        </div>
        <p className="text-[10px] text-slate-400">Cross-seller deviation detected</p>
      </div>

      {/* 2. Packaging OCR Forensics (Bottom Left) */}
      <div className="absolute bottom-6 left-6 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-lg space-y-1 z-20 animate-floatSlow" style={{ animationDelay: '-5s' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4D7C5B]" />
          <span className="text-[11px] font-semibold text-slate-200">OCR Packaging Forensics</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#4D7C5B]/30 text-[#C3DFCA] border border-[#4D7C5B]/40">
            99.2% Match
          </span>
        </div>
        <p className="text-[10px] text-slate-400">Manufacturer badge verified</p>
      </div>

      {/* 3. Modality Status Badge (Bottom Right) */}
      <div className="absolute bottom-6 right-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#091420]/80 backdrop-blur-md border border-slate-700/80 text-[11px] text-slate-300 z-20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D7584] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3D7584]" />
        </span>
        <span className="font-mono text-[10px] text-[#89BBBE]">Continuous Modality Stream</span>
      </div>
    </div>
  );
};
