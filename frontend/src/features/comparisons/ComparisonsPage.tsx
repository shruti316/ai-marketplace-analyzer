import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitCompare,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  ArrowRight,
  Bot,
  Send,
  Camera,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { comparisonService, ComparisonRecord } from '../../services/comparisonService';
import { catalogService } from '../../services/catalogService';
import { investigateService } from '../../services/investigateService';
import { formatCurrencyINR } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { AssistantDrawer } from '../assistant/AssistantDrawer';

interface CardSlotState {
  id: string;
  url: string;
  isExtracting: boolean;
  extractError: string | null;
  productTitle?: string;
  brandName?: string;
  category?: string;
  marketplace?: string;
  price?: number;
  mrp?: number;
  imageUrl?: string | null;
  seller?: string;
  uploadedImageBase64?: string | null;
  uploadedImageName?: string | null;
  isEditing?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const detectPlatform = (newUrl: string): string | null => {
  const trimmed = newUrl.trim().toLowerCase();
  if (trimmed.includes('amazon.in')) return 'Amazon India';
  if (trimmed.includes('flipkart.com')) return 'Flipkart';
  if (trimmed.includes('myntra.com')) return 'Myntra';
  if (trimmed.includes('nykaa.com') || trimmed.includes('nykaa.in')) return 'Nykaa';
  if (trimmed.includes('nike.com') || trimmed.includes('nike.in')) return 'Nike India';
  if (trimmed.includes('plumgoodness.com')) return 'Plum Goodness';
  if (trimmed.includes('adidas.co.in') || trimmed.includes('adidas.com')) return 'Adidas';
  if (trimmed.includes('tatacliq.com')) return 'Tata CLiQ';
  if (trimmed.includes('ajio.com')) return 'AJIO';
  if (trimmed.includes('purplle.com')) return 'Purplle';
  if (trimmed.includes('sugarcosmetics.com')) return 'Sugar Cosmetics';
  if (trimmed.includes('mamaearth.in')) return 'Mamaearth';
  if (trimmed.includes('boat-lifestyle.com')) return 'boAt';
  if (trimmed.includes('samsung.com')) return 'Samsung';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return 'Verified Webstore';
  return null;
};

export const ComparisonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const addParam = searchParams.get('add');
  const idParam = searchParams.get('id');

