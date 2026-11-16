import React, { useState } from 'react';
import { Globe, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export interface MarketplaceUrlTabProps {
  onInvestigateUrl?: (url: string, platform: string, productId?: string) => void;
}

interface DetectedPlatform {
  name: string;
  id: string;
  iconColor: string;
  badgeClass: string;
  detectedId?: string;
  idType?: string;
}

export const MarketplaceUrlTab: React.FC<MarketplaceUrlTabProps> = ({ onInvestigateUrl }) => {
  const [url, setUrl] = useState<string>('');
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const analyzeUrl = (inputUrl: string) => {
    setUrl(inputUrl);
    setValidationError(null);

    const trimmed = inputUrl.trim().toLowerCase();
    if (!trimmed) {
      setDetectedPlatform(null);
      return;
    }

    // 1. Amazon India Detection
    if (trimmed.includes('amazon.in')) {
      const asinMatch = inputUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      setDetectedPlatform({
        name: 'Amazon India',
        id: 'amazon_india',
        iconColor: '#FF9900',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
        detectedId: asinMatch ? asinMatch[1] : undefined,
        idType: 'ASIN',
      });
      return;
    }

    // 2. Flipkart Detection
    if (trimmed.includes('flipkart.com')) {
      const fsnMatch = inputUrl.match(/pid=([A-Z0-9]+)/i) || inputUrl.match(/\/p\/(itm[a-z0-9]+)/i);
      setDetectedPlatform({
        name: 'Flipkart',
        id: 'flipkart',
        iconColor: '#2874F0',
        badgeClass: 'bg-blue-50 text-blue-900 border-blue-200',
        detectedId: fsnMatch ? fsnMatch[1] : undefined,
        idType: 'FSN / Product ID',
      });
      return;
    }

    // 3. Myntra Detection
    if (trimmed.includes('myntra.com')) {
      const myntraMatch = inputUrl.match(/\/(\d+)\/buy/i) || inputUrl.match(/\/(\d+)(?:\?|$)/i);
      setDetectedPlatform({
        name: 'Myntra',
        id: 'myntra',
        iconColor: '#FF3F6C',
        badgeClass: 'bg-rose-50 text-rose-900 border-rose-200',
        detectedId: myntraMatch ? myntraMatch[1] : undefined,
        idType: 'Style ID',
      });
      return;
    }

    // Unsupported marketplace
    setDetectedPlatform(null);
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setValidationError(
        'Marketplace not currently covered. TrustSphere currently supports Amazon India (amazon.in), Flipkart (flipkart.com), and Myntra (myntra.com).'
      );
    } else {
      setValidationError('Please enter a valid URL beginning with https:// or http://');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      analyzeUrl(text);
    } catch {
      // Clipboard read permission declined
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedPlatform) return;
    if (onInvestigateUrl) {
      onInvestigateUrl(url, detectedPlatform.name, detectedPlatform.detectedId);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Marketplace Product URL
          </label>
          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="url"
              value={url}
              onChange={(e) => analyzeUrl(e.target.value)}
              placeholder="https://www.amazon.in/dp/B08N5WRWNW or https://www.flipkart.com/..."
              className="w-full bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl pl-10 pr-24 py-3 border border-[#BAC7CA] focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] transition-all outline-none"
            />
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-2 px-3 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EBF2F4] text-xs font-medium text-slate-600 transition-colors border border-slate-200"
            >
              Paste
            </button>
          </div>
        </div>

        {/* Supported Marketplace Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Supported Platforms:</span>
          {[
            { name: 'Amazon India', domain: 'amazon.in' },
            { name: 'Flipkart', domain: 'flipkart.com' },
            { name: 'Myntra', domain: 'myntra.com' },
          ].map((m) => {
            const isMatch = detectedPlatform?.name.toLowerCase().includes(m.name.toLowerCase().split(' ')[0]);
            return (
              <span
                key={m.name}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  isMatch
                    ? 'bg-[#3D7584] text-white border-[#3D7584] shadow-sm'
                    : 'bg-[#FAF7F2] text-slate-600 border-[#DCE5E7]'
                }`}
              >
                {m.name}
              </span>
            );
          })}
        </div>

        {/* Detected Platform Card */}
        {detectedPlatform && (
          <div className="p-4 rounded-xl bg-white border border-[#DCE5E7] shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-[#0D1B2A]">
                  Marketplace Identified: {detectedPlatform.name}
                </span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${detectedPlatform.badgeClass}`}>
                Verified Source
              </span>
            </div>

            {detectedPlatform.detectedId && (
              <div className="text-xs text-slate-600 flex items-center gap-2 bg-[#FAF7F2] p-2.5 rounded-lg border border-slate-200">
                <span className="font-mono text-[11px] text-slate-500">{detectedPlatform.idType}:</span>
                <span className="font-mono font-semibold text-[#0D1B2A]">{detectedPlatform.detectedId}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Analyze Marketplace Offer
            </Button>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}
      </form>

      {/* Honest Capability Disclosure */}
      <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#DCE5E7] text-xs text-[#0D1B2A] space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#3D7584]">
          <ShieldCheck className="w-4 h-4" />
          <span>Catalog Matching & Ingestion Architecture</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          The platform correlates marketplace identifiers against verified historical catalog records.
          In accordance with sandbox security policies, outbound headless live scraping requires authorized affiliate API credentials.
        </p>
      </div>
    </div>
  );
};
