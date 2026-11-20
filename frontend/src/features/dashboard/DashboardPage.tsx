import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Calendar as CalendarIcon,
  Bell,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Footprints,
  Package,
  GitCompare,
  Bookmark,
  ExternalLink,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { VerdictBadge } from '../../components/ui/VerdictBadge';
import { ModalityStrip } from '../../components/ui/ModalityStrip';
import { Tip } from '../../components/ui/Tip';

// Custom lightweight count-up animation hook that respects reduced motion
function useCountUp(target: number, duration: number = 700) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }

    let start = 0;
    const stepTime = 16;
    const totalSteps = duration / stepTime;
    const increment = target / totalSteps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.round(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

// Recent investigations with verified multimodal metadata
interface DashboardInvestigation {
  id: string;
  title: string;
  brand: string;
  marketplace: string;
  category: string;
  date: string;
  dayOfMonth: number;
  price: number;
  mrp: number;
  trustScore: number;
  verdict: 'Authentic' | 'Caution' | 'Flagged';
  verdictLabel: string;
  imageUrl?: string;
  modalities?: {
    price?: 'clean' | 'moderate' | 'flagged';
    vision?: 'clean' | 'moderate' | 'flagged';
    ocr?: 'clean' | 'moderate' | 'flagged';
    reviews?: 'clean' | 'moderate' | 'flagged';
  };
}

const RECENT_INVESTIGATIONS: DashboardInvestigation[] = [
  {
    id: 'amazon_in_B000052YQN',
    title: "PONDS Cold Cream Cleanser, 3.5 Oz.",
    brand: "POND'S",
    marketplace: 'Amazon India',
    category: 'Beauty & Skincare',
    date: 'Today',
    dayOfMonth: new Date().getDate(),
    price: 449,
    mrp: 599,
    trustScore: 88,
    verdict: 'Authentic',
    verdictLabel: 'Low Anomaly Risk',
    modalities: { price: 'clean', vision: 'clean', ocr: 'clean', reviews: 'clean' },
  },
  {
    id: 'flipkart_kotty_jacket',
    title: 'Kotty Full Sleeve Solid Women Bomber Jacket',
    brand: 'Kotty',
    marketplace: 'Flipkart',
    category: "Women's Apparel",
    date: 'Yesterday',
    dayOfMonth: Math.max(1, new Date().getDate() - 1),
    price: 828,
    mrp: 2999,
    trustScore: 92,
    verdict: 'Authentic',
    verdictLabel: 'Corridor Match',
    modalities: { price: 'clean', vision: 'clean', ocr: 'clean', reviews: 'clean' },
  },
  {
    id: 'alt_audio_1',
    title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
    brand: 'Sony',
    marketplace: 'Amazon India',
    category: 'Consumer Audio',
    date: '2 days ago',
    dayOfMonth: Math.max(1, new Date().getDate() - 2),
    price: 19990,
    mrp: 29990,
    trustScore: 96,
    verdict: 'Authentic',
    verdictLabel: 'Brand Flagship Match',
    modalities: { price: 'clean', vision: 'clean', ocr: 'clean', reviews: 'clean' },
  },
  {
    id: 'amazon_in_B0000E3QL7',
    title: 'Olay Ultra Moisture Body Wash with Shea Butter',
    brand: 'Olay',
    marketplace: 'Amazon India',
    category: 'Personal Care',
    date: '4 days ago',
    dayOfMonth: Math.max(1, new Date().getDate() - 4),
    price: 849,
    mrp: 1199,
    trustScore: 64,
    verdict: 'Caution',
    verdictLabel: 'Seller Unrated',
    modalities: { price: 'moderate', vision: 'clean', ocr: 'clean', reviews: 'moderate' },
  },
  {
    id: 'flipkart_tokyo_jacket',
    title: 'Tokyo Talkies Full Sleeve Puffer Jacket',
    brand: 'Tokyo Talkies',
    marketplace: 'Flipkart',
    category: "Women's Apparel",
    date: '6 days ago',
    dayOfMonth: Math.max(1, new Date().getDate() - 6),
    price: 999,
    mrp: 2799,
    trustScore: 87,
    verdict: 'Authentic',
    verdictLabel: 'Platform Fulfilled',
    modalities: { price: 'clean', vision: 'clean', ocr: 'clean', reviews: 'clean' },
  },
  {
    id: 'sample_flagged_1',
    title: 'Luxury Designer Air Max Edition Sports Running Shoes',
    brand: 'Unbranded Import',
    marketplace: 'Myntra Third-Party',
    category: 'Footwear',
    date: '8 days ago',
    dayOfMonth: Math.max(1, new Date().getDate() - 8),
    price: 1199,
    mrp: 14999,
    trustScore: 38,
    verdict: 'Flagged',
    verdictLabel: 'Extreme Price Corridor Outlier',
    modalities: { price: 'flagged', vision: 'moderate', ocr: 'flagged', reviews: 'flagged' },
  },
];

// Area chart activity stacked by solid semantic colors
const WEEKLY_SCAN_ACTIVITY = [
  { day: 'Mon', total: 4, verified: 3, caution: 1, flagged: 0 },
  { day: 'Tue', total: 3, verified: 2, caution: 0, flagged: 1 },
  { day: 'Wed', total: 6, verified: 4, caution: 1, flagged: 1 },
  { day: 'Thu', total: 5, verified: 4, caution: 1, flagged: 0 },
  { day: 'Fri', total: 8, verified: 6, caution: 1, flagged: 1 },
  { day: 'Sat', total: 4, verified: 3, caution: 1, flagged: 0 },
  { day: 'Sun', total: 3, verified: 2, caution: 1, flagged: 0 },
];

// Donut chart verdict distribution using solid semantic tokens
const VERDICT_PIE_DATA = [
  { name: 'Verified Authentic', value: 16, percentage: 67, color: 'var(--ok)' },
  { name: 'Needs Double-Check', value: 5, percentage: 21, color: 'var(--warn)' },
  { name: 'High Anomaly', value: 3, percentage: 12, color: 'var(--bad)' },
];

// 7-Point Sparklines data
const SPARKLINE_TOTAL = [{ v: 18 }, { v: 19 }, { v: 21 }, { v: 20 }, { v: 22 }, { v: 23 }, { v: 24 }];
const SPARKLINE_SAFE = [{ v: 11 }, { v: 12 }, { v: 13 }, { v: 14 }, { v: 14 }, { v: 15 }, { v: 16 }];
const SPARKLINE_CAUTION = [{ v: 4 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 5 }, { v: 4 }, { v: 5 }];
const SPARKLINE_FLAGGED = [{ v: 2 }, { v: 2 }, { v: 1 }, { v: 3 }, { v: 2 }, { v: 2 }, { v: 3 }];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Quick Command Strip state
  const [quickUrl, setQuickUrl] = useState<string>('');

  // Count-up figures for KPIs
  const countTotal = useCountUp(24);
  const countSafe = useCountUp(16);
  const countCaution = useCountUp(5);
  const countFlagged = useCountUp(3);

  // Dynamic time-of-day greeting
  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || 'Shruti';

  // Filters & sorting for recent investigations
  const [filterVerdict, setFilterVerdict] = useState<'All' | 'Verified' | 'Double-Check' | 'Flagged'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);

  // Watchlist items state with action feedback
  const [watchlistIds, setWatchlistIds] = useState<string[]>(['alt_audio_1', 'flipkart_kotty_jacket', 'amazon_in_B000052YQN']);
  const [savedActionNote, setSavedActionNote] = useState<string | null>(null);

  // Donut chart hover state
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Real date derivations for Calendar
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });
  const todayDate = now.getDate();
  const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 is Sunday
  const paddingEmptyDays = (firstDayOfMonth + 6) % 7; // Monday-first layout

  // Mock scan heatmap volume map { day: volume }
  const scanVolumeMap: Record<number, number> = useMemo(() => ({
    3: 2, 6: 1, 8: 3, 11: 1, 12: 4, 14: 2, 16: 3, 18: 5, 19: 3, [todayDate]: 4,
  }), [todayDate]);

  // Days with high anomaly detection
  const anomalyDays = useMemo(() => [12, Math.max(1, todayDate - 8)], [todayDate]);

  const filteredInvestigations = useMemo(() => {
    let list = [...RECENT_INVESTIGATIONS];
    if (filterVerdict === 'Verified') {
      list = list.filter((i) => i.verdict === 'Authentic');
    } else if (filterVerdict === 'Double-Check') {
      list = list.filter((i) => i.verdict === 'Caution');
    } else if (filterVerdict === 'Flagged') {
      list = list.filter((i) => i.verdict === 'Flagged');
    }

    if (selectedDayFilter !== null) {
      list = list.filter((i) => i.dayOfMonth === selectedDayFilter);
    }

    if (sortBy === 'highest') {
      list.sort((a, b) => b.trustScore - a.trustScore);
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => a.trustScore - b.trustScore);
    }
    return list;
  }, [filterVerdict, sortBy, selectedDayFilter]);

  // Navigate to /scanner with URL prefilled
  const handleQuickScan = () => {
    const trimmed = quickUrl.trim();
    if (!trimmed) return;
    navigate(`/scanner?url=${encodeURIComponent(trimmed)}`);
  };

  const toggleWatchlist = (id: string, title: string) => {
    if (watchlistIds.includes(id)) {
      setWatchlistIds((prev) => prev.filter((i) => i !== id));
      setSavedActionNote(`Removed "${title.substring(0, 24)}..." from Watchlist`);
    } else {
      setWatchlistIds((prev) => [...prev, id]);
      setSavedActionNote(`Added "${title.substring(0, 24)}..." to Watchlist`);
    }
    setTimeout(() => setSavedActionNote(null), 2500);
  };

  // Helper for marketplace badges
  const getMarketplaceChip = (mp: string) => {
    const lower = mp.toLowerCase();
    if (lower.includes('amazon')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF9900]/10 text-[#B36B00] border border-[#FF9900]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
          Amz
        </span>
      );
    }
    if (lower.includes('flipkart')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2874F0]/10 text-[#1C54B2] border border-[#2874F0]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2874F0]" />
          Fk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF3F6C]/10 text-[#C71B48] border border-[#FF3F6C]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F6C]" />
        My
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* =========================================================================
          1. TOP GREETING & GLOBAL ACTION ROW
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] font-heading">
            {greetingTime}, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1 font-medium">
            Multimodal shopping intelligence and active anomaly surveillance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/scanner')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] bg-[var(--ink)] hover:bg-[var(--accent)] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:translate-y-[-1px] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[var(--heather)]" />
          <span>+ New Investigation</span>
        </button>
      </div>

      {/* =========================================================================
          COMMAND STRIP: Hero URL Scan Input with .glow-card & Marketplace Chips
         ========================================================================= */}
      <div className="glow-card rounded-[24px] p-4 sm:p-5 shadow-[0_8px_30px_rgba(22,19,31,0.06)] border border-[var(--line)]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <ScanSearch className="w-5 h-5 text-[var(--accent)] absolute left-3.5 pointer-events-none" />
            <input
              type="url"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickUrl.trim()) {
                  handleQuickScan();
                }
              }}
              placeholder="Paste Amazon, Flipkart, or Myntra product URL to audit authenticity..."
              className="w-full pl-11 pr-20 py-3 rounded-xl bg-[var(--canvas)]/50 border border-[var(--line)] focus:border-[var(--accent)] focus:bg-white outline-none text-xs sm:text-sm text-[var(--ink)] placeholder:text-[var(--text-3)] font-medium transition-all"
            />
            <div className="absolute right-3 hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--text-3)] bg-white px-2 py-0.5 rounded border border-[var(--line)] select-none">
              <span className="text-xs">⌘</span>K
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickScan}
            disabled={!quickUrl.trim()}
            className="px-6 py-3 rounded-xl bg-[var(--ink)] hover:bg-[var(--accent)] text-white text-xs sm:text-sm font-bold shadow-sm transition-all hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[var(--heather)]" />
            <span>Scan Product</span>
          </button>
        </div>

        {/* Quick Marketplace sample chips */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--line)]/60 flex-wrap text-xs">
          <span className="text-[11px] font-mono text-[var(--text-3)] font-semibold uppercase">
            Quick Samples:
          </span>
          <button
            type="button"
            onClick={() => setQuickUrl('https://www.amazon.in/dp/B000052YQN')}
            className="px-2.5 py-1 rounded-lg bg-[var(--canvas)] hover:bg-[var(--heather)]/60 text-[var(--ink)] font-semibold text-[11px] border border-[var(--line)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
            <span>Amazon: Pond's Cold Cream</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickUrl('https://www.flipkart.com/kotty-solid-jacket/p/itm123')}
            className="px-2.5 py-1 rounded-lg bg-[var(--canvas)] hover:bg-[var(--heather)]/60 text-[var(--ink)] font-semibold text-[11px] border border-[var(--line)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2874F0]" />
            <span>Flipkart: Kotty Bomber Jacket</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickUrl('https://www.myntra.com/footwear/air-max/p/sample')}
            className="px-2.5 py-1 rounded-lg bg-[var(--canvas)] hover:bg-[var(--heather)]/60 text-[var(--ink)] font-semibold text-[11px] border border-[var(--line)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F6C]" />
            <span>Myntra: Air Max Runner</span>
          </button>
        </div>
      </div>

      {/* Action feedback toast note */}
      {savedActionNote && (
        <div className="px-4 py-2.5 rounded-xl bg-[var(--ink)] text-white text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[var(--ok)]" />
            <span>{savedActionNote}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedActionNote(null)}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          2. 4-COLUMN PASTEL KPI CARDS (Sparklines + Delta Chips + Filter Action)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Total Investigations */}
        <div
          onClick={() => setFilterVerdict('All')}
          className={cn(
            'bg-white rounded-[24px] border shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-2 card-hover-lift cursor-pointer transition-all border-l-4 border-l-[var(--heather)]',
            filterVerdict === 'All' ? 'ring-2 ring-[var(--ink)]/40 border-[var(--ink)]' : 'border-[var(--line)]'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[var(--text-3)] font-bold tracking-wider">
              Total Scanned
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--ok-bg)] text-[var(--ok-ink)] border border-[var(--ok)]/20">
                ▲ 14% vs last wk
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--heather)] text-[var(--ink)] flex items-center justify-center">
                <ScanSearch className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-black text-[var(--ink)] font-heading tabular-nums font-mono">
              {countTotal}
            </div>
            <div className="w-24 h-9">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SPARKLINE_TOTAL}>
                  <Line type="monotone" dataKey="v" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-2)] leading-tight pt-1">
            <strong className="text-[var(--ink)] font-semibold">+4 scans</strong> this week · Click to show all
          </p>
        </div>

        {/* KPI 2: Verified Authentic */}
        <div
          onClick={() => setFilterVerdict('Verified')}
          className={cn(
            'bg-white rounded-[24px] border shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-2 card-hover-lift cursor-pointer transition-all border-l-4 border-l-[#A7F3D0]',
            filterVerdict === 'Verified' ? 'ring-2 ring-[var(--ok)]/60 border-[var(--ok)]' : 'border-[var(--line)]'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[var(--ok-ink)] font-bold tracking-wider">
              Verified Authentic
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--ok-bg)] text-[var(--ok-ink)] border border-[var(--ok)]/20">
                ▲ 8% vs last wk
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--ok-bg)] text-[var(--ok-ink)] border border-[#A7F3D0] flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-black text-[var(--ok-ink)] font-heading tabular-nums font-mono">
              {countSafe}
            </div>
            <div className="w-24 h-9">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SPARKLINE_SAFE}>
                  <Line type="monotone" dataKey="v" stroke="var(--ok)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--ok-ink)] font-medium leading-tight pt-1">
            <strong>67% pass rate</strong> · Normal retail corridor
          </p>
        </div>

        {/* KPI 3: Needs Double-Check */}
        <div
          onClick={() => setFilterVerdict('Double-Check')}
          className={cn(
            'bg-white rounded-[24px] border shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-2 card-hover-lift cursor-pointer transition-all border-l-4 border-l-[#FDE68A]',
            filterVerdict === 'Double-Check' ? 'ring-2 ring-[var(--warn)]/60 border-[var(--warn)]' : 'border-[var(--line)]'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[var(--warn-ink)] font-bold tracking-wider">
              Review Anomalies
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--warn-bg)] text-[var(--warn-ink)] border border-[var(--warn)]/20">
                ▼ 2% vs last wk
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--warn-bg)] text-[var(--warn-ink)] border border-[#FDE68A] flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-black text-[var(--warn-ink)] font-heading tabular-nums font-mono">
              {countCaution}
            </div>
            <div className="w-24 h-9">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SPARKLINE_CAUTION}>
                  <Line type="monotone" dataKey="v" stroke="var(--warn)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--warn-ink)] font-medium leading-tight pt-1">
            <strong>Corridor variance</strong> or seller history unrated
          </p>
        </div>

        {/* KPI 4: High Anomaly / Flagged */}
        <div
          onClick={() => setFilterVerdict('Flagged')}
          className={cn(
            'bg-white rounded-[24px] border shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-2 card-hover-lift cursor-pointer transition-all border-l-4 border-l-[#FECDD3]',
            filterVerdict === 'Flagged' ? 'ring-2 ring-[var(--bad)]/60 border-[var(--bad)]' : 'border-[var(--line)]'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[var(--bad-ink)] font-bold tracking-wider">
              Flagged Counterfeits
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--bad-bg)] text-[var(--bad-ink)] border border-[var(--bad)]/20">
                ▲ 1 flagged
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--bad-bg)] text-[var(--bad-ink)] border border-[#FECDD3] flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-black text-[var(--bad-ink)] font-heading tabular-nums font-mono">
              {countFlagged}
            </div>
            <div className="w-24 h-9">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SPARKLINE_FLAGGED}>
                  <Line type="monotone" dataKey="v" stroke="var(--bad)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--bad-ink)] font-medium leading-tight pt-1">
            <strong>Fake pricing traps</strong> or clone packaging
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN CONTENT: Left Column (Table + Charts) vs Right Utility Column
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
        {/* =======================================================================
            LEFT / CENTER COLUMN (8 cols): Recent Investigations & Analytics
           ======================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Recent Investigations Table */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-6 space-y-5">
            {/* Header with Title, Filter Tabs & Sort Dropdown */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]/60">
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)] font-heading">
                  Recent Investigations
                </h2>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  Verified product authenticity checks across monitored marketplaces
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                {/* Active Date Filter Chip if selected from Calendar */}
                {selectedDayFilter !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayFilter(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--ink)] text-white text-xs font-semibold shadow-xs"
                    title="Click to clear calendar day filter"
                  >
                    <span>Day: {selectedDayFilter}</span>
                    <RotateCcw className="w-3 h-3 text-[var(--heather)]" />
                  </button>
                )}

                {/* Filter Pills */}
                <div className="flex items-center p-1 bg-[var(--canvas)] rounded-xl border border-[var(--line)] shrink-0">
                  {(['All', 'Verified', 'Double-Check', 'Flagged'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterVerdict(tab)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                        filterVerdict === tab
                          ? 'bg-white text-[var(--ink)] shadow-xs'
                          : 'text-[var(--text-3)] hover:text-[var(--ink)]'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort investigations by"
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-white text-xs text-[var(--ink)] outline-none font-medium cursor-pointer shadow-xs shrink-0"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Score</option>
                  <option value="lowest">Lowest Score</option>
                </select>
              </div>
            </div>

            {/* Investigations List */}
            {filteredInvestigations.length === 0 ? (
              <div className="py-12 px-6 rounded-2xl bg-[var(--canvas)]/40 border border-dashed border-[var(--line)] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--heather)] text-[var(--ink)] mx-auto flex items-center justify-center">
                  <ScanSearch className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                    No matching investigations found
                  </h3>
                  <p className="text-xs text-[var(--text-3)] max-w-sm mx-auto">
                    Try adjusting your verdict or calendar filters, or test our AI scanner with a sample product listing.
                  </p>
                </div>

                {/* 3-Step Explainer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto pt-2 text-left">
                  <div className="p-3 rounded-xl bg-white border border-[var(--line)] text-xs space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] block">STEP 1</span>
                    <strong className="text-[var(--ink)] block">Paste Listing URL</strong>
                    <span className="text-[11px] text-[var(--text-3)] leading-tight block">Amazon, Flipkart, or Myntra link</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[var(--line)] text-xs space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] block">STEP 2</span>
                    <strong className="text-[var(--ink)] block">4-Modalities Check</strong>
                    <span className="text-[11px] text-[var(--text-3)] leading-tight block">Price, Vision, OCR, and Reviews</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[var(--line)] text-xs space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] block">STEP 3</span>
                    <strong className="text-[var(--ink)] block">Instant Verdict</strong>
                    <span className="text-[11px] text-[var(--text-3)] leading-tight block">Authentic or Deceptive Risk Score</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFilterVerdict('All');
                    setSelectedDayFilter(null);
                    navigate('/scanner?url=https%3A%2F%2Fwww.amazon.in%2Fdp%2FB000052YQN');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--ink)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--accent)] cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--heather)]" />
                  <span>Try a sample listing (Pond's Cold Cream)</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)]/40">
                {filteredInvestigations.map((item) => {
                  const isWatched = watchlistIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/investigate/${item.id}`);
                      }}
                      className={cn(
                        'py-3.5 px-3 -mx-2 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[var(--canvas)]/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ink)]',
                        item.verdict === 'Authentic'
                          ? 'hover:border-l-4 hover:border-l-[var(--ok)]'
                          : item.verdict === 'Caution'
                          ? 'hover:border-l-4 hover:border-l-[var(--warn)]'
                          : 'hover:border-l-4 hover:border-l-[var(--bad)]'
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Category Icon container */}
                        <div className="w-10 h-10 rounded-xl bg-[var(--heather)] border border-[#C1A0AC]/40 shrink-0 flex items-center justify-center p-2 overflow-hidden shadow-xs">
                          {item.category?.toLowerCase().includes('skin') || item.category?.toLowerCase().includes('beauty') ? (
                            <Sparkles className="w-5 h-5 text-[var(--ink)]" />
                          ) : item.category?.toLowerCase().includes('footwear') || item.category?.toLowerCase().includes('shoe') ? (
                            <Footprints className="w-5 h-5 text-[var(--ink)]" />
                          ) : item.category?.toLowerCase().includes('jacket') || item.category?.toLowerCase().includes('apparel') || item.category?.toLowerCase().includes('dress') ? (
                            <ShoppingBag className="w-5 h-5 text-[var(--ink)]" />
                          ) : (
                            <Package className="w-5 h-5 text-[var(--ink)]" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-3)]">
                              {item.brand}
                            </span>
                            <span className="text-xs text-[var(--line)]">•</span>
                            {getMarketplaceChip(item.marketplace)}
                            <span className="text-xs text-[var(--line)] hidden md:inline">•</span>
                            <span className="text-[11px] text-[var(--text-3)] hidden md:inline">
                              {item.category}
                            </span>
                          </div>

                          <h3
                            onClick={() => navigate(`/investigate/${item.id}`)}
                            className="text-xs sm:text-sm font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors truncate"
                          >
                            {item.title}
                          </h3>

                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)] flex-wrap">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span className="font-semibold text-[var(--ink)]">₹{item.price.toLocaleString('en-IN')}</span>
                            {item.mrp > item.price && (
                              <span className="line-through text-[var(--text-3)] text-[10px]">
                                ₹{item.mrp.toLocaleString('en-IN')}
                              </span>
                            )}
                            <span>•</span>
                            {/* 4-Modality Evidence Strip */}
                            <ModalityStrip
                              modalities={item.modalities}
                              verdict={item.verdict}
                              trustScore={item.trustScore}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        {/* Mini Trust Score Bar + Score */}
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-12 h-1.5 rounded-full bg-[var(--heather)]/40 overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${item.trustScore}%`,
                                  backgroundColor:
                                    item.trustScore >= 80 ? 'var(--ok)' : item.trustScore >= 60 ? 'var(--warn)' : 'var(--bad)',
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-sm font-black font-heading tabular-nums font-mono',
                                item.trustScore >= 80
                                  ? 'text-[var(--ok-ink)]'
                                  : item.trustScore >= 60
                                  ? 'text-[var(--warn-ink)]'
                                  : 'text-[var(--bad-ink)]'
                              )}
                            >
                              {item.trustScore}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-[var(--text-3)] uppercase block">
                            Trust Score
                          </span>
                        </div>

                        {/* Unified Verdict Pill */}
                        <VerdictBadge verdict={item.verdict} size="sm" />

                        {/* Hover-revealed quick actions */}
                        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tip content="Open Investigation Report">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/investigate/${item.id}`);
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--ink)] hover:bg-white border border-transparent hover:border-[var(--line)] transition-all cursor-pointer"
                              aria-label="Open report"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </Tip>
                          <Tip content="Compare with Alternative Offerings">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/comparisons`);
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--ink)] hover:bg-white border border-transparent hover:border-[var(--line)] transition-all cursor-pointer"
                              aria-label="Compare"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                            </button>
                          </Tip>
                          <Tip content={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(item.id, item.title);
                              }}
                              className={cn(
                                'p-1.5 rounded-lg border transition-all cursor-pointer',
                                isWatched
                                  ? 'text-[var(--accent)] bg-[var(--heather)]/60 border-[var(--accent)]/30'
                                  : 'text-[var(--text-3)] hover:text-[var(--ink)] hover:bg-white border-transparent hover:border-[var(--line)]'
                              )}
                              aria-label="Watchlist toggle"
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>
                          </Tip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer link */}
            <div className="pt-2 text-center border-t border-[var(--line)]/60">
              <Link
                to="/scanner"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
              >
                <span>Launch full catalog scanner & archive</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Bottom Two-Column Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Chart: Stacked Investigations Overview by Verdict */}
            <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[var(--ink)]" />
                  <span>Investigations Overview</span>
                </h3>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  Weekly scan volume stacked by verified verdict
                </p>
              </div>

              <div className="h-48 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WEEKLY_SCAN_ACTIVITY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="okGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--ok)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--ok)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="warnGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--warn)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--warn)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="badGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--bad)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--bad)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(193, 160, 172, 0.20)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#6F5B68', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6F5B68', fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                        return (
                          <div className="bg-white rounded-xl p-3 border border-[var(--line)] shadow-lg text-xs space-y-1.5 min-w-[130px]">
                            <div className="font-bold text-[var(--ink)] font-heading border-b border-[var(--line)]/50 pb-1 flex justify-between">
                              <span>{label}</span>
                              <span className="font-mono">{total} Scans</span>
                            </div>
                            {payload.map((entry: any) => (
                              <div key={entry.name} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span>{entry.name}</span>
                                </span>
                                <span className="font-mono font-bold text-[var(--ink)]">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="verified"
                      name="Authentic"
                      stackId="1"
                      stroke="var(--ok)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#okGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="caution"
                      name="Caution"
                      stackId="1"
                      stroke="var(--warn)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#warnGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="flagged"
                      name="Flagged"
                      stackId="1"
                      stroke="var(--bad)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#badGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Chart: Verdicts by Risk Level with Interactive Center */}
            <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--ok)]" />
                  <span>Verdicts by Risk Level</span>
                </h3>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  Hover slices to inspect modality distribution
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                {/* Donut Chart */}
                <div className="h-40 w-40 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={VERDICT_PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={hoveredPieIndex !== null ? 70 : 66}
                        paddingAngle={3}
                        cornerRadius={6}
                        dataKey="value"
                        onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                      >
                        {VERDICT_PIE_DATA.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={hoveredPieIndex === index ? '#16131F' : 'transparent'}
                            strokeWidth={hoveredPieIndex === index ? 2 : 0}
                            className="cursor-pointer transition-all duration-200"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Dynamic Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-1">
                    {hoveredPieIndex !== null ? (
                      <>
                        <span className="text-lg font-black text-[var(--ink)] font-heading leading-tight tabular-nums font-mono">
                          {VERDICT_PIE_DATA[hoveredPieIndex].value}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-[var(--text-3)] uppercase truncate max-w-[85px]">
                          {VERDICT_PIE_DATA[hoveredPieIndex].percentage}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-extrabold text-[var(--ink)] font-heading leading-tight tabular-nums font-mono">
                          {countTotal}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--text-3)] uppercase">
                          Total
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend list with hover preview */}
                <div className="flex-1 space-y-2 text-xs">
                  {VERDICT_PIE_DATA.map((item, idx) => (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredPieIndex(idx)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                      className={cn(
                        'flex items-center justify-between text-xs p-1 rounded-lg transition-colors cursor-pointer',
                        hoveredPieIndex === idx ? 'bg-[var(--canvas)]' : 'hover:bg-[var(--canvas)]/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[var(--text-2)] text-[11px] truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-[var(--ink)] text-[11px] shrink-0">
                        {item.percentage}% ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            RIGHT SIDEBAR UTILITY COLUMN (4 cols): Scan Calendar, Pass Rate & Timeline
           ======================================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Dynamic Heatmap Calendar Card */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]/50">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[var(--ink)]" />
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                  Scan Heatmap Calendar
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[var(--text-3)]">
                {currentMonthName} {currentYear}
              </span>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-[var(--text-3)] uppercase font-bold py-1">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>

            {/* Dynamic days grid for current real month */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Padding cells */}
              {[...Array(paddingEmptyDays)].map((_, i) => (
                <div key={`empty-${i}`} className="h-7 w-7" />
              ))}

              {/* Days of current month */}
              {[...Array(daysInCurrentMonth)].map((_, i) => {
                const day = i + 1;
                const volume = scanVolumeMap[day] || 0;
                const hasAnomaly = anomalyDays.includes(day);
                const isSelected = selectedDayFilter === day;
                const isToday = day === todayDate;

                // 5 steps of accent tint based on volume
                let bgClass = 'text-[var(--text-2)] hover:bg-[var(--canvas)]';
                if (isSelected) {
                  bgClass = 'bg-[var(--ink)] text-white shadow-xs';
                } else if (volume >= 4) {
                  bgClass = 'bg-[var(--accent)] text-white font-bold';
                } else if (volume >= 3) {
                  bgClass = 'bg-[var(--accent)]/40 text-[var(--ink)] font-bold';
                } else if (volume >= 2) {
                  bgClass = 'bg-[var(--heather)] text-[var(--ink)] font-semibold';
                } else if (volume === 1) {
                  bgClass = 'bg-[var(--heather)]/40 text-[var(--ink)]';
                }

                return (
                  <Tip
                    key={day}
                    content={`${currentMonthName} ${day}: ${volume > 0 ? `${volume} investigations run` : 'No investigations run'}${hasAnomaly ? ' (High Anomaly detected)' : ''}`}
                    side="top"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDayFilter(selectedDayFilter === day ? null : day);
                      }}
                      className={cn(
                        'h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer relative',
                        bgClass,
                        isToday && !isSelected && 'ring-1 ring-[var(--accent)]'
                      )}
                    >
                      <span>{day}</span>
                      {hasAnomaly && !isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--bad)] ring-1 ring-white" />
                      )}
                    </button>
                  </Tip>
                );
              })}
            </div>

            {/* Selected day activity summary */}
            <div className="p-2.5 rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-center text-xs text-[var(--ink)] font-medium mt-1 truncate flex items-center justify-between">
              <span>
                <strong>{currentMonthName} {selectedDayFilter ?? todayDate}</strong>: {scanVolumeMap[selectedDayFilter ?? todayDate] ? `${scanVolumeMap[selectedDayFilter ?? todayDate]} scans recorded` : 'No scans on this day'}
              </span>
              {selectedDayFilter !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter(null)}
                  className="text-[10px] text-[var(--accent)] hover:underline font-bold"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {/* 2. Authenticity Pass Rate Card with 80% Target Benchmark */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--ok)]" />
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                  Overall Trust Rate
                </h3>
              </div>
              <VerdictBadge verdict="LOW_OBSERVED_ANOMALY" label="Healthy Corridor" size="sm" />
            </div>

            <div>
              <div className="text-3xl font-black text-[var(--ink)] font-heading tabular-nums font-mono">
                67%
              </div>
              <p className="text-xs text-[var(--text-3)] mt-0.5 leading-relaxed">
                16 of 24 offerings verified safe across Amazon India, Flipkart, and Myntra
              </p>
            </div>

            {/* Visual Progress Bar with 80% Retail Target Band & Benchmark Tick */}
            <div className="space-y-2">
              <div className="relative w-full h-3.5 rounded-full bg-[var(--heather)]/60 overflow-hidden p-0.5">
                {/* 80%+ Target Corridor highlight band */}
                <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-emerald-200/40 pointer-events-none" />

                <div
                  className="h-full rounded-full bg-[var(--ink)] transition-all duration-700"
                  style={{ width: '67%' }}
                />

                {/* 80% Target Benchmark Tick */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)] pointer-events-none"
                  style={{ left: '80%' }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-3)]">
                <span>0%</span>
                <span className="text-[var(--accent)] font-bold">▲ 80% Retail Benchmark</span>
                <span>100%</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[var(--text-3)] flex-wrap gap-1 pt-1 border-t border-[var(--line)]/40">
                <span className="text-[var(--ok-ink)] font-bold">✓ 16 Safe</span>
                <span className="text-[var(--warn-ink)] font-bold">⚠ 5 Caution</span>
                <span className="text-[var(--bad-ink)] font-bold">✕ 3 Flagged</span>
              </div>
            </div>
          </div>

          {/* 3. Watchlist & Timeline Activity Feed */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--ink)]" />
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                  Watchlist & Real-Time Alerts
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--text-3)]">
                {watchlistIds.length} Active
              </span>
            </div>

            {/* Vertical Timeline Feed */}
            <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--line)]">
              {/* Timeline Item 1 */}
              <div className="relative flex items-start justify-between gap-3 group">
                <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[var(--ok)] ring-4 ring-white" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--ink)] truncate">
                    Sony WH-1000XM4 Noise Cancelling
                  </div>
                  <div className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">
                    Amazon · Observed <strong className="text-[var(--ink)]">₹19,990</strong> · 15m ago
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--ok-bg)] text-[var(--ok-ink)] border border-[var(--ok)]/20 shrink-0">
                  Corridor OK
                </span>
              </div>

              {/* Timeline Item 2 */}
              <div className="relative flex items-start justify-between gap-3 group">
                <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)] ring-4 ring-white" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--ink)] truncate">
                    Kotty Full Sleeve Solid Jacket
                  </div>
                  <div className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">
                    Flipkart · Observed <strong className="text-[var(--ink)]">₹828</strong> · 2h ago
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--heather)] text-[var(--ink)] border border-[var(--accent)]/30 shrink-0">
                  Great Deal
                </span>
              </div>

              {/* Timeline Item 3 */}
              <div className="relative flex items-start justify-between gap-3 group">
                <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[var(--info)] ring-4 ring-white" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--ink)] truncate">
                    Pond's Cold Cream Cleanser
                  </div>
                  <div className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">
                    Amazon · Observed <strong className="text-[var(--ink)]">₹449</strong> · 1d ago
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--info-bg)] text-[var(--info-ink)] border border-[var(--info)]/30 shrink-0">
                  Monitored
                </span>
              </div>
            </div>

            {/* Footer link */}
            <div className="pt-1 text-center">
              <Link
                to="/scanner"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
              >
                <span>Manage alert rules & webhooks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