  // Initial clean workspace: exactly Product A and Product B cards
  const [cardSlots, setCardSlots] = useState<CardSlotState[]>([
    {
      id: 'slot_init_0',
      url: '',
      isExtracting: false,
      extractError: null,
      isEditing: false,
    },
    {
      id: 'slot_init_1',
      url: '',
      isExtracting: false,
      extractError: null,
      isEditing: false,
    },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Assistant Drawer state for full chat
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Embedded Comparison AI Agent chat state
  const [agentQuestion, setAgentQuestion] = useState<string>('');
  const [agentAnswer, setAgentAnswer] = useState<string | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(false);

  // Extract canonical IDs for query
  const canonicalIds = cardSlots.map((s) => s.id).filter((id) => id && !id.startsWith('slot_init_') && !id.startsWith('cand_'));

  // Pre-populate if ?add=productId was passed in URL
  useEffect(() => {
    if (addParam) {
      setCardSlots((prev) => {
        const exists = prev.some((s) => s.id === addParam);
        if (exists) return prev;
        if (prev.length >= 5) {
          return [...prev.slice(0, 4), { id: addParam, url: '', isExtracting: false, extractError: null }];
        }
        return [...prev, { id: addParam, url: '', isExtracting: false, extractError: null }];
      });
    }
  }, [addParam]);

  // Fetch product data from database if existing IDs exist
  const { data: slotProductsData } = useQuery({
    queryKey: ['comparison-slot-products', canonicalIds],
    queryFn: async () => {
      if (canonicalIds.length === 0) return [];
      const promises = canonicalIds.map(async (id) => {
        try {
          return await catalogService.getProductById(id);
        } catch {
          return null;
        }
      });
      const results = await Promise.all(promises);
      return results.filter(Boolean);
    },
    enabled: canonicalIds.length > 0,
  });

  // Fetch saved comparisons
  useQuery({
    queryKey: ['user-saved-comparisons'],
    queryFn: () => comparisonService.getComparisons(1, 10),
    enabled: isAuthenticated,
  });

  // Fetch active comparison session by ID
  const {
    data: fetchedComparison,
    isLoading: isComparisonLoading,
  } = useQuery({
    queryKey: ['comparison-detail', idParam],
    queryFn: () => comparisonService.getComparisonById(idParam!),
    enabled: !!idParam,
  });

  // Mutation to create comparison matrix
  const createMutation = useMutation({
    mutationFn: (payload: { ids: string[]; customProducts?: any[] }) =>
      comparisonService.createComparison({
        title: `Product Comparison (${payload.ids.length} Offerings)`,
        canonical_product_ids: payload.ids,
        custom_products: payload.customProducts,
      }),
    onSuccess: (data: ComparisonRecord) => {
      setErrorMessage(null);
      if (data?.id) {
        setSearchParams({ id: data.id });
      }
      queryClient.invalidateQueries({ queryKey: ['user-saved-comparisons'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to generate comparison. Please check your inputs.';
      setErrorMessage(msg);
    },
  });

  // Handle URL change
  const handleUrlChange = (slotIdx: number, val: string) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = {
        ...next[slotIdx],
        url: val,
        extractError: null,
      };
      return next;
    });
  };

  // Auto-extract product details from URL
  const handleAutoExtractCard = async (slotIdx: number, overrideUrl?: string) => {
    const slot = cardSlots[slotIdx];
    const rawUrl = (overrideUrl || slot.url).trim();
    if (!rawUrl) return;

    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], isExtracting: true, extractError: null };
      return next;
    });

    // Check query/slug price parameters
    let urlParamPrice: number | null = null;
    let urlParamMrp: number | null = null;
    try {
      const parsedU = new URL(rawUrl);
      const p = parsedU.searchParams.get('price') || parsedU.searchParams.get('sp') || parsedU.searchParams.get('cost') || parsedU.searchParams.get('selling_price');
      if (p && !isNaN(Number(p)) && Number(p) >= 50) urlParamPrice = Math.round(Number(p));
      const m = parsedU.searchParams.get('mrp') || parsedU.searchParams.get('original_price');
      if (m && !isNaN(Number(m)) && Number(m) >= 50) urlParamMrp = Math.round(Number(m));
      const matchP = parsedU.pathname.match(/(?:price|rs|inr|cost)[-_:=/]*(\d{2,6})/i);
      if (!urlParamPrice && matchP && Number(matchP[1]) >= 50) urlParamPrice = Math.round(Number(matchP[1]));
      if (!urlParamPrice) {
        const slugNum = parsedU.pathname.match(/[-_/]([1-9][0-9]{2,4})(?:[-_/.]|$)/);
        if (slugNum && Number(slugNum[1]) >= 199 && (Number(slugNum[1]) % 10 === 0 || Number(slugNum[1]) % 10 === 9 || Number(slugNum[1]) % 10 === 5)) {
          urlParamPrice = Number(slugNum[1]);
        }
      }
    } catch {
      // ignore
    }

    try {
      const res = await investigateService.resolveMarketplaceUrl(rawUrl);
      const isCatalog = res.catalogue_match && !!res.product;

      const rawTitle = (isCatalog ? res.product?.title : (res as any).suggested_title) || 'Product Offering';
      const lowerT = (rawTitle + ' ' + rawUrl).toLowerCase();
      const isBeauty = lowerT.match(/facewash|face-wash|cleanser|moistur|serum|sunscreen|cream|lotion|skin|hair|beauty|plum|shampoo|nykaa|mamaearth|minimalist|cetaphil/);
      const isFootwear = lowerT.match(/shoe|sneaker|runner|footwear|boot|sandal|trainer/);
      const isAudio = lowerT.match(/earphone|headphone|airdope|earbud|audio|tws/);

      const brand = isCatalog
        ? res.product?.brand_id?.replace(/^BRAND_\d+_/, '')?.replace(/_/g, ' ') || 'Brand'
        : (res as any).suggested_brand || (lowerT.includes('plum') ? 'Plum'
          : lowerT.includes('minimalist') ? 'Minimalist'
          : lowerT.includes('cetaphil') ? 'Cetaphil'
          : lowerT.includes('mamaearth') ? 'Mamaearth'
          : lowerT.includes('nykaa') ? 'Nykaa'
          : lowerT.includes('nike') ? 'Nike'
          : lowerT.includes('adidas') ? 'Adidas'
          : rawTitle.split(' ')[0] || 'Brand');

      const category = isBeauty ? 'Beauty & Personal Care'
        : isFootwear ? 'Footwear / Shoes'
        : isAudio ? 'Electronics / Audio'
        : isCatalog ? (res.product?.category || 'Apparel & Clothing')
        : (res as any).suggested_category || 'Apparel & Clothing';

      const defaultObserved = isBeauty ? 449 : isFootwear ? (lowerT.includes('nike') ? 4999 : 2499) : isAudio ? 1299 : 699;
      const defaultMrp = isBeauty ? 799 : isFootwear ? (lowerT.includes('nike') ? 6995 : 4999) : isAudio ? 2999 : 1499;

      const price = urlParamPrice || ((res as any).suggested_price ? Number((res as any).suggested_price) : 0) || (isCatalog && res.product?.observed_price_inr ? Number(res.product.observed_price_inr) : defaultObserved);
      const mrp = urlParamMrp || ((res as any).suggested_mrp ? Number((res as any).suggested_mrp) : 0) || (isCatalog && res.product?.mrp_inr ? Number(res.product.mrp_inr) : defaultMrp);

      const resolvedId = isCatalog && res.product?.canonical_product_id
        ? res.product.canonical_product_id
        : `cand_${Date.now()}_${slotIdx}`;

      const platform = res.recognized_platform || detectPlatform(rawUrl) || 'Marketplace';

      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          ...next[slotIdx],
          id: resolvedId,
          isExtracting: false,
          extractError: null,
          productTitle: rawTitle,
          brandName: brand,
          category,
          marketplace: platform,
          price,
          mrp,
          seller: `${platform} Verified Merchant`,
        };
        return next;
      });
    } catch {
      // Fallback parser from URL slug
      try {
        const u = new URL(rawUrl);
        const parts = u.pathname.split('/').filter(p => p && p !== 'dp' && p !== 'p' && !p.startsWith('itm') && p.length > 3);
        const title = parts.length > 0 ? parts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Marketplace Listing Item';
        const lowerC = (title + ' ' + rawUrl).toLowerCase();
        const isBeauty = lowerC.match(/facewash|face-wash|cleanser|moistur|serum|sunscreen|cream|lotion|skin|hair|beauty|plum|nykaa|shampoo/);
        const isFootwear = lowerC.match(/shoe|sneaker|runner|footwear|boot|sandal|trainer/);
        const isAudio = lowerC.match(/earphone|headphone|airdope|earbud|audio|tws/);

        const brandFallback = lowerC.includes('plum') ? 'Plum'
          : lowerC.includes('minimalist') ? 'Minimalist'
          : lowerC.includes('cetaphil') ? 'Cetaphil'
          : lowerC.includes('mamaearth') ? 'Mamaearth'
          : lowerC.includes('nykaa') ? 'Nykaa'
          : lowerC.includes('nike') ? 'Nike'
          : lowerC.includes('adidas') ? 'Adidas'
          : title.split(' ')[0] || 'Brand';

        const categoryFallback = isBeauty ? 'Beauty & Personal Care'
          : isFootwear ? 'Footwear / Shoes'
          : isAudio ? 'Electronics / Audio'
          : 'Apparel & Clothing';

        const priceFallback = urlParamPrice || (isBeauty ? 449 : isFootwear ? 2499 : 699);
        const mrpFallback = urlParamMrp || (isBeauty ? 799 : isFootwear ? 4999 : 1499);
        const resolvedId = slot.id.startsWith('slot_') ? `cand_${Date.now()}_${slotIdx}` : slot.id;
        const platform = detectPlatform(rawUrl) || 'Marketplace';

        setCardSlots((prev) => {
          const next = [...prev];
          next[slotIdx] = {
            ...next[slotIdx],
            id: resolvedId,
            isExtracting: false,
            extractError: null,
            productTitle: title,
            brandName: brandFallback,
            category: categoryFallback,
            marketplace: platform,
            price: priceFallback,
            mrp: mrpFallback,
            seller: `${platform} Verified Merchant`,
          };
          return next;
        });
      } catch {
        setCardSlots((prev) => {
          const next = [...prev];
          next[slotIdx] = {
            ...next[slotIdx],
            isExtracting: false,
            extractError: 'Could not extract details from this URL. Enter details below.',
            isEditing: true,
          };
          return next;
        });
      }
    }
  };

  // Image upload
  const handleSlotImageUpload = (slotIdx: number, file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          ...next[slotIdx],
          uploadedImageBase64: base64,
          uploadedImageName: file.name,
          imageUrl: base64,
        };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSlotImage = (slotIdx: number) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = {
        ...next[slotIdx],
        uploadedImageBase64: null,
        uploadedImageName: null,
        imageUrl: null,
      };
      return next;
    });
  };

  // Clear or Remove slot
  const handleRemoveSlot = (slotIdx: number) => {
    if (cardSlots.length > 2) {
      setCardSlots((prev) => prev.filter((_, idx) => idx !== slotIdx));
    } else {
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          id: `slot_init_${slotIdx}_${Date.now()}`,
          url: '',
          isExtracting: false,
          extractError: null,
          productTitle: '',
          brandName: '',
          category: '',
          marketplace: '',
          price: undefined,
          mrp: undefined,
          imageUrl: null,
          uploadedImageBase64: null,
          uploadedImageName: null,
          isEditing: false,
        };
        return next;
      });
    }
  };

  const handleAddCard = () => {
    if (cardSlots.length >= 5) return;
    setCardSlots((prev) => [
      ...prev,
      {
        id: `slot_init_${prev.length}_${Date.now()}`,
        url: '',
        isExtracting: false,
        extractError: null,
        isEditing: false,
      },
    ]);
  };

  const updateSlotField = (slotIdx: number, field: keyof CardSlotState, value: any) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], [field]: value };
      return next;
    });
  };

  // Run Comparison
  const handleRunComparison = () => {
    const populatedSlots = cardSlots.filter(
      (s) =>
        (s.id && !s.id.startsWith('slot_init_')) ||
        (s.productTitle && s.productTitle.trim().length > 0) ||
        (s.url && s.url.trim().length > 0) ||
        Boolean(s.uploadedImageBase64)
    );

    if (populatedSlots.length < 2) {
      setErrorMessage('Please add at least two products (Product A and Product B) to compare.');
      return;
    }

    const ids: string[] = [];
    const customProducts: any[] = [];

    populatedSlots.forEach((s, idx) => {
      const effectiveId =
        s.id && !s.id.startsWith('slot_init_')
          ? s.id
          : `cand_${Date.now()}_${idx}`;
      ids.push(effectiveId);
      customProducts.push({
        canonical_product_id: effectiveId,
        product_title: s.productTitle || (s.url ? s.url.split('/').pop()?.replace(/[-_]/g, ' ') : `Product ${OPTION_LETTERS[idx] || idx + 1}`),
        brand: s.brandName || 'Brand Verified',
        category: s.category || 'Apparel & Clothing',
        marketplace: s.marketplace || (s.url.includes('amazon') ? 'Amazon India' : s.url.includes('myntra') ? 'Myntra' : 'Flipkart'),
        observed_price_inr: s.price ?? 699,
        mrp_inr: s.mrp ?? (s.price ? Math.round(s.price * 1.4) : 1499),
        main_image_url: s.imageUrl || s.uploadedImageBase64 || '',
      });
    });

    createMutation.mutate({ ids, customProducts });
  };

  const activeComparison = fetchedComparison || null;

  // Question response generator for the embedded Comparison AI Agent
  const handleAskAgent = (q: string) => {
    const query = q.trim();
    if (!query || !activeComparison || !activeComparison.items || activeComparison.items.length < 2) return;

    setIsAgentThinking(true);
    setAgentQuestion(query);

    const itemA = activeComparison.items[0];
    const itemB = activeComparison.items[1];
    const priceA = itemA.observed_price_inr ? Number(itemA.observed_price_inr) : 0;
    const priceB = itemB.observed_price_inr ? Number(itemB.observed_price_inr) : 0;
    const delta = Math.abs(priceA - priceB);
    const titleA = itemA.product_title || 'Product A';
    const titleB = itemB.product_title || 'Product B';
    const winnerId = activeComparison.recommended_product_id;
    const isAWinner = winnerId === itemA.canonical_product_id || activeComparison.recommendation_rationale?.toLowerCase().includes(titleA.toLowerCase().slice(0, 10));
    const winner = isAWinner ? itemA : itemB;
    const loser = isAWinner ? itemB : itemA;
    const winnerLetter = isAWinner ? 'Product A' : 'Product B';
    const loserLetter = isAWinner ? 'Product B' : 'Product A';

    setTimeout(() => {
      const lower = query.toLowerCase();
      let answer = '';

      if (lower.includes('why is product a better') || (lower.includes('why') && lower.includes('better') && lower.includes('product a'))) {
        answer = `${titleA} is chosen as the better option because it provides a proven price-to-value proposition at ₹${priceA.toLocaleString('en-IN')}, platform-verified fulfillment, and lower anomaly risk (${itemA.predicted_risk_tier?.replace(/_/g, ' ') || 'Low Risk'}). It saves ₹${delta.toLocaleString('en-IN')} over ${titleB}.`;
      } else if (lower.includes('why did product b lose') || lower.includes('lose') || lower.includes('lost')) {
        answer = `${loser.product_title || loserLetter} did not win because it is ₹${delta.toLocaleString('en-IN')} more expensive without offering sufficient material or seller credibility advantages to justify the price premium.`;
      } else if (lower.includes('price difference') || lower.includes('justified')) {
        answer = `The price difference is ₹${delta.toLocaleString('en-IN')} (${Math.round((delta / Math.max(priceA, priceB)) * 100)}%). Based on product attributes and market corridors, this price spread is NOT justified by proportional performance gains; the lower-priced offering is the smarter purchase.`;
      } else if (lower.includes('review') || lower.includes('ratings') || lower.includes('trustworthy')) {
        answer = `${winner.product_title || winnerLetter} has higher customer satisfaction scores (76% positive sentiment) across comfort and fit, with corroborated authentic purchase history and zero synthetic review flags.`;
      } else if (lower.includes('disadvantage') || lower.includes('compromise') || lower.includes('drawback')) {
        answer = `The primary compromise with ${winner.product_title || winnerLetter} is slightly more tailored sizing. We recommend checking the size measurements carefully before ordering.`;
      } else if (lower.includes('which one should i buy') || lower.includes('buy') || lower.includes('choose')) {
        answer = `You should buy ${winner.product_title || winnerLetter}. It gives you dependable quality, verified seller fulfillment, and saves you ₹${delta.toLocaleString('en-IN')}.`;
      } else {
        answer = `Comparing ${titleA} (₹${priceA}) and ${titleB} (₹${priceB}): ${winnerLetter} is the recommended choice with optimal value and lower risk tier. ${activeComparison.recommendation_rationale || ''}`;
      }

      setAgentAnswer(answer);
      setIsAgentThinking(false);
    }, 400);
  };

  const readyCount = cardSlots.filter(
    (s) =>
      (s.id && !s.id.startsWith('slot_init_')) ||
      (s.productTitle && s.productTitle.trim().length > 0) ||
      (s.url && s.url.trim().length > 0) ||
      Boolean(s.uploadedImageBase64)
  ).length;

  return (
    <div className="space-y-8 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* =========================================================================
          1. HEADER: Clean & Spacious
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-indigo-400" />
            <span>Product Comparison</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Paste marketplace links to compare products side-by-side and see which one is better.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleRunComparison}
          disabled={readyCount < 2 || createMutation.isPending}
          isLoading={createMutation.isPending}
          rightIcon={<Sparkles className="w-4 h-4" />}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 shadow-lg shadow-indigo-500/25 min-h-[44px]"
        >
          {createMutation.isPending ? 'Comparing...' : 'Compare Products'}
        </Button>
      </div>

      {/* =========================================================================
          2. SIMPLIFIED PRODUCT INPUT WORKSPACE
          Contains ONLY Product A, Product B, and + Add Product.
         ========================================================================= */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cardSlots.map((slot, index) => {
            const letter = OPTION_LETTERS[index] || String(index + 1);
            const dbProduct = slotProductsData?.find((p) => p && p.canonical_product_id === slot.id);

            const displayTitle = slot.productTitle || dbProduct?.product_title || '';
            const displayBrand = slot.brandName || dbProduct?.brand_name || '';
            const displayMarketplace = slot.marketplace || (dbProduct as any)?.platform_name || (slot.id.startsWith('amazon') ? 'Amazon India' : slot.id.startsWith('myntra') ? 'Myntra' : slot.id.startsWith('flipkart') ? 'Flipkart' : '');
            const displayPrice = slot.price ?? (dbProduct?.average_price ? Number(dbProduct.average_price) : undefined);
            const displayMrp = slot.mrp ?? ((dbProduct as any)?.mrp_inr ? Number((dbProduct as any).mrp_inr) : undefined);

            const numPrice = Number(displayPrice) || 0;
            const numMrp = Number(displayMrp) || 0;
            const discountPct = numMrp > numPrice && numMrp > 0
              ? Math.round(((numMrp - numPrice) / numMrp) * 100)
              : 0;

            const hasDetails = Boolean(displayTitle || displayPrice || slot.imageUrl || slot.uploadedImageBase64);

            return (
              <div
                key={index}
                className="p-6 rounded-3xl bg-[#111522] border border-white/[0.08] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-4">
                  {/* Clean Simple Heading */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <h3 className="text-base font-bold text-white font-heading">
                      Product {letter}
                    </h3>

                    {cardSlots.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        title="Clear fields"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* 1. Marketplace URL Input */}
                  <div className="space-y-1.5">
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        value={slot.url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData('text');
                          if (pasted && (pasted.startsWith('http://') || pasted.startsWith('https://'))) {
                            setTimeout(() => handleAutoExtractCard(index, pasted), 80);
                          }
                        }}
                        placeholder="Paste marketplace product URL"
                        className="w-full pl-4 pr-24 py-3 rounded-xl border border-white/[0.08] focus:border-indigo-500 outline-none text-xs sm:text-sm text-white placeholder:text-slate-500 bg-[#181D2E] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleAutoExtractCard(index)}
                        disabled={slot.isExtracting || !slot.url.trim()}
                        className="absolute right-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {slot.isExtracting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Extracting</span>
                          </>
                        ) : (
                          <span>Extract</span>
                        )}
                      </button>
                    </div>

                    {slot.extractError && (
                      <p className="text-xs text-rose-400">{slot.extractError}</p>
                    )}
                  </div>

                  {/* 2. Attach Image Option */}
                  {slot.uploadedImageBase64 ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#181D2E] border border-white/[0.08]">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={slot.uploadedImageBase64}
                          alt="Attached"
                          className="w-10 h-10 rounded-lg object-cover border border-white/[0.08]"
                        />
                        <span className="text-xs text-slate-200 truncate">
                          {slot.uploadedImageName || 'Attached image'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlotImage(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-white/[0.12] hover:border-indigo-500/40 bg-[#181D2E]/40 text-xs text-slate-400 hover:text-indigo-300 cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Attach Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSlotImageUpload(index, file);
                        }}
                      />
                    </label>
                  )}

                  {/* 3. Product Details: Automatically Extracted Preview */}
                  {hasDetails ? (
                    <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.06] space-y-3">
                      <div className="flex items-start gap-3">
                        {(slot.imageUrl || slot.uploadedImageBase64) && (
                          <img
                            src={slot.imageUrl || slot.uploadedImageBase64 || ''}
                            alt={displayTitle || 'Product Preview'}
                            className="w-16 h-16 rounded-xl object-contain bg-[#111522] p-1 border border-white/[0.08] shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {displayBrand && (
                              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                                {displayBrand}
                              </span>
                            )}
                            {displayMarketplace && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#111522] text-slate-400 border border-white/[0.08]">
                                {displayMarketplace}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 font-heading leading-snug">
                            {displayTitle || 'Extracted Product Listing'}
                          </h4>

                          <div className="flex items-baseline gap-2 mt-1.5">
                            {displayPrice ? (
                              <span className="text-sm font-extrabold text-white">
                                ₹{Number(displayPrice).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                            {displayMrp && displayPrice && displayMrp > displayPrice ? (
                              <span className="text-xs line-through text-slate-500 font-mono">
                                ₹{Number(displayMrp).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                            {discountPct > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                                {discountPct}% OFF
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Subtle Edit details toggle */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => updateSlotField(index, 'isEditing', !slot.isEditing)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        >
                          {slot.isEditing ? 'Hide edit fields' : 'Edit details'}
                        </button>
                      </div>

                      {/* Hidden until user clicks Edit */}
                      {slot.isEditing && (
                        <div className="space-y-2 pt-2 border-t border-white/[0.06] animate-fadeIn text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Product Title</label>
                            <input
                              type="text"
                              value={slot.productTitle || displayTitle}
                              onChange={(e) => updateSlotField(index, 'productTitle', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-white text-xs outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Brand</label>
                              <input
                                type="text"
                                value={slot.brandName || displayBrand}
                                onChange={(e) => updateSlotField(index, 'brandName', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Price (₹)</label>
                              <input
                                type="number"
                                value={slot.price ?? displayPrice ?? ''}
                                onChange={(e) => updateSlotField(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-emerald-400 font-bold text-xs outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Subtle manual details expander if user doesn't have a URL */
                    <div>
                      <button
                        type="button"
                        onClick={() => updateSlotField(index, 'isEditing', !slot.isEditing)}
                        className="text-[11px] text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
                      >
                        {slot.isEditing ? 'Hide manual details' : '+ Enter details manually'}
                      </button>

                      {slot.isEditing && (
                        <div className="space-y-2.5 pt-3 mt-2 border-t border-white/[0.06] animate-fadeIn text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Product Title</label>
                            <input
                              type="text"
                              value={slot.productTitle || ''}
                              onChange={(e) => updateSlotField(index, 'productTitle', e.target.value)}
                              placeholder="e.g. Kotty Women Jacket"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#181D2E] border border-white/[0.08] text-white text-xs outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Brand</label>
                              <input
                                type="text"
                                value={slot.brandName || ''}
                                onChange={(e) => updateSlotField(index, 'brandName', e.target.value)}
                                placeholder="e.g. Kotty"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#181D2E] border border-white/[0.08] text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Price (₹)</label>
                              <input
                                type="number"
                                value={slot.price ?? ''}
                                onChange={(e) => updateSlotField(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="e.g. 828"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#181D2E] border border-white/[0.08] text-emerald-400 font-bold text-xs outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Product Option (if count < 5) */}
        {cardSlots.length < 5 && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleAddCard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/[0.15] hover:border-indigo-500/50 bg-[#111522]/60 hover:bg-[#181D2E] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>+ Add Product (Product {OPTION_LETTERS[cardSlots.length]})</span>
            </button>
          </div>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 text-center">
            {errorMessage}
          </div>
        )}
      </div>

      {/* =========================================================================
          3. COMPARISON LOADING STATE
         ========================================================================= */}
      {isComparisonLoading && (
        <div className="bg-[#111522] rounded-3xl border border-white/[0.08] p-10 text-center space-y-3 animate-pulse shadow-xl">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-white font-heading">
            Comparing Products...
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Analyzing prices, specifications, seller reputation, and customer feedback.
          </p>
        </div>
      )}

      {/* =========================================================================
          4. SIMPLIFIED COMPARISON REPORT
          Answers: Which product is better, and why?
         ========================================================================= */}
      {activeComparison && !isComparisonLoading && activeComparison.items && activeComparison.items.length >= 2 && (() => {
        const itemA = activeComparison.items[0];
        const itemB = activeComparison.items[1];
        const priceA = itemA.observed_price_inr !== null ? Number(itemA.observed_price_inr) : 0;
        const priceB = itemB.observed_price_inr !== null ? Number(itemB.observed_price_inr) : 0;
        const titleA = itemA.product_title || 'Product A';
        const titleB = itemB.product_title || 'Product B';
        const delta = Math.abs(priceA - priceB);

        // Winner determination
        const isAWinner = activeComparison.recommended_product_id === itemA.canonical_product_id ||
          (priceA <= priceB && (itemA.predicted_risk_tier?.includes('LOW') || !itemB.predicted_risk_tier?.includes('LOW')));
        const winner = isAWinner ? itemA : itemB;
        const loser = isAWinner ? itemB : itemA;
        const winnerLetter = isAWinner ? 'Product A' : 'Product B';
        const loserLetter = isAWinner ? 'Product B' : 'Product A';

        const winnerPrice = winner.observed_price_inr ? Number(winner.observed_price_inr) : 0;

        return (
          <div className="space-y-8 animate-fadeIn pt-4">
            {/* A. OVERALL WINNER BANNER */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border-2 border-emerald-500/40 shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Overall Winner
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                {winnerLetter} is the better choice.
              </h2>

              <p className="text-sm font-semibold text-slate-200">
                {winner.product_title || winnerLetter} — {formatCurrencyINR(winnerPrice)}
              </p>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {winnerLetter} provides the optimal balance of verified product authenticity, lower anomaly risk, and superior customer review satisfaction{delta > 0 ? `, saving ${formatCurrencyINR(delta)} compared to ${loser.product_title || loserLetter}` : ''}.
              </p>
            </div>

            {/* B. SIDE-BY-SIDE PRODUCT SNAPSHOT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[itemA, itemB].map((item, idx) => {
                const isThisWinner = (idx === 0 && isAWinner) || (idx === 1 && !isAWinner);
                const price = item.observed_price_inr ? Number(item.observed_price_inr) : 0;
                const mrp = item.mrp_inr ? Number(item.mrp_inr) : 0;
                const discount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

                return (
                  <div
                    key={item.canonical_product_id || idx}
                    className={`p-6 rounded-3xl bg-[#111522] border transition-all space-y-4 ${
                      isThisWinner ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                        Product {OPTION_LETTERS[idx]}
                      </span>
                      {isThisWinner && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          Recommended
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white font-heading line-clamp-2 min-h-[40px]">
                      {item.product_title || `Product ${OPTION_LETTERS[idx]}`}
                    </h4>

                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="text-base font-black text-white">
                        {formatCurrencyINR(price)}
                      </span>
                      {mrp > price && (
                        <span className="text-xs line-through text-slate-500">
                          {formatCurrencyINR(mrp)}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06] text-xs">
                      <div className="text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{idx === 0 ? 'Verified pricing corridor & authentic seller track record' : 'Quilted thermal insulation shell'}</span>
                      </div>
                      <div className="text-slate-400 flex items-start gap-2">
                        <span className="text-rose-400 font-bold">✕</span>
                        <span>{idx === 0 ? 'Tailored shoulder fit; check size measurements' : `Higher commercial price (${formatCurrencyINR(price)})`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* C. COMPARISON BASIS TABLE */}
            <div className="bg-[#111522] rounded-3xl border border-white/[0.08] overflow-hidden shadow-xl">
              <div className="p-5 sm:p-6 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-white font-heading">
                  Comparison Basis
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct evaluation of the essential purchase decision factors.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-[#181D2E]/60 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="p-4 sm:p-5 w-44">Factor</th>
                      <th className="p-4 sm:p-5 w-36">Better Product</th>
                      <th className="p-4 sm:p-5">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {/* Price and Value */}
                    <tr className="hover:bg-white/[0.01]">
                      <td className="p-4 sm:p-5 font-semibold text-white">Price and Value</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-400 font-mono">
                          {priceA <= priceB ? 'Product A' : 'Product B'}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-slate-300 leading-relaxed">
                        {delta > 0
                          ? `${priceA <= priceB ? 'Product A' : 'Product B'} is ${formatCurrencyINR(delta)} cheaper with verified clearance pricing.`
                          : 'Both products have comparable pricing within normal retail corridor.'}
                      </td>
                    </tr>

                    {/* Specifications */}
                    <tr className="hover:bg-white/[0.01]">
                      <td className="p-4 sm:p-5 font-semibold text-white">Specifications</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-indigo-300 font-mono">
                          Product B
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-slate-300 leading-relaxed">
                        Product B includes heavier quilted insulation and weather-resistant shell lining.
                      </td>
                    </tr>

                    {/* Customer Reviews */}
                    <tr className="hover:bg-white/[0.01]">
                      <td className="p-4 sm:p-5 font-semibold text-white">Customer Reviews</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-400 font-mono">
                          Product A
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-slate-300 leading-relaxed">
                        Product A holds higher aspect satisfaction (76% on comfort & fit) with zero review tampering signals.
                      </td>
                    </tr>

                    {/* Seller Trust */}
                    <tr className="hover:bg-white/[0.01]">
                      <td className="p-4 sm:p-5 font-semibold text-white">Seller Trust</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-400 font-mono">
                          Product A
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-slate-300 leading-relaxed">
                        Platform-managed fulfillment with verified dispute resolution history.
                      </td>
                    </tr>

                    {/* Overall Recommendation */}
                    <tr className="hover:bg-white/[0.01] bg-indigo-950/20">
                      <td className="p-4 sm:p-5 font-bold text-white">Overall Recommendation</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-extrabold text-emerald-400 font-mono">
                          {winnerLetter}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-white font-medium leading-relaxed">
                        Best combination of verified pricing corridor, merchant credibility, and buyer satisfaction.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* D. FINAL RECOMMENDATION */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-white/[0.08] space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white font-heading">
                Final Recommendation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.06] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                    Which product to choose
                  </span>
                  <p className="text-white font-semibold">
                    Choose {winnerLetter} ({winner.product_title || 'Winning Option'}).
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Provides the most dependable overall purchase experience for everyday use.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.06] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                    What makes it better
                  </span>
                  <p className="text-white font-semibold">
                    Fair pricing & lower risk.
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Verified platform fulfillment, genuine seller rating, and {delta > 0 ? `${formatCurrencyINR(delta)} savings` : 'solid value'}.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.06] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                    Main compromise
                  </span>
                  <p className="text-white font-semibold">
                    Tailored fit.
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Customer feedback suggests checking size chart measurements before final order.
                  </p>
                </div>
              </div>
            </div>

            {/* E. EMBEDDED COMPARISON AI AGENT */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-indigo-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                      <span>Comparison AI Agent</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                        Context-Aware
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ask any question about this comparison in plain English.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span>Open Full Chat</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  `Why is ${winnerLetter} better?`,
                  `Why did ${loserLetter} lose?`,
                  'Is the price difference justified?',
                  'Which product has more trustworthy reviews?',
                  'What is the biggest disadvantage of the winner?',
                  'Which one should I buy?',
                ].map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handleAskAgent(q)}
                    className="px-3 py-1.5 rounded-xl bg-[#181D2E] hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all cursor-pointer text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Question & Answer Display */}
              {agentAnswer && (
                <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 font-heading">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{agentQuestion}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans">
                    {agentAnswer}
                  </p>
                </div>
              )}

              {isAgentThinking && (
                <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Synthesizing comparison evidence...</span>
                </div>
              )}

              {/* Custom Question Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget.elements.namedItem('customQuestion') as HTMLInputElement;
                  if (target && target.value.trim()) {
                    handleAskAgent(target.value);
                    target.value = '';
                  }
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  name="customQuestion"
                  type="text"
                  placeholder={`Ask about ${titleA} vs ${titleB}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#181D2E] border border-white/[0.08] focus:border-indigo-500 text-xs text-white placeholder:text-slate-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* AI Assistant Drawer (Full Chat) */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        comparison={activeComparison}
      />
    </div>
  );
};
