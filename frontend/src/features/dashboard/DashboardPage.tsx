import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Calendar as CalendarIcon,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Footprints,
  Package,
  GitCompare,
  ExternalLink,
  RotateCcw,
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
import { investigateService } from '../../services/investigateService';
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

// Real investigations interface for Dashboard presentation
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

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Quick Command Strip state
  const [quickUrl, setQuickUrl] = useState<string>('');

  // Fetch real investigations from database
  const { data: investigationsData } = useQuery({
    queryKey: ['dashboard-investigations', user?.id],
    queryFn: () => investigateService.getInvestigations({ page: 1, limit: 100 }),
  });

  // Map real database records to UI presentation
  const investigations: DashboardInvestigation[] = useMemo(() => {
    if (!investigationsData?.items) return [];

    return investigationsData.items.map((item) => {
      const snap = (item.assessment_snapshot || {}) as Record<string, any>;
      const summary = (snap.summary || {}) as Record<string, any>;
      const overview = (snap.section_1_overview || {}) as Record<string, any>;

      const price = Number(overview.observed_price_inr ?? summary.observed_price_inr ?? 0);
      const mrp = Number(overview.claimed_mrp_inr ?? summary.mrp_inr ?? 0);
      const trustScore = typeof summary.overall_trust_score === 'number'
        ? summary.overall_trust_score
        : Math.round((1 - (item.overall_risk_score || 0)) * 100);

      const d = new Date(item.created_at);
      const dayOfMonth = d.getDate();
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();
      const dateStr = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      const tier = (item.overall_risk_tier || summary.overall_risk_tier || 'LOW').toUpperCase();
      let verdict: 'Authentic' | 'Caution' | 'Flagged' = 'Authentic';
      let verdictLabel = 'Looks safe to buy';
      if (tier.includes('LOW')) {
        verdict = 'Authentic';
        verdictLabel = 'Looks safe to buy';
      } else if (tier.includes('MODERATE')) {
        verdict = 'Caution';
        verdictLabel = 'Double-check before buying';
      } else {
        verdict = 'Flagged';
        verdictLabel = "Not recommended. Don't buy this";
      }

      const modalities: DashboardInvestigation['modalities'] = {
        price: tier.includes('LOW') ? 'clean' : tier.includes('MODERATE') ? 'moderate' : 'flagged',
        vision: tier.includes('LOW') ? 'clean' : 'moderate',
        ocr: 'clean',
        reviews: tier.includes('LOW') ? 'clean' : 'moderate',
      };

      return {
        id: item.id,
        title: item.title || summary.title || overview.title || 'Product Investigation',
        brand: summary.brand || overview.brand || 'Brand',
        marketplace: item.marketplace || summary.marketplace || overview.marketplace || 'Marketplace',
        category: summary.category || overview.category || 'General',
        date: dateStr,
        dayOfMonth,
        price,
        mrp,
        trustScore,
        verdict,
        verdictLabel,
        modalities,
      };
    });
  }, [investigationsData]);

  // Real KPI figures computed from real database investigations
  const totalCount = investigations.length;
  const safeCount = investigations.filter((i) => i.verdict === 'Authentic').length;
  const cautionCount = investigations.filter((i) => i.verdict === 'Caution').length;
  const flaggedCount = investigations.filter((i) => i.verdict === 'Flagged').length;

  // Count-up figures for KPIs
  const countTotal = useCountUp(totalCount);
  const countSafe = useCountUp(safeCount);
  const countCaution = useCountUp(cautionCount);
  const countFlagged = useCountUp(flaggedCount);

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
  const [isExpandedAll, setIsExpandedAll] = useState<boolean>(false);

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

  // Real scan heatmap volume map { day: volume } computed from database records
  const { scanVolumeMap, anomalyDays } = useMemo(() => {
    const volumeMap: Record<number, number> = {};
    const anomDays: number[] = [];

    if (!investigationsData?.items) return { scanVolumeMap: volumeMap, anomalyDays: anomDays };

    investigationsData.items.forEach((item) => {
      const d = new Date(item.created_at);
      if (d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear) {
        const day = d.getDate();
        volumeMap[day] = (volumeMap[day] || 0) + 1;
        const tier = (item.overall_risk_tier || '').toUpperCase();
        if ((tier.includes('HIGH') || tier.includes('CRITICAL')) && !anomDays.includes(day)) {
          anomDays.push(day);
        }
      }
    });

    return { scanVolumeMap: volumeMap, anomalyDays: anomDays };
  }, [investigationsData, currentMonthIdx, currentYear]);

  // Real Weekly Scan Activity stacked by real verdicts
  const weeklyScanActivity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result = days.map((day) => ({ day, total: 0, verified: 0, caution: 0, flagged: 0 }));

    if (!investigationsData?.items) return result;

    investigationsData.items.forEach((item) => {
      const d = new Date(item.created_at);
      const jsDay = d.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      result[dayIdx].total += 1;
      const tier = (item.overall_risk_tier || '').toUpperCase();
      if (tier.includes('LOW')) result[dayIdx].verified += 1;
      else if (tier.includes('MODERATE')) result[dayIdx].caution += 1;
      else result[dayIdx].flagged += 1;
    });

    return result;
  }, [investigationsData]);

  // Real Verdict distribution pie chart data
  const verdictPieData = useMemo(() => {
    if (totalCount === 0) {
      return [
        { name: 'Verified Authentic', value: 0, percentage: 0, color: 'var(--ok)' },
        { name: 'Needs Double-Check', value: 0, percentage: 0, color: 'var(--warn)' },
        { name: 'High Anomaly', value: 0, percentage: 0, color: 'var(--bad)' },
      ];
    }
    return [
      { name: 'Verified Authentic', value: safeCount, percentage: Math.round((safeCount / totalCount) * 100), color: 'var(--ok)' },
      { name: 'Needs Double-Check', value: cautionCount, percentage: Math.round((cautionCount / totalCount) * 100), color: 'var(--warn)' },
      { name: 'High Anomaly', value: flaggedCount, percentage: Math.round((flaggedCount / totalCount) * 100), color: 'var(--bad)' },
    ];
  }, [totalCount, safeCount, cautionCount, flaggedCount]);

  // Real Sparklines derived from weekly scan activity
  const sparklineTotal = useMemo(() => {
    if (totalCount === 0) return [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
    let running = 0;
    return weeklyScanActivity.map((d) => {
      running += d.total;
      return { v: running };
    });
  }, [totalCount, weeklyScanActivity]);

  const sparklineSafe = useMemo(() => {
    if (safeCount === 0) return [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
    let running = 0;
    return weeklyScanActivity.map((d) => {
      running += d.verified;
      return { v: running };
    });
  }, [safeCount, weeklyScanActivity]);

  const sparklineCaution = useMemo(() => {
    if (cautionCount === 0) return [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
    let running = 0;
    return weeklyScanActivity.map((d) => {
      running += d.caution;
      return { v: running };
    });
  }, [cautionCount, weeklyScanActivity]);

  const sparklineFlagged = useMemo(() => {
    if (flaggedCount === 0) return [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
    let running = 0;
    return weeklyScanActivity.map((d) => {
      running += d.flagged;
      return { v: running };
    });
  }, [flaggedCount, weeklyScanActivity]);

  const filteredInvestigations = useMemo(() => {
    let list = [...investigations];
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
  }, [investigations, filterVerdict, sortBy, selectedDayFilter]);

  // Show only 4 newest unless expanded inline
  const displayedInvestigations = useMemo(() => {
    if (isExpandedAll) return filteredInvestigations;
    return filteredInvestigations.slice(0, 4);
  }, [filteredInvestigations, isExpandedAll]);

  // Navigate to /scanner with URL prefilled
  const handleQuickScan = () => {
    const trimmed = quickUrl.trim();
    if (!trimmed) return;
    navigate(`/scanner?url=${encodeURIComponent(trimmed)}`);
  };

  // Helper for marketplace badges using neutral plum palette
  const getMarketplaceChip = (mp: string) => {
    const lower = (mp || '').toLowerCase();
    let label = 'Mkt';
    if (lower.includes('amazon')) label = 'Amz';
    else if (lower.includes('flipkart')) label = 'Fk';
    else if (lower.includes('myntra')) label = 'My';

    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--heather)]/60 text-[var(--ink)] border border-[var(--line)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        {label}
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
          COMMAND STRIP: Hero URL Scan Input with .glow-card & Clean Action
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
      </div>

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
                {totalCount > 0 ? `${totalCount} active` : '0 recorded'}
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
                <LineChart data={sparklineTotal}>
                  <Line type="monotone" dataKey="v" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-2)] leading-tight pt-1">
            <strong className="text-[var(--ink)] font-semibold">{totalCount} total scans</strong>
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
                {safeCount} passed
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
                <LineChart data={sparklineSafe}>
                  <Line type="monotone" dataKey="v" stroke="var(--ok)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--ok-ink)] font-medium leading-tight pt-1">
            <strong>{totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 0}% pass rate</strong> · Normal retail corridor
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
                {cautionCount} review
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
                <LineChart data={sparklineCaution}>
                  <Line type="monotone" dataKey="v" stroke="var(--warn)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--warn-ink)] font-medium leading-tight pt-1">
            <strong>{cautionCount} review items</strong> · Requires secondary check
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
                {flaggedCount} flagged
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
                <LineChart data={sparklineFlagged}>
                  <Line type="monotone" dataKey="v" stroke="var(--bad)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-[var(--bad-ink)] font-medium leading-tight pt-1">
            <strong>{flaggedCount} high risks</strong> · Deceptive or outlier pricing
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN CONTENT: 12-COLUMN BALANCED COMPACT GRID
             Left (xl:col-span-8): Weekly Scan Volume Area Chart (on top) + Recent Investigations (4 items)
             Right (xl:col-span-4): Verdict Donut + Trust Rate Gauge + Scan Calendar
             At < 1280px (< xl): Collapses to single column in order:
               KPIs, Area Chart, Recent Investigations, Donut, Gauge, Calendar.
         ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* =======================================================================
            LEFT COLUMN (8 cols): Weekly Area Chart on TOP + Recent Investigations
           ======================================================================= */}
        <div className="xl:col-span-8 space-y-6">
          {/* 1. Weekly Scan Volume Area Chart (Top Card, ~280px height) */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                  <span>Weekly Scan Activity</span>
                </h3>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  Investigations over the last 7 days stacked by verified verdict
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--heather)]/60 text-[var(--accent)] font-semibold border border-[var(--line)]">
                  7-Day Trend
                </span>
              </div>
            </div>

            <div className="h-[210px] w-full pt-1 relative">
              {totalCount === 0 ? (
                <div className="h-full w-full rounded-xl bg-[var(--canvas)]/30 border border-dashed border-[var(--line)] flex flex-col items-center justify-center p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-[var(--text-3)] mb-1.5 opacity-60" />
                  <p className="text-xs font-semibold text-[var(--ink)]">No scans yet</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5 max-w-xs">
                    Paste a product link above to run your first investigation.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyScanActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              )}
            </div>
          </div>

          {/* 2. Recent Investigations Table (Max 4 items by default, expandable inline) */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 sm:p-6 space-y-4">
            {/* Header with Title, Filter Tabs & Sort Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]/60">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)] font-heading flex items-center gap-2">
                  <span>Recent Investigations</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--heather)]/60 text-[var(--accent)] font-semibold border border-[var(--line)]">
                    {filteredInvestigations.length} Total
                  </span>
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
              <div className="py-10 px-6 rounded-2xl bg-[var(--canvas)]/40 border border-dashed border-[var(--line)] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--heather)] text-[var(--ink)] mx-auto flex items-center justify-center">
                  <ScanSearch className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                    {totalCount === 0 ? 'No scans yet' : 'No matching investigations found'}
                  </h3>
                  <p className="text-xs text-[var(--text-3)] max-w-sm mx-auto">
                    {totalCount === 0
                      ? 'No scans yet. Paste a product link above to run your first investigation.'
                      : 'Try adjusting your verdict or calendar filters, or paste a new product link above.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn("divide-y divide-[var(--line)]/40", isExpandedAll && "max-h-[480px] overflow-y-auto pr-1")}>
                {displayedInvestigations.map((item) => {
                  return (
                    <div
                      key={item.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/investigate/${item.id}`);
                      }}
                      className={cn(
                        'py-3 px-3 -mx-2 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[var(--canvas)]/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ink)]',
                        item.verdict === 'Authentic'
                          ? 'hover:border-l-4 hover:border-l-[var(--ok)]'
                          : item.verdict === 'Caution'
                          ? 'hover:border-l-4 hover:border-l-[var(--warn)]'
                          : 'hover:border-l-4 hover:border-l-[var(--bad)]'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Category Icon container */}
                        <div className="w-9 h-9 rounded-xl bg-[var(--heather)] border border-[#C1A0AC]/40 shrink-0 flex items-center justify-center p-2 overflow-hidden shadow-xs">
                          {item.category?.toLowerCase().includes('skin') || item.category?.toLowerCase().includes('beauty') ? (
                            <Sparkles className="w-4 h-4 text-[var(--ink)]" />
                          ) : item.category?.toLowerCase().includes('footwear') || item.category?.toLowerCase().includes('shoe') ? (
                            <Footprints className="w-4 h-4 text-[var(--ink)]" />
                          ) : item.category?.toLowerCase().includes('jacket') || item.category?.toLowerCase().includes('apparel') || item.category?.toLowerCase().includes('dress') ? (
                            <ShoppingBag className="w-4 h-4 text-[var(--ink)]" />
                          ) : (
                            <Package className="w-4 h-4 text-[var(--ink)]" />
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
                            <span className="font-semibold text-[var(--ink)] tabular-nums">₹{item.price.toLocaleString('en-IN')}</span>
                            {item.mrp > item.price && (
                              <span className="line-through text-[var(--text-3)] text-[10px] tabular-nums">
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer with Show all (N) / Show less Button */}
            {filteredInvestigations.length > 4 && (
              <div className="pt-3 flex items-center justify-between border-t border-[var(--line)]/60 text-xs">
                <button
                  type="button"
                  onClick={() => setIsExpandedAll(!isExpandedAll)}
                  className="inline-flex items-center gap-1.5 font-bold text-[var(--accent)] hover:text-[var(--accent-hi)] transition-colors cursor-pointer"
                >
                  <span>{isExpandedAll ? 'Show less' : `Show all (${filteredInvestigations.length})`}</span>
                </button>

                <Link
                  to="/investigations"
                  className="inline-flex items-center gap-1 text-[var(--text-3)] hover:text-[var(--ink)] font-medium transition-colors"
                >
                  <span>Full audit archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* =======================================================================
            RIGHT SIDEBAR UTILITY COLUMN (4 cols): Donut + Trust Rate + Calendar
           ======================================================================= */}
        <div className="xl:col-span-4 space-y-6">
          {/* 1. Verdicts by Risk Level Donut with Interactive Center */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--ink)] font-heading flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[var(--ok)]" />
                <span>Verdicts by Risk Level</span>
              </h3>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                Distribution across authenticated risk categories
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              {totalCount === 0 ? (
                <div className="h-36 w-full rounded-xl bg-[var(--canvas)]/30 border border-dashed border-[var(--line)] flex flex-col items-center justify-center p-4 text-center">
                  <ShieldCheck className="w-6 h-6 text-[var(--text-3)] mb-1.5 opacity-60" />
                  <p className="text-xs font-semibold text-[var(--ink)]">No verdict data recorded</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5 max-w-xs">
                    Investigation verdicts will appear here once you run a scan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Donut Chart */}
                  <div className="h-36 w-36 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={verdictPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={hoveredPieIndex !== null ? 64 : 60}
                          paddingAngle={3}
                          cornerRadius={6}
                          dataKey="value"
                          onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                          onMouseLeave={() => setHoveredPieIndex(null)}
                        >
                          {verdictPieData.map((entry, index) => (
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
                          <span className="text-base font-black text-[var(--ink)] font-heading leading-tight tabular-nums font-mono">
                            {verdictPieData[hoveredPieIndex].value}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-[var(--text-3)] uppercase truncate max-w-[75px]">
                            {verdictPieData[hoveredPieIndex].percentage}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-extrabold text-[var(--ink)] font-heading leading-tight tabular-nums font-mono">
                            {countTotal}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-[var(--text-3)] uppercase">
                            Total
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Legend list with hover preview */}
                  <div className="flex-1 space-y-1.5 text-xs">
                    {verdictPieData.map((item, idx) => (
                      <div
                        key={item.name}
                        onMouseEnter={() => setHoveredPieIndex(idx)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                        className={cn(
                          'flex items-center justify-between text-xs p-1 rounded-lg transition-colors cursor-pointer',
                          hoveredPieIndex === idx ? 'bg-[var(--canvas)]' : 'hover:bg-[var(--canvas)]/50'
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[var(--text-2)] text-[10px] truncate">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[var(--ink)] text-[10px] shrink-0">
                          {item.percentage}% ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Authenticity Pass Rate Card with 80% Target Benchmark */}
          <div className="bg-white rounded-[24px] border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--ok)]" />
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                  Overall Trust Rate
                </h3>
              </div>
              <VerdictBadge
                verdict={totalCount > 0 && safeCount / totalCount >= 0.7 ? 'LOW_OBSERVED_ANOMALY' : totalCount > 0 ? 'MODERATE_SINGLE_MODALITY_ANOMALY' : 'UNASSESSED_SPARSE_DATA'}
                label={totalCount > 0 && safeCount / totalCount >= 0.7 ? 'Healthy' : totalCount > 0 ? 'Review' : 'No Data'}
                size="sm"
              />
            </div>

            <div>
              <div className="text-2xl font-black text-[var(--ink)] font-heading tabular-nums font-mono">
                {totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 0}%
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5 leading-relaxed">
                {safeCount} of {totalCount} offerings verified safe across monitored marketplaces
              </p>
            </div>

            {/* Visual Progress Bar with 80% Retail Target Band & Benchmark Tick */}
            <div className="space-y-1.5">
              <div className="relative w-full h-3 rounded-full bg-[var(--heather)]/60 overflow-hidden p-0.5">
                {/* 80%+ Target Corridor highlight band */}
                <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-emerald-200/40 pointer-events-none" />

                <div
                  className="h-full rounded-full bg-[var(--ink)] transition-all duration-700"
                  style={{ width: `${totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 0}%` }}
                />

                {/* 80% Target Benchmark Tick */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)] pointer-events-none"
                  style={{ left: '80%' }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-3)]">
                <span>0%</span>
                <span className="text-[var(--accent)] font-bold">▲ 80% Benchmark</span>
                <span>100%</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[var(--text-3)] flex-wrap gap-1 pt-1 border-t border-[var(--line)]/40">
                <span className="text-[var(--ok-ink)] font-bold">✓ {safeCount} Safe</span>
                <span className="text-[var(--warn-ink)] font-bold">⚠ {cautionCount} Caution</span>
                <span className="text-[var(--bad-ink)] font-bold">✕ {flaggedCount} Flagged</span>
              </div>
            </div>
          </div>

          {/* 3. Dynamic Heatmap Calendar Card */}
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
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-[var(--text-3)] uppercase font-bold py-0.5">
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
                <div key={`empty-${i}`} className="h-6.5 w-6.5" />
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
                        'h-6.5 w-6.5 mx-auto rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all cursor-pointer relative',
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
            <div className="p-2 rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-center text-xs text-[var(--ink)] font-medium truncate flex items-center justify-between">
              <span className="text-[11px] truncate">
                <strong>{currentMonthName} {selectedDayFilter ?? todayDate}</strong>: {scanVolumeMap[selectedDayFilter ?? todayDate] ? `${scanVolumeMap[selectedDayFilter ?? todayDate]} scans recorded` : 'No scans on this day'}
              </span>
              {selectedDayFilter !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter(null)}
                  className="text-[10px] text-[var(--accent)] hover:underline font-bold shrink-0 ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
