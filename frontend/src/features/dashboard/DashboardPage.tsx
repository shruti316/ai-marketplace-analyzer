import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  ShoppingBag,
  Footprints,
  Package,
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
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

// Sample recent investigations with verified metadata
interface DashboardInvestigation {
  id: string;
  title: string;
  brand: string;
  marketplace: string;
  category: string;
  date: string;
  price: number;
  mrp: number;
  trustScore: number;
  verdict: 'Authentic' | 'Caution' | 'Flagged';
  verdictLabel: string;
  imageUrl?: string;
}

const RECENT_INVESTIGATIONS: DashboardInvestigation[] = [
  {
    id: 'amazon_in_B000052YQN',
    title: "PONDS Cold Cream Cleanser, 3.5 Oz.",
    brand: "POND'S",
    marketplace: 'Amazon India',
    category: 'Beauty & Skincare',
    date: 'Nov 20, 2026',
    price: 449,
    mrp: 599,
    trustScore: 88,
    verdict: 'Authentic',
    verdictLabel: 'Low Anomaly Risk',
    imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/41Dqm4X39EL._SS40_.jpg',
  },
  {
    id: 'flipkart_kotty_jacket',
    title: 'Kotty Full Sleeve Solid Women Bomber Jacket',
    brand: 'Kotty',
    marketplace: 'Flipkart',
    category: "Women's Apparel",
    date: 'Nov 19, 2026',
    price: 828,
    mrp: 2999,
    trustScore: 92,
    verdict: 'Authentic',
    verdictLabel: 'Corridor Match',
  },
  {
    id: 'alt_audio_1',
    title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
    brand: 'Sony',
    marketplace: 'Amazon India',
    category: 'Consumer Audio',
    date: 'Nov 18, 2026',
    price: 19990,
    mrp: 29990,
    trustScore: 96,
    verdict: 'Authentic',
    verdictLabel: 'Brand Flagship Match',
  },
  {
    id: 'amazon_in_B0000E3QL7',
    title: 'Olay Ultra Moisture Body Wash with Shea Butter',
    brand: 'Olay',
    marketplace: 'Amazon India',
    category: 'Personal Care',
    date: 'Nov 16, 2026',
    price: 849,
    mrp: 1199,
    trustScore: 64,
    verdict: 'Caution',
    verdictLabel: 'Seller Unrated',
  },
  {
    id: 'flipkart_tokyo_jacket',
    title: 'Tokyo Talkies Full Sleeve Puffer Jacket',
    brand: 'Tokyo Talkies',
    marketplace: 'Flipkart',
    category: "Women's Apparel",
    date: 'Nov 14, 2026',
    price: 999,
    mrp: 2799,
    trustScore: 87,
    verdict: 'Authentic',
    verdictLabel: 'Platform Fulfilled',
  },
  {
    id: 'sample_flagged_1',
    title: 'Luxury Designer Air Max Edition Sports Running Shoes',
    brand: 'Unbranded Import',
    marketplace: 'Myntra Third-Party',
    category: 'Footwear',
    date: 'Nov 12, 2026',
    price: 1199,
    mrp: 14999,
    trustScore: 38,
    verdict: 'Flagged',
    verdictLabel: 'Extreme Price Corridor Outlier',
  },
];

// Area chart activity data (Mon - Sun)
const WEEKLY_SCAN_ACTIVITY = [
  { day: 'Mon', scans: 4, verified: 3, flagged: 0 },
  { day: 'Tue', scans: 3, verified: 2, flagged: 1 },
  { day: 'Wed', scans: 6, verified: 4, flagged: 1 },
  { day: 'Thu', scans: 5, verified: 3, flagged: 0 },
  { day: 'Fri', scans: 8, verified: 6, flagged: 1 },
  { day: 'Sat', scans: 4, verified: 3, flagged: 0 },
  { day: 'Sun', scans: 3, verified: 2, flagged: 0 },
];

