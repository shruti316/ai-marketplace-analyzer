import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Camera,
  UploadCloud,
  X,
  AlertTriangle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Edit3,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { investigateService, ProductIntelligenceReport } from '../../services/investigateService';

export interface MarketplaceUrlTabProps {
  onInvestigateUrl?: (url: string, platform: string, productId?: string) => void;
  onSwitchToManual?: (prefill?: any) => void;
}

interface DetectedPlatform {
  name: string;
  id: string;
  iconColor: string;
  detectedId?: string;
  idType?: string;
}

interface ExtractedPreviewState {
  title: string;
  brand: string;
  category: string;
  observedPrice: string;
  mrp: string;
  platformName: string;
  identifier: string;
  imageUrl?: string;
  isCatalogMatch: boolean;
  provenance: string;
}

const ANALYSIS_STAGES = [
  'Validating listing URL & checking website legitimacy...',
  'Retrieving public listing data & extracting specifications...',
  'Evaluating seller governance & pricing corridors...',
  'Analyzing customer reviews & aspect sentiment (NLP ABSA)...',
  'Searching verified comparable alternatives...',
  'Synthesizing multimodal evidence & buying recommendation...',
];

export const MarketplaceUrlTab: React.FC<MarketplaceUrlTabProps> = () => {
  const [url, setUrl] = useState<string>('');
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExtractingPreview, setIsExtractingPreview] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStageIndex, setAnalysisStageIndex] = useState<number>(0);

  // Editable Preview State
  const [preview, setPreview] = useState<ExtractedPreviewState | null>(null);

  // Optional image attachment state
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  // Progress stage cycler during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnalyzing) {
      setAnalysisStageIndex(0);
      interval = setInterval(() => {
        setAnalysisStageIndex((prev) => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setAnalysisStageIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  const analyzeUrl = (inputUrl: string) => {
    setUrl(inputUrl);
    setValidationError(null);
    setPreview(null);

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
        detectedId: myntraMatch ? myntraMatch[1] : undefined,
        idType: 'Style ID',
      });
      return;
    }

    // 4. Sonata Brand Store Detection
    if (trimmed.includes('sonatawatches.in')) {
      const sonataMatch = inputUrl.match(/(?:[-_/])([a-z0-9]{8,15})\.html/i) || inputUrl.match(/([a-z0-9]{8,15})$/i);
      setDetectedPlatform({
        name: 'Sonata Official Store (Titan)',
        id: 'sonata',
        iconColor: '#0D9488',
        detectedId: sonataMatch ? sonataMatch[1].toUpperCase() : undefined,
        idType: 'Model / SKU',
      });
      return;
    }

    // 5. Decathlon Detection
    if (trimmed.includes('decathlon.in')) {
      const decMatch = inputUrl.match(/\/p\/([0-9]+)/i);
      setDetectedPlatform({
        name: 'Decathlon India',
        id: 'decathlon',
        iconColor: '#0082C3',
        detectedId: decMatch ? decMatch[1] : undefined,
        idType: 'Item Code',
      });
      return;
    }

    // 6. Croma Detection
    if (trimmed.includes('croma.com')) {
      const cromaMatch = inputUrl.match(/\/p\/([0-9]+)/i);
      setDetectedPlatform({
        name: 'Croma',
        id: 'croma',
        iconColor: '#128085',
        detectedId: cromaMatch ? cromaMatch[1] : undefined,
        idType: 'SKU',
      });
      return;
    }

    // 7. Adidas Detection
    if (trimmed.includes('adidas.co.in') || trimmed.includes('adidas.com')) {
      const adiMatch = inputUrl.match(/\/([A-Z0-9]{5,8})\.html/i) || inputUrl.match(/\/p\/([A-Z0-9]{5,8})/i);
      setDetectedPlatform({
        name: 'Adidas India',
        id: 'adidas',
        iconColor: '#000000',
        detectedId: adiMatch ? adiMatch[1].toUpperCase() : undefined,
        idType: 'Article Number',
      });
      return;
    }

    // 8. Nykaa Detection
    if (trimmed.includes('nykaa.com') || trimmed.includes('nykaa.in')) {
      const nykaaMatch = inputUrl.match(/\/p\/([0-9]+)/i);
      setDetectedPlatform({
        name: 'Nykaa',
        id: 'nykaa',
        iconColor: '#FC2779',
        detectedId: nykaaMatch ? nykaaMatch[1] : undefined,
        idType: 'Product ID',
      });
      return;
    }

    // 9. Verified Webstore / Other Brand Store Detection
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      let hostname = '';
      try {
        hostname = new URL(inputUrl).hostname;
      } catch {
        hostname = 'Retail Webstore';
      }
      setDetectedPlatform({
        name: hostname.replace(/^www\./, ''),
        id: 'verified_webstore',
        iconColor: '#6366F1',
        idType: 'Listing Identifier',
      });
      return;
    }

    setDetectedPlatform(null);
    setValidationError('Please enter a valid URL beginning with https:// or http://');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      analyzeUrl(text);
    } catch {
      // Clipboard read permission declined
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setValidationError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('Image size must be under 10MB.');
      return;
    }

    setValidationError(null);
    setAttachedImageName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setAttachedImageBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAttachedImageBase64(null);
    setAttachedImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Step 1: Extract Listing Details for Editable Preview
  const handleExtractPreview = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please paste or type a valid marketplace product URL.');
      return;
    }

    setIsExtractingPreview(true);
    setValidationError(null);

    try {
      const res = await investigateService.resolveMarketplaceUrl(trimmed);
      const isCatalog = res.catalogue_match && !!res.product;

      const title = isCatalog
        ? res.product?.title || ''
        : (res as any).suggested_title || 'Extracted Marketplace Product';

      const brand = isCatalog
        ? res.product?.brand_id?.replace(/^BRAND_\d+_/, '')?.replace(/_/g, ' ') || 'Recognized Brand'
        : (res as any).suggested_brand || '';

      const category = isCatalog
        ? res.product?.category || 'Standard Category'
        : (res as any).suggested_category || '';

      const price = isCatalog
        ? String(res.product?.observed_price_inr || '')
        : ((res as any).suggested_price ? String((res as any).suggested_price) : '');

      const mrp = isCatalog
        ? String(res.product?.mrp_inr || '')
        : ((res as any).suggested_mrp ? String((res as any).suggested_mrp) : '');

      const platform = res.recognized_platform || detectedPlatform?.name || 'Marketplace';
      const identifier = res.extracted_identifier || detectedPlatform?.detectedId || '';
      const imageUrl = (res as any).main_image_url || undefined;
      const provenance = (res as any).provenance || (isCatalog ? 'CATALOG_INDEXED' : 'LIVE_PAGE_EXTRACTION');

      setPreview({
        title,
        brand,
        category,
        observedPrice: price,
        mrp: mrp,
        platformName: platform,
        identifier,
        imageUrl,
        isCatalogMatch: isCatalog,
        provenance,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract listing metadata.';
      setValidationError(msg);
    } finally {
      setIsExtractingPreview(false);
    }
  };

  // Step 2: Trigger Full Multimodal AI Investigation Pipeline
  const handleProceedWithInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please paste or type a valid marketplace product URL.');
      return;
    }

    setIsAnalyzing(true);
    setValidationError(null);

    try {
      const payload: any = {
        url: trimmed,
        image_base64: attachedImageBase64 || undefined,
      };

      if (preview) {
        if (preview.title) payload.product_title = preview.title;
        if (preview.brand) payload.brand = preview.brand;
        if (preview.category) payload.category = preview.category;
        if (preview.observedPrice) payload.observed_price_inr = Number(preview.observedPrice);
        if (preview.mrp) payload.mrp_inr = Number(preview.mrp);
      }

      const report: ProductIntelligenceReport = await investigateService.runPipeline(payload);

      // Navigate directly to the full 9-section report view
      navigate(`/investigate/${encodeURIComponent(report.investigation_id)}`, {
        state: { report },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Automated product investigation failed.';
      setValidationError(msg);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. URL Input Bar */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[var(--ink)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Product Listing URL</span>
          </span>
          <span className="text-[11px] font-mono text-[var(--text-3)]">
            Supported: Amazon.in · Flipkart · Myntra
          </span>
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-3)]">
            <Globe className="w-5 h-5 text-[var(--accent)]/80" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => analyzeUrl(e.target.value)}
            disabled={isAnalyzing || isExtractingPreview}
            placeholder="Paste marketplace product link (e.g. https://www.flipkart.com/... or https://www.amazon.in/dp/...)"
            className="w-full pl-11 pr-24 py-3.5 rounded-xl border border-[var(--line)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none text-sm text-[var(--ink)] placeholder:text-[var(--text-3)] transition-all bg-[var(--canvas)]/40"
          />
          <button
            type="button"
            onClick={handlePaste}
            disabled={isAnalyzing || isExtractingPreview}
            className="absolute inset-y-2 right-2 px-3 rounded-lg text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hi)] hover:bg-white transition-colors cursor-pointer"
          >
            Paste
          </button>
        </div>
      </div>

      {/* 2. Detected Marketplace Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {detectedPlatform ? (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-3)] font-medium">Platform:</span>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: detectedPlatform.iconColor }} />
              <span>{detectedPlatform.name}</span>
              {detectedPlatform.detectedId && (
                <span className="font-mono text-[11px] text-[var(--text-3)]">
                  ({detectedPlatform.idType}: {detectedPlatform.detectedId})
                </span>
              )}
            </span>
            <span className="text-[var(--ok-ink)] font-medium flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)]" /> Ready for Automated Ingestion
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--text-3)]">
            <span>Surveillance coverage:</span>
            <span className="px-2 py-0.5 rounded bg-white border border-[var(--line)] text-[var(--text-3)] text-[11px]">
              Amazon India
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-[var(--line)] text-[var(--text-3)] text-[11px]">
              Flipkart
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-[var(--line)] text-[var(--text-3)] text-[11px]">
              Myntra
            </span>
          </div>
        )}

        {!preview && url.trim().length > 10 && (
          <button
            type="button"
            onClick={handleExtractPreview}
            disabled={isExtractingPreview || isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent)] bg-[var(--heather)]/40 hover:bg-[var(--heather)]/70 border border-[var(--line)] transition-all cursor-pointer"
          >
            {isExtractingPreview ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting Listing Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Auto-Extract & Preview Details</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. EDITABLE PRODUCT PREVIEW CARD (When details extracted) */}
      {preview && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--line)] space-y-4 animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--heather)] text-[var(--accent)]">
                <Edit3 className="w-4 h-4 text-[var(--accent)]" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)] font-heading">
                  Editable Product Preview
                </h3>
                <p className="text-[11px] text-[var(--text-3)]">
                  Review or adjust extracted details before launching the full AI investigation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-[var(--ok-bg)] border border-[var(--ok)]/30 text-[var(--ok-ink)] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[var(--ok)]" /> Extracted Successfully
              </span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="p-1 rounded-md text-[var(--text-3)] hover:text-[var(--ink)] hover:bg-[var(--canvas)] transition-colors cursor-pointer"
                title="Clear preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Product Image preview column */}
            <div className="md:col-span-1 space-y-2">
              <div className="h-40 rounded-xl bg-[var(--canvas)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
                {preview.imageUrl ? (
                  <img
                    src={preview.imageUrl}
                    alt={preview.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 space-y-1 text-[var(--text-3)]">
                    <ShoppingBag className="w-8 h-8 mx-auto text-[var(--text-3)]" />
                    <span className="text-[10px] font-mono block">Product Visual</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-[var(--heather)] border border-white/10">
                  {preview.platformName}
                </div>
              </div>
              {preview.identifier && (
                <div className="text-center text-[10px] font-mono text-[var(--text-3)]">
                  ID: <span className="text-[var(--accent)]">{preview.identifier}</span>
                </div>
              )}
            </div>

            {/* Editable Fields Column */}
            <div className="md:col-span-3 space-y-3">
              {/* Product Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1 font-mono">
                  <Tag className="w-3 h-3 text-[var(--accent)]" /> Product Title
                </label>
                <input
                  type="text"
                  value={preview.title}
                  onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--line)] focus:border-[var(--accent)] outline-none text-xs text-[var(--ink)] font-medium"
                  placeholder="Product Title"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Brand */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-2)] font-mono">Brand Name</label>
                  <input
                    type="text"
                    value={preview.brand}
                    onChange={(e) => setPreview({ ...preview, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--line)] focus:border-[var(--accent)] outline-none text-xs text-[var(--ink)]"
                    placeholder="Brand"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-2)] font-mono">Product Category</label>
                  <input
                    type="text"
                    value={preview.category}
                    onChange={(e) => setPreview({ ...preview, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--line)] focus:border-[var(--accent)] outline-none text-xs text-[var(--ink)]"
                    placeholder="Category"
                  />
                </div>

                {/* Observed Selling Price */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-2)] font-mono">Current Selling Price (₹)</label>
                  <input
                    type="number"
                    value={preview.observedPrice}
                    onChange={(e) => setPreview({ ...preview, observedPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--line)] focus:border-[var(--accent)] outline-none text-xs text-[var(--ink)] font-semibold"
                    placeholder="e.g. 828"
                  />
                </div>

                {/* Claimed MRP */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-2)] font-mono">Original MRP (₹)</label>
                  <input
                    type="number"
                    value={preview.mrp}
                    onChange={(e) => setPreview({ ...preview, mrp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--line)] focus:border-[var(--accent)] outline-none text-xs text-[var(--ink)]"
                    placeholder="e.g. 2999"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Optional Packaging / Product Image Attachment */}
      <div className="p-4 rounded-2xl bg-white border border-[var(--line)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--ink)]">
              Packaging / Product Photo (Optional)
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-3)]">
            Enables Physical OCR & Statutory Verification
          </span>
        </div>

        {attachedImageBase64 ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--canvas)]/40 border border-[var(--line)]">
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src={attachedImageBase64}
                alt="Packaging preview"
                className="h-10 w-10 rounded-lg object-cover border border-[var(--line)]"
              />
              <div className="truncate">
                <p className="text-xs font-medium text-[var(--ink)] truncate">{attachedImageName}</p>
                <p className="text-[10px] text-[var(--ok-ink)] font-medium">Ready for OCR & Image Quality Analysis</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={isAnalyzing}
              className="p-1 rounded-lg text-[var(--text-3)] hover:text-[var(--bad)] hover:bg-[var(--bad-bg)] transition-colors cursor-pointer"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelected(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-3.5 rounded-xl border border-dashed transition-all cursor-pointer flex items-center justify-center gap-3 text-xs ${
              isDragging
                ? 'border-[var(--accent)] bg-[var(--heather)]/20 text-[var(--accent)]'
                : 'border-[var(--line)] hover:border-[var(--accent)] bg-white text-[var(--text-3)] hover:text-[var(--ink)]'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-[var(--accent)]" />
            <span>
              Drop packaging photo here, or <strong className="text-[var(--accent)] underline">browse</strong> (PNG, JPG up to 10MB)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 5. Validation Error Alert */}
      {validationError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--warn-bg)] border border-[var(--warn)]/30 text-[var(--warn-ink)] text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--warn)]" />
          <p className="leading-relaxed">{validationError}</p>
        </div>
      )}

      {/* 6. Live Multi-Stage Progress Banner */}
      {isAnalyzing && (
        <div className="p-4 rounded-2xl bg-[var(--heather)]/30 border border-[var(--line)] text-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-[var(--accent)] font-semibold">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
              <span>Running Automated Investigation Pipeline</span>
            </span>
            <span className="font-mono text-[11px]">
              Stage {analysisStageIndex + 1} of {ANALYSIS_STAGES.length}
            </span>
          </div>
          <p className="text-[var(--text-2)] text-[11px] font-mono leading-relaxed pl-6">
            {ANALYSIS_STAGES[analysisStageIndex]}
          </p>
          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-[var(--line)]">
            <div
              className="bg-[var(--accent)] h-full transition-all duration-500"
              style={{ width: `${((analysisStageIndex + 1) / ANALYSIS_STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 7. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-[var(--text-3)]">
          {preview ? (
            <span>Details confirmed. Proceed to generate the 9-section report.</span>
          ) : (
            <span>Ready for deep verification across pricing, reviews, seller credibility and OCR.</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!preview && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={!url.trim() || isExtractingPreview || isAnalyzing}
              onClick={handleExtractPreview}
              isLoading={isExtractingPreview}
              rightIcon={<Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />}
              className="w-full sm:w-auto"
            >
              Preview & Edit Details
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!url.trim() || isAnalyzing || isExtractingPreview}
            onClick={() => handleProceedWithInvestigation()}
            isLoading={isAnalyzing}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto bg-[#16131F] hover:bg-[#252033] text-white font-semibold shadow-xs min-h-[42px]"
          >
            {isAnalyzing
              ? 'Conducting Deep Investigation...'
              : preview
              ? 'Proceed with Full AI Investigation'
              : 'Analyze Product Listing'}
          </Button>
        </div>
      </div>
    </div>
  );
};
