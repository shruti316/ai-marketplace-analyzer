import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { investigateService, UrlResolutionResult } from '../../services/investigateService';

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
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolutionResult, setResolutionResult] = useState<UrlResolutionResult | null>(null);
  const navigate = useNavigate();

  const analyzeUrl = (inputUrl: string) => {
    setUrl(inputUrl);
    setValidationError(null);
    setResolutionResult(null);

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

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsResolving(true);
    setValidationError(null);

    try {
      const result = await investigateService.resolveMarketplaceUrl(url.trim());
      setResolutionResult(result);

      if (onInvestigateUrl && result.canonical_product_id) {
        onInvestigateUrl(url, result.recognized_platform || '', result.canonical_product_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'URL resolution failed.';
      setValidationError(msg);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleResolve} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Globe className="w-5 h-5" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => analyzeUrl(e.target.value)}
            placeholder="Paste marketplace product link (e.g., https://www.amazon.in/dp/B000052YQN)..."
            className="w-full pl-11 pr-24 py-3 rounded-xl border border-[#BAC7CA] focus:border-[#3D7584] focus:ring-2 focus:ring-[#3D7584]/20 outline-none text-sm text-[#0D1B2A] placeholder:text-slate-400 transition-all bg-white"
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute inset-y-1.5 right-1.5 px-3 rounded-lg text-xs font-medium text-[#3D7584] hover:bg-[#EBF2F4] transition-colors"
          >
            Paste
          </button>
        </div>

        {/* Real-time Detected Platform Indicator */}
        {detectedPlatform && !validationError && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Detected Platform:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${detectedPlatform.badgeClass}`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: detectedPlatform.iconColor }} />
              {detectedPlatform.name}
              {detectedPlatform.detectedId && (
                <span className="font-mono text-[11px] opacity-80">
                  ({detectedPlatform.idType}: {detectedPlatform.detectedId})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p>{validationError}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!url.trim() || isResolving}
            isLoading={isResolving}
            leftIcon={<Search className="w-4 h-4" />}
          >
            {isResolving ? 'Resolving Catalog...' : 'Resolve & Investigate Listing'}
          </Button>
        </div>
      </form>

      {/* Resolution Results Card */}
      {resolutionResult && (
        <div className="p-6 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-4 animate-fadeIn">
          {resolutionResult.catalogue_match && resolutionResult.product ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-[#0D1B2A]">
                    Catalog Match Confirmed
                  </span>
                </div>
                <Badge variant="risk-low" size="sm">
                  Indexed in Platform Catalog
                </Badge>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8EFF1] space-y-2">
                <p className="text-sm font-semibold text-[#0D1B2A]">
                  {resolutionResult.product.title}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span><strong>Brand:</strong> {resolutionResult.product.brand_id}</span>
                  <span>•</span>
                  <span><strong>Category:</strong> {resolutionResult.product.category}</span>
                  {resolutionResult.product.observed_price_inr && (
                    <>
                      <span>•</span>
                      <span><strong>Observed Price:</strong> ₹{resolutionResult.product.observed_price_inr}</span>
                    </>
                  )}
                  {resolutionResult.product.mrp_inr && (
                    <>
                      <span>•</span>
                      <span><strong>MRP:</strong> ₹{resolutionResult.product.mrp_inr}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  Canonical ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{resolutionResult.canonical_product_id}</code>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/investigate/${encodeURIComponent(resolutionResult.canonical_product_id!)}`)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Open Full Investigation
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-[#0D1B2A]">
                  Unmatched Listing ({resolutionResult.recognized_platform || 'Marketplace'})
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {resolutionResult.message || 'Product identifier not indexed in current dataset.'}
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                You can still analyze this product using the <strong>Manual Details</strong> tab or upload packaging photos in the <strong>Image Upload</strong> tab.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