// Donut chart verdict distribution
const VERDICT_PIE_DATA = [
  { name: 'Verified Authentic', value: 16, percentage: 67, color: '#059669' },
  { name: 'Needs Double-Check', value: 5, percentage: 21, color: '#D97706' },
  { name: 'High Anomaly', value: 3, percentage: 12, color: '#E11D48' },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Interactive calendar active day
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(20);

  const filteredInvestigations = useMemo(() => {
    let list = [...RECENT_INVESTIGATIONS];
    if (filterVerdict === 'Verified') {
      list = list.filter((i) => i.verdict === 'Authentic');
    } else if (filterVerdict === 'Double-Check') {
      list = list.filter((i) => i.verdict === 'Caution');
    } else if (filterVerdict === 'Flagged') {
      list = list.filter((i) => i.verdict === 'Flagged');
    }

    if (sortBy === 'highest') {
      list.sort((a, b) => b.trustScore - a.trustScore);
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => a.trustScore - b.trustScore);
    }
    return list;
  }, [filterVerdict, sortBy]);

  // Calendar dates with scan indicators in November 2026
  const activeScanDates = [3, 6, 8, 12, 14, 16, 18, 19, 20];

  return (
    <div className="space-y-7 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* =========================================================================
          1. TOP GREETING & QUICK ACTION ROW
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16131F] font-heading">
            {greetingTime}, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-[#806C79] mt-1 font-medium">
            Here's an overview of your product investigations and trust checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#16131F] hover:bg-[#4A3F4B] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:translate-y-[-1px] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#F0D9E4]" />
          <span>+ New Investigation</span>
        </button>
      </div>

      {/* =========================================================================
          2. 4-COLUMN PASTEL KPI SUMMARY CARDS (Top Row)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Total Investigations */}
        <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] border-l-4 border-l-[#F0D9E4] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3 card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#806C79] font-bold tracking-wider">
              Total Investigations
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F0D9E4] text-[#16131F] border border-[#C1A0AC]/40 flex items-center justify-center">
              <ScanSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#16131F] font-heading tabular-nums font-mono">
            24
          </div>
          <p className="text-[11px] text-[#4A3F4B] leading-tight">
            <strong className="text-[#16131F] font-semibold">+4 scans</strong> this week · 100% multimodal coverage
          </p>
        </div>

        {/* KPI 2: Verified Authentic */}
        <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] border-l-4 border-l-[#A7F3D0] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3 card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#065F46] font-bold tracking-wider">
              Verified Authentic
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E6F4EA] text-[#065F46] border border-[#A7F3D0] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#065F46] font-heading tabular-nums font-mono">
            16
          </div>
          <p className="text-[11px] text-[#065F46] font-medium leading-tight">
            <strong>67% pass rate</strong> · Normal retail corridor & low risk
          </p>
        </div>

        {/* KPI 3: Needs Double-Check */}
        <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] border-l-4 border-l-[#FDE68A] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3 card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#92400E] font-bold tracking-wider">
              Needs Double-Check
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#92400E] font-heading tabular-nums font-mono">
            5
          </div>
          <p className="text-[11px] text-[#92400E] font-medium leading-tight">
            <strong>Corridor variance</strong> or seller history unrated
          </p>
        </div>

        {/* KPI 4: High Anomaly / Flagged */}
        <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] border-l-4 border-l-[#FECDD3] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3 card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#9F1239] font-bold tracking-wider">
              High Anomaly / Flagged
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FCE7F3] text-[#9F1239] border border-[#FECDD3] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#9F1239] font-heading tabular-nums font-mono">
            3
          </div>
          <p className="text-[11px] text-[#9F1239] font-medium leading-tight">
            <strong>Fake pricing traps</strong> or clone packaging detected
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
          <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-6 space-y-5">
            {/* Header with Title, Filter Tabs & Sort Dropdown */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[rgba(193,160,172,0.30)]">
              <div>
                <h2 className="text-lg font-bold text-[#16131F] font-heading">
                  Recent Investigations
                </h2>
                <p className="text-xs text-[#806C79] mt-0.5">
                  Verified product authenticity checks across monitored marketplaces
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                {/* Filter Pills */}
                <div className="flex items-center p-1 bg-[#F8EDF2] rounded-xl border border-[rgba(193,160,172,0.35)] shrink-0">
                  {(['All', 'Verified', 'Double-Check', 'Flagged'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterVerdict(tab)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                        filterVerdict === tab
                          ? 'bg-white text-[#16131F] shadow-xs'
                          : 'text-[#806C79] hover:text-[#16131F]'
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
                  className="px-2.5 py-1.5 rounded-xl border border-[rgba(193,160,172,0.35)] bg-white text-xs text-[#16131F] outline-none font-medium cursor-pointer shadow-xs shrink-0"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Score</option>
                  <option value="lowest">Lowest Score</option>
                </select>
              </div>
            </div>

            {/* Investigations List */}
            <div className="divide-y divide-[rgba(193,160,172,0.20)]">
              {filteredInvestigations.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/investigate/${item.id}`)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[#F8EDF2]/40 -mx-2 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0D9E4] border border-[#C1A0AC]/40 shrink-0 flex items-center justify-center p-2 overflow-hidden shadow-xs">
                      {item.category?.toLowerCase().includes('skin') || item.category?.toLowerCase().includes('beauty') ? (
                        <Sparkles className="w-5 h-5 text-[#16131F]" />
                      ) : item.category?.toLowerCase().includes('footwear') || item.category?.toLowerCase().includes('shoe') ? (
                        <Footprints className="w-5 h-5 text-[#16131F]" />
                      ) : item.category?.toLowerCase().includes('jacket') || item.category?.toLowerCase().includes('apparel') || item.category?.toLowerCase().includes('dress') ? (
                        <ShoppingBag className="w-5 h-5 text-[#16131F]" />
                      ) : (
                        <Package className="w-5 h-5 text-[#16131F]" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#806C79]">
                          {item.brand}
                        </span>
                        <span className="text-xs text-[#C1A0AC]">•</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F8EDF2] text-[#4A3F4B] border border-[rgba(193,160,172,0.35)]">
                          {item.marketplace}
                        </span>
                        <span className="text-xs text-[#C1A0AC] hidden md:inline">•</span>
                        <span className="text-[11px] text-[#806C79] hidden md:inline">
                          {item.category}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-[#16131F] group-hover:text-[#16131F] transition-colors truncate">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-2 text-[11px] text-[#806C79]">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#16131F]">₹{item.price.toLocaleString('en-IN')}</span>
                        {item.mrp > item.price && (
                          <span className="line-through text-[#806C79] text-[10px]">
                            ₹{item.mrp.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Trust Score Badge */}
                    <div className="text-right">
                      <div
                        className={cn(
                          'text-sm font-black font-heading',
                          item.trustScore >= 80
                            ? 'text-[#065F46]'
                            : item.trustScore >= 60
                            ? 'text-[#92400E]'
                            : 'text-[#9F1239]'
                        )}
                      >
                        {item.trustScore}/100
                      </div>
                      <span className="text-[9px] font-mono text-[#806C79] uppercase block">
                        Trust Score
                      </span>
                    </div>

                    {/* Verdict Pill */}
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full border',
                        item.verdict === 'Authentic'
                          ? 'bg-[#E6F4EA] text-[#065F46] border-[#A7F3D0]'
                          : item.verdict === 'Caution'
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                          : 'bg-[#FCE7F3] text-[#9F1239] border-[#FECDD3]'
                      )}
                    >
                      {item.verdict}
                    </span>

                    <ChevronRight className="w-4 h-4 text-[#806C79] group-hover:text-[#16131F] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer view all link */}
            <div className="pt-2 text-center border-t border-[rgba(193,160,172,0.20)]">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16131F] hover:text-[#4A3F4B] transition-colors"
              >
                <span>View all 24 investigations in history</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Bottom Two-Column Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Chart: Investigations Overview */}
            <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#16131F] font-heading flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#16131F]" />
                  <span>Investigations Overview</span>
                </h3>
                <p className="text-[11px] text-[#806C79] mt-0.5">
                  Weekly scan volume & multimodal anomaly activity
                </p>
              </div>

              <div className="h-48 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WEEKLY_SCAN_ACTIVITY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F0D9E4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(193, 160, 172, 0.25)" />
                    <XAxis dataKey="day" tick={{ fill: '#806C79', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#806C79', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: 'rgba(193, 160, 172, 0.40)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#16131F',
                        boxShadow: '0 8px 24px rgba(22, 19, 31, 0.08)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="scans"
                      name="Total Scans"
                      stroke="#16131F"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scanGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="verified"
                      name="Verified Safe"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Chart: Verdicts by Risk Level */}
            <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#16131F] font-heading flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#065F46]" />
                  <span>Verdicts by Risk Level</span>
                </h3>
                <p className="text-[11px] text-[#806C79] mt-0.5">
                  Cumulative distribution across active modalities
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
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {VERDICT_PIE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-extrabold text-[#16131F] font-heading leading-tight">
                      24
                    </span>
                    <span className="text-[9px] font-mono text-[#806C79] uppercase">
                      Scans
                    </span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-2 text-xs">
                  {VERDICT_PIE_DATA.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[#4A3F4B] text-[11px] truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-[#16131F] text-[11px]">
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
            RIGHT SIDEBAR UTILITY COLUMN (4 cols): Calendar, Pass Rate & Watchlist
           ======================================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Investigation Calendar Card */}
          <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(193,160,172,0.25)]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#16131F]" />
                <h3 className="text-sm font-bold text-[#16131F] font-heading">
                  Investigation Calendar
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#806C79]">
                November 2026
              </span>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-[#806C79] uppercase font-bold py-1">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>

            {/* Days grid for November 2026 (Nov 1 is Sunday) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* 6 Empty padding cells for Mon-Sat before Nov 1 */}
              {[...Array(6)].map((_, i) => (
                <div key={`empty-${i}`} className="h-7 w-7" />
              ))}

              {/* 30 Days of Nov */}
              {[...Array(30)].map((_, i) => {
                const day = i + 1;
                const hasScan = activeScanDates.includes(day);
                const isSelected = selectedCalendarDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedCalendarDay(day)}
                    className={cn(
                      'h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer relative',
                      isSelected
                        ? 'bg-[#16131F] text-white shadow-xs'
                        : hasScan
                        ? 'bg-[#F0D9E4] text-[#16131F] font-bold hover:bg-[#C1A0AC]/40'
                        : 'text-[#4A3F4B] hover:bg-[#F8EDF2]'
                    )}
                  >
                    <span>{day}</span>
                    {hasScan && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#16131F]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day activity pill */}
            <div className="p-2.5 rounded-xl bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] text-center text-xs text-[#16131F] font-medium mt-1 truncate">
              <strong>Nov {selectedCalendarDay}</strong> · {activeScanDates.includes(selectedCalendarDay) ? '3 Investigations run' : 'No investigations run'}
            </div>
          </div>

          {/* 2. Authenticity Pass Rate Card (Overall Trust Rate) */}
          <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#065F46]" />
                <h3 className="text-sm font-bold text-[#16131F] font-heading">
                  Overall Trust Rate
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#065F46] border border-[#A7F3D0] font-bold">
                Healthy Corridor
              </span>
            </div>

            <div>
              <div className="text-3xl font-black text-[#16131F] font-heading tabular-nums font-mono">
                67%
              </div>
              <p className="text-xs text-[#806C79] mt-0.5 leading-relaxed">
                16 of 24 offerings verified safe across Amazon India, Flipkart, and Myntra
              </p>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-[#F0D9E4] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#16131F] transition-all duration-500"
                  style={{ width: '67%' }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[#806C79] flex-wrap gap-1">
                <span className="text-[#065F46]">✓ 16 Safe</span>
                <span className="text-[#92400E]">⚠ 5 Caution</span>
                <span className="text-[#9F1239]">✕ 3 Flagged</span>
              </div>
            </div>
          </div>

          {/* 3. Watchlist / Saved Price Alerts Card */}
          <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(193,160,172,0.25)]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#16131F]" />
                <h3 className="text-sm font-bold text-[#16131F] font-heading">
                  Watchlist & Price Alerts
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#806C79]">
                3 Tracked
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="p-3 rounded-xl bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#16131F] truncate">
                    Sony WH-1000XM4 Noise Cancelling
                  </div>
                  <div className="text-[10px] text-[#806C79] font-mono mt-0.5">
                    Amazon.in · Observed: <strong className="text-[#16131F]">₹19,990</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#065F46] border border-[#A7F3D0] shrink-0">
                  In Corridor
                </span>
              </div>

              {/* Item 2 */}
              <div className="p-3 rounded-xl bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#16131F] truncate">
                    Kotty Full Sleeve Bomber Jacket
                  </div>
                  <div className="text-[10px] text-[#806C79] font-mono mt-0.5">
                    Flipkart · Observed: <strong className="text-[#16131F]">₹699</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F0D9E4] text-[#16131F] border border-[#C1A0AC]/40 shrink-0">
                  Great Deal
                </span>
              </div>

              {/* Item 3 */}
              <div className="p-3 rounded-xl bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#16131F] truncate">
                    Pond's Cold Cream Cleanser 3.5 Oz
                  </div>
                  <div className="text-[10px] text-[#806C79] font-mono mt-0.5">
                    Amazon.in · Observed: <strong className="text-[#16131F]">₹449</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EDE9FE] text-[#7C5DFA] border border-[#DDD6FE] shrink-0">
                  Monitored
                </span>
              </div>
            </div>

            {/* Footer link */}
            <div className="pt-1 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16131F] hover:text-[#4A3F4B] transition-colors"
              >
                <span>View all investigations</span>
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
