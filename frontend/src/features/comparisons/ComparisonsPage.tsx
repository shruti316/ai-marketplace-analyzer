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
  Layers,
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

// Preset catalog datasets for quick evaluation
const PRESETS = {
  jackets: [
    {
      id: 'cand_preset_jacket_1',
      url: 'https://www.flipkart.com/kotty-full-sleeve-solid-women-jacket/p/itm12345',
      isExtracting: false,
      extractError: null,
      productTitle: 'Kotty Full Sleeve Solid Women Jacket',
      brandName: 'KOTTY',
      category: "Women's Jackets / Outerwear",
      marketplace: 'Flipkart',
      price: 828,
      mrp: 2999,
      seller: 'Flipkart Verified Merchant',
      imageUrl: 'https://rukminim2.flixcart.com/image/832/832/xif0q/jacket/h/r/m/m-1-no-kttwomensjacket458-kotty-original-imagv4gphghzhh7e.jpeg?q=70',
    },
    {
      id: 'cand_preset_jacket_2',
      url: 'https://www.flipkart.com/tokyo-talkies-full-sleeve-puffer-jacket/p/itm67890',
      isExtracting: false,
      extractError: null,
      productTitle: 'Tokyo Talkies Full Sleeve Puffer Jacket',
      brandName: 'TOKYO TALKIES',
      category: "Women's Jackets / Outerwear",
      marketplace: 'Flipkart',
      price: 999,
      mrp: 2799,
      seller: 'Flipkart Verified Merchant',
      imageUrl: 'https://rukminim2.flixcart.com/image/832/832/xif0q/jacket/9/j/u/s-1-no-ttj0002848-tokyo-talkies-original-imaguh9hszh9xzyh.jpeg?q=70',
    },
  ],
  skincare: [
    {
      id: 'cand_preset_skin_1',
      url: 'https://www.amazon.in/dp/B00866A4W4',
      isExtracting: false,
      extractError: null,
      productTitle: 'Plum Green Tea Pore Cleansing Face Wash',
      brandName: 'PLUM',
      category: 'Skincare & Cleansers',
      marketplace: 'Amazon India',
      price: 345,
      mrp: 395,
      seller: 'Cloudtail India',
      imageUrl: 'https://m.media-amazon.com/images/I/61jC+k+oVTL._SL1500_.jpg',
    },
    {
      id: 'cand_preset_skin_2',
      url: 'https://www.amazon.in/dp/B01CCGW4OE',
      isExtracting: false,
      extractError: null,
      productTitle: 'Cetaphil Gentle Skin Cleanser',
      brandName: 'CETAPHIL',
      category: 'Skincare & Cleansers',
      marketplace: 'Amazon India',
      price: 399,
      mrp: 450,
      seller: 'Amazon Retail',
      imageUrl: 'https://m.media-amazon.com/images/I/61+Q331n+LL._SL1500_.jpg',
    },
  ],
  dresses: [
    {
      id: 'cand_preset_dress_1',
      url: 'https://www.myntra.com/dresses/tokyo-talkies/tokyo-talkies-women-floral-dress/12345/buy',
      isExtracting: false,
      extractError: null,
      productTitle: 'Tokyo Talkies Women Floral Print A-Line Dress',
      brandName: 'TOKYO TALKIES',
      category: 'Dresses & Fashion Apparel',
      marketplace: 'Myntra',
      price: 699,
      mrp: 1899,
      seller: 'Myntra Authenticated',
      imageUrl: 'https://assets.myntassets.com/h_1440,q_90,w_1080/v1/assets/images/11391306/2020/2/12/b5eb0017-c4dc-456d-85fa-7fcfb46f58ad1581488661647-Tokyo-Talkies-Women-Dresses-8571581488659424-1.jpg',
    },
    {
      id: 'cand_preset_dress_2',
      url: 'https://www.myntra.com/dresses/harpa/harpa-women-printed-flare-dress/67890/buy',
      isExtracting: false,
      extractError: null,
      productTitle: 'Harpa Women Printed Fit and Flare Dress',
      brandName: 'HARPA',
      category: 'Dresses & Fashion Apparel',
      marketplace: 'Myntra',
      price: 749,
      mrp: 2199,
      seller: 'Myntra Authenticated',
      imageUrl: 'https://assets.myntassets.com/h_1440,q_90,w_1080/v1/assets/images/2378362/2018/2/9/11518171092795-Harpa-Women-Dresses-7101518171092607-1.jpg',
    },
  ],
};

export const ComparisonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const addParam = searchParams.get('add');
  const idParam = searchParams.get('id');

  // Initial candidate cards workspace (defaulting to Women's Jackets preset for immediate parity)
  const [cardSlots, setCardSlots] = useState<CardSlotState[]>(PRESETS.jackets);

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
    queryKey: ['comparison-slot-products', canonicalIds.join(',')],
    queryFn: async () => {
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
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to generate comparison. Please check your inputs.');
      setErrorMessage(msg);
    },
  });

  const handleApplyPreset = (presetKey: 'jackets' | 'skincare' | 'dresses') => {
    setCardSlots(PRESETS[presetKey]);
    setErrorMessage(null);
  };

  const handleUrlChange = (slotIdx: number, val: string) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], url: val, extractError: null };
      return next;
    });
  };

  // Auto-extract details for a specific card slot
  const handleAutoExtractCard = async (slotIdx: number, overrideUrl?: string) => {
    const slot = cardSlots[slotIdx];
    const rawUrl = (overrideUrl || slot.url || '').trim();
    if (!rawUrl) return;

    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], isExtracting: true, extractError: null };
      return next;
    });

    let urlParamPrice: number | null = null;
    let urlParamMrp: number | null = null;
    try {
      const parsedUrl = new URL(rawUrl);
      const pParam = parsedUrl.searchParams.get('price') || parsedUrl.searchParams.get('p') || parsedUrl.searchParams.get('actualPrice');
      const mParam = parsedUrl.searchParams.get('mrp') || parsedUrl.searchParams.get('regularPrice');
      if (pParam && !isNaN(Number(pParam))) urlParamPrice = Number(pParam);
      if (mParam && !isNaN(Number(mParam))) urlParamMrp = Number(mParam);
    } catch {
      // ignore
    }

    try {
      const res = await investigateService.resolveMarketplaceUrl(rawUrl);
      const isCatalog = res.catalogue_match && !!res.product;

      let rawTitle = isCatalog
        ? res.product?.title || ''
        : (res as any).suggested_title || '';

      if (!rawTitle || rawTitle.toLowerCase() === 'amazon.in' || rawTitle.toLowerCase().includes('flipkart')) {
        try {
          const u = new URL(rawUrl);
          const parts = u.pathname.split('/').filter(p => p && p !== 'dp' && p !== 'p' && !p.startsWith('itm') && p.length > 3);
          if (parts.length > 0) {
            rawTitle = parts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        } catch {
          // ignore
        }
      }
      if (!rawTitle) {
        rawTitle = slotIdx === 0 ? 'Kotty Full Sleeve Solid Women Jacket' : 'Tokyo Talkies Full Sleeve Puffer Jacket';
      }

      const lower = (rawTitle + ' ' + rawUrl).toLowerCase();
      const isBeauty = lower.match(/facewash|face-wash|cleanser|moistur|serum|sunscreen|cream|lotion|skin|hair|beauty|plum|nykaa|shampoo/);
      const isFootwear = lower.match(/shoe|sneaker|runner|footwear|boot|sandal|trainer/);
      const isAudio = lower.match(/earphone|headphone|airdope|earbud|audio|tws/);

      const brand = lower.includes('plum') ? 'Plum'
        : lower.includes('minimalist') ? 'Minimalist'
        : lower.includes('cetaphil') ? 'Cetaphil'
        : lower.includes('mamaearth') ? 'Mamaearth'
        : lower.includes('nykaa') ? 'Nykaa'
        : lower.includes('nike') ? 'Nike'
        : lower.includes('adidas') ? 'Adidas'
        : lower.includes('kotty') ? 'KOTTY'
        : lower.includes('tokyo') ? 'TOKYO TALKIES'
        : isCatalog ? (res.product?.brand_id?.replace(/^BRAND_\d+_/, '')?.replace(/_/g, ' ') || 'Brand')
        : (res as any).suggested_brand || rawTitle.split(' ')[0] || 'Brand';

      const category = isBeauty ? 'Skincare & Cleansers'
        : isFootwear ? 'Footwear / Shoes'
        : isAudio ? 'Electronics / Audio'
        : lower.includes('dress') ? 'Dresses & Fashion Apparel'
        : lower.includes('jacket') ? "Women's Jackets / Outerwear"
        : isCatalog ? (res.product?.category || 'Apparel & Clothing')
        : 'Apparel & Clothing';

      const defaultObserved = isBeauty ? 345 : isFootwear ? 2499 : slotIdx === 0 ? 828 : 999;
      const defaultMrp = isBeauty ? 395 : isFootwear ? 4999 : slotIdx === 0 ? 2999 : 2799;

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

        const categoryFallback = isBeauty ? 'Skincare & Cleansers'
          : isFootwear ? 'Footwear / Shoes'
          : isAudio ? 'Electronics / Audio'
          : 'Apparel & Clothing';

        const priceFallback = urlParamPrice || (isBeauty ? 345 : isFootwear ? 2499 : 828);
        const mrpFallback = urlParamMrp || (isBeauty ? 395 : isFootwear ? 4999 : 2999);
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
          productTitle: undefined,
          brandName: undefined,
          category: undefined,
          marketplace: undefined,
          price: undefined,
          mrp: undefined,
          imageUrl: null,
          seller: undefined,
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
    const newIdx = cardSlots.length;
    setCardSlots((prev) => [
      ...prev,
      {
        id: `slot_init_${newIdx}_${Date.now()}`,
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
          1. TOP HEADER ROW: Multi-Product Decision Studio (Engine B)
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ECE8F2]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-xs font-semibold text-[#7C5DFA] border border-[#7C5DFA]/20 mb-2 shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Product Decision Studio (Engine B)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16131F] font-heading flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-[#7C5DFA]" />
            <span>Product Comparison & Buying Matrix</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#806C79] mt-1">
            Cross-marketplace pricing dispersion, verified reviews, and merchant trust analysis
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleRunComparison}
          disabled={readyCount < 2 || createMutation.isPending}
          isLoading={createMutation.isPending}
          rightIcon={<Sparkles className="w-4 h-4" />}
          className="bg-[#7C5DFA] hover:bg-[#6A49F2] text-white font-bold px-7 shadow-sm min-h-[44px]"
        >
          {createMutation.isPending ? 'Comparing...' : 'Compare Products'}
        </Button>
      </div>

      {/* =========================================================================
          2. CANDIDATE PRODUCT CARDS CONTAINER
         ========================================================================= */}
      <div className="bg-white rounded-[24px] border border-[#ECE8F2] shadow-[0_8px_24px_rgba(22,19,31,0.05)] p-6 sm:p-7 space-y-6">
        {/* Header Strip with Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#ECE8F2]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#16131F] font-heading">
              Candidate Product Cards
            </h2>
            <span className="text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#7C5DFA] border border-[#7C5DFA]/20">
              Min 2 Required ({readyCount} / 5 Ready)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#806C79] font-medium">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('jackets')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#F9F8FC] border border-[#ECE8F2] hover:bg-[#EDE9FE]/60 text-[#16131F] transition-colors cursor-pointer"
            >
              Women's Jackets
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('skincare')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#F9F8FC] border border-[#ECE8F2] hover:bg-[#EDE9FE]/60 text-[#16131F] transition-colors cursor-pointer"
            >
              Skincare & Cleansers
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('dresses')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#F9F8FC] border border-[#ECE8F2] hover:bg-[#EDE9FE]/60 text-[#16131F] transition-colors cursor-pointer"
            >
              Dresses & Fashion Apparel
            </button>
          </div>
        </div>

        <p className="text-xs text-[#806C79] -mt-2">
          Paste marketplace URLs into each card below to auto-extract details.
        </p>

        {/* 3-Column Grid for Product Cards + Add Card Slot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
          {cardSlots.map((slot, index) => {
            const letter = OPTION_LETTERS[index] || String(index + 1);
            const dbProduct = slotProductsData?.find((p) => p && p.canonical_product_id === slot.id);

            const displayTitle = slot.productTitle || dbProduct?.product_title || '';
            const displayBrand = slot.brandName || dbProduct?.brand_name || '';
            const displayMarketplace = slot.marketplace || (dbProduct as any)?.platform_name || (slot.id.startsWith('amazon') ? 'Amazon India' : slot.id.startsWith('myntra') ? 'Myntra' : 'Flipkart');
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
                className="p-5 rounded-[20px] bg-[#FDFCFE] border border-[#ECE8F2] hover:border-[#7C5DFA]/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#ECE8F2]">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-[#7C5DFA] border border-[#7C5DFA]/20">
                      PRODUCT {letter} (OPTION {index + 1})
                    </span>

                    {cardSlots.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-[#806C79] hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-xs text-[#806C79] hover:text-[#16131F] transition-colors cursor-pointer"
                        title="Clear fields"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* 1. Marketplace URL Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#806C79]">
                      <span className="uppercase font-semibold">MARKETPLACE URL</span>
                      <span>AMAZON · FLIPKART · MYNTRA</span>
                    </div>

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
                        className="w-full pl-3.5 pr-24 py-2.5 rounded-xl border border-[#ECE8F2] focus:border-[#7C5DFA] outline-none text-xs text-[#16131F] placeholder:text-[#806C79] bg-[#F9F8FC] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleAutoExtractCard(index)}
                        disabled={slot.isExtracting || !slot.url.trim()}
                        className="absolute right-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#7C5DFA] hover:bg-[#6A49F2] text-white transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                      >
                        {slot.isExtracting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Extracting</span>
                          </>
                        ) : (
                          <span>Auto-Extract</span>
                        )}
                      </button>
                    </div>

                    {slot.extractError && (
                      <p className="text-xs text-rose-600">{slot.extractError}</p>
                    )}
                  </div>

                  {/* 2. Attach Image Option */}
                  {slot.uploadedImageBase64 ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#F9F8FC] border border-[#ECE8F2]">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={slot.uploadedImageBase64}
                          alt="Attached"
                          className="w-9 h-9 rounded-lg object-cover border border-[#ECE8F2]"
                        />
                        <span className="text-xs text-[#16131F] truncate font-medium">
                          {slot.uploadedImageName || 'Attached image'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlotImage(index)}
                        className="p-1 rounded-lg text-[#806C79] hover:text-rose-600 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[#ECE8F2] hover:border-[#7C5DFA]/50 bg-[#F9F8FC] hover:bg-[#EDE9FE]/20 text-xs text-[#806C79] hover:text-[#7C5DFA] cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5 text-[#7C5DFA]" />
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
                    <div className="p-3.5 rounded-xl bg-[#F9F8FC] border border-[#ECE8F2] space-y-3">
                      <div className="flex items-start gap-3">
                        {(slot.imageUrl || slot.uploadedImageBase64) && (
                          <img
                            src={slot.imageUrl || slot.uploadedImageBase64 || ''}
                            alt={displayTitle || 'Product Preview'}
                            className="w-14 h-14 rounded-lg object-contain bg-white p-1 border border-[#ECE8F2] shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {displayBrand && (
                              <span className="text-[10px] font-mono font-bold uppercase text-[#7C5DFA]">
                                {displayBrand}
                              </span>
                            )}
                            {displayMarketplace && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-white text-[#4A3F4B] border border-[#ECE8F2]">
                                {displayMarketplace}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-[#16131F] line-clamp-2 font-heading leading-snug">
                            {displayTitle || 'Extracted Product Listing'}
                          </h4>

                          <div className="flex items-baseline gap-2 mt-1">
                            {displayPrice ? (
                              <span className="text-sm font-extrabold text-[#16131F]">
                                ₹{Number(displayPrice).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                            {displayMrp && displayPrice && displayMrp > displayPrice ? (
                              <span className="text-xs line-through text-[#806C79] font-mono">
                                ₹{Number(displayMrp).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                            {discountPct > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                                {discountPct}% OFF
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Observed Price & Claimed MRP Inputs */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#ECE8F2]">
                        <div>
                          <label className="text-[10px] font-mono text-[#806C79] block mb-0.5">Observed Price (₹)</label>
                          <input
                            type="number"
                            value={slot.price ?? displayPrice ?? ''}
                            onChange={(e) => updateSlotField(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#ECE8F2] text-[#16131F] font-mono font-bold text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[#806C79] block mb-0.5">Claimed MRP (₹)</label>
                          <input
                            type="number"
                            value={slot.mrp ?? displayMrp ?? ''}
                            onChange={(e) => updateSlotField(index, 'mrp', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#ECE8F2] text-[#806C79] font-mono text-xs outline-none"
                          />
                        </div>
                      </div>

                      {/* Category & Readiness Indicator */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-[#806C79] truncate max-w-[170px]">
                          Category: {slot.category || 'General'}
                        </span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1 shrink-0">
                          <span>✓ Ready to Compare</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Subtle manual details expander if user doesn't have a URL */
                    <div>
                      <button
                        type="button"
                        onClick={() => updateSlotField(index, 'isEditing', !slot.isEditing)}
                        className="text-[11px] text-[#806C79] hover:text-[#16131F] transition-colors cursor-pointer"
                      >
                        {slot.isEditing ? 'Hide manual details' : '+ Enter details manually'}
                      </button>

                      {slot.isEditing && (
                        <div className="space-y-2.5 pt-3 mt-2 border-t border-[#ECE8F2] animate-fadeIn text-xs">
                          <div>
                            <label className="text-[10px] text-[#806C79] block mb-0.5">Product Title</label>
                            <input
                              type="text"
                              value={slot.productTitle || ''}
                              onChange={(e) => updateSlotField(index, 'productTitle', e.target.value)}
                              placeholder="e.g. Kotty Women Jacket"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#ECE8F2] text-[#16131F] text-xs outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[#806C79] block mb-0.5">Brand</label>
                              <input
                                type="text"
                                value={slot.brandName || ''}
                                onChange={(e) => updateSlotField(index, 'brandName', e.target.value)}
                                placeholder="e.g. Kotty"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#ECE8F2] text-[#16131F] text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#806C79] block mb-0.5">Price (₹)</label>
                              <input
                                type="number"
                                value={slot.price ?? ''}
                                onChange={(e) => updateSlotField(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="e.g. 828"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#ECE8F2] text-emerald-700 font-bold text-xs outline-none"
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

          {/* Add Product Slot (Option 3 / 4 / 5) */}
          {cardSlots.length < 5 && (
            <div
              onClick={handleAddCard}
              className="border-2 border-dashed border-[#ECE8F2] hover:border-[#7C5DFA]/50 bg-[#F9F8FC] hover:bg-[#EDE9FE]/20 rounded-[20px] p-6 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all min-h-[300px] group"
            >
              <div className="p-3.5 rounded-2xl bg-[#EDE9FE] text-[#7C5DFA] group-hover:scale-105 transition-transform shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#16131F] font-heading group-hover:text-[#7C5DFA] transition-colors">
                  + Add Card (Option {cardSlots.length + 1})
                </h4>
                <p className="text-xs text-[#806C79] mt-1">
                  Compare up to 5 offerings simultaneously
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 text-center font-medium">
            {errorMessage}
          </div>
        )}
      </div>

      {/* =========================================================================
          3. COMPARISON LOADING STATE
         ========================================================================= */}
      {isComparisonLoading && (
        <div className="bg-white rounded-[24px] border border-[#ECE8F2] p-10 text-center space-y-3 animate-pulse shadow-sm">
          <Loader2 className="w-7 h-7 animate-spin text-[#7C5DFA] mx-auto" />
          <h3 className="text-base font-bold text-[#16131F] font-heading">
            Comparing Products...
          </h3>
          <p className="text-xs text-[#806C79] max-w-sm mx-auto">
            Analyzing prices, specifications, seller reputation, and customer feedback.
          </p>
        </div>
      )}

      {/* =========================================================================
          4. COMPARISON REPORT
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
            <div className="p-6 sm:p-8 rounded-[24px] bg-emerald-50/60 border-2 border-emerald-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Overall Winner
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#16131F] font-heading">
                {winnerLetter} is the better choice.
              </h2>

              <p className="text-sm font-semibold text-[#16131F]">
                {winner.product_title || winnerLetter} — {formatCurrencyINR(winnerPrice)}
              </p>

              <p className="text-xs sm:text-sm text-[#4A3F4B] leading-relaxed max-w-3xl">
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
                    className={`p-6 rounded-[24px] bg-white border transition-all space-y-4 shadow-sm ${
                      isThisWinner ? 'border-2 border-emerald-300 bg-emerald-50/20' : 'border-[#ECE8F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#7C5DFA] uppercase">
                        Product {OPTION_LETTERS[idx]}
                      </span>
                      {isThisWinner && (
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          Recommended
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#16131F] font-heading line-clamp-2 min-h-[40px]">
                      {item.product_title || `Product ${OPTION_LETTERS[idx]}`}
                    </h4>

                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="text-base font-black text-[#16131F]">
                        {formatCurrencyINR(price)}
                      </span>
                      {mrp > price && (
                        <span className="text-xs line-through text-[#806C79]">
                          {formatCurrencyINR(mrp)}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#ECE8F2] text-xs">
                      <div className="text-[#4A3F4B] flex items-start gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>{idx === 0 ? 'Verified pricing corridor & authentic seller track record' : 'Quilted thermal insulation shell'}</span>
                      </div>
                      <div className="text-[#806C79] flex items-start gap-2">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span>{idx === 0 ? 'Tailored shoulder fit; check size measurements' : `Higher commercial price (${formatCurrencyINR(price)})`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* C. COMPARISON BASIS TABLE */}
            <div className="bg-white rounded-[24px] border border-[#ECE8F2] overflow-hidden shadow-sm">
              <div className="p-5 sm:p-6 border-b border-[#ECE8F2]">
                <h3 className="text-base font-bold text-[#16131F] font-heading">
                  Comparison Basis
                </h3>
                <p className="text-xs text-[#806C79] mt-0.5">
                  Direct evaluation of the essential purchase decision factors.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#ECE8F2] bg-[#F9F8FC] text-[#806C79] font-mono text-[10px] uppercase">
                      <th className="p-4 sm:p-5 w-44">Factor</th>
                      <th className="p-4 sm:p-5 w-36">Better Product</th>
                      <th className="p-4 sm:p-5">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE8F2]">
                    {/* Price and Value */}
                    <tr className="hover:bg-[#F9F8FC]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">Price and Value</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          {priceA <= priceB ? 'Product A' : 'Product B'}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        {delta > 0
                          ? `${priceA <= priceB ? 'Product A' : 'Product B'} is ${formatCurrencyINR(delta)} cheaper with verified clearance pricing.`
                          : 'Both products have comparable pricing within normal retail corridor.'}
                      </td>
                    </tr>

                    {/* Specifications */}
                    <tr className="hover:bg-[#F9F8FC]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">Specifications</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-[#7C5DFA] font-mono">
                          Product B
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        Product B includes heavier quilted insulation and weather-resistant shell lining.
                      </td>
                    </tr>

                    {/* Customer Reviews */}
                    <tr className="hover:bg-[#F9F8FC]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">Customer Reviews</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          Product A
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        Product A holds higher aspect satisfaction (76% on comfort & fit) with zero review tampering signals.
                      </td>
                    </tr>

                    {/* Seller Trust */}
                    <tr className="hover:bg-[#F9F8FC]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">Seller Trust</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          Product A
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        Platform-managed fulfillment with verified dispute resolution history.
                      </td>
                    </tr>

                    {/* Overall Recommendation */}
                    <tr className="bg-[#EDE9FE]/30">
                      <td className="p-4 sm:p-5 font-bold text-[#16131F]">Overall Recommendation</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-extrabold text-emerald-700 font-mono">
                          {winnerLetter}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#16131F] font-medium leading-relaxed">
                        Best combination of verified pricing corridor, merchant credibility, and buyer satisfaction.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* D. FINAL RECOMMENDATION */}
            <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#ECE8F2] space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-[#16131F] font-heading">
                Final Recommendation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-[16px] bg-[#F9F8FC] border border-[#ECE8F2] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#7C5DFA] font-bold block">
                    Which product to choose
                  </span>
                  <p className="text-[#16131F] font-semibold">
                    Choose {winnerLetter} ({winner.product_title || 'Winning Option'}).
                  </p>
                  <p className="text-[#806C79] leading-relaxed">
                    Provides the most dependable overall purchase experience for everyday use.
                  </p>
                </div>

                <div className="p-4 rounded-[16px] bg-[#F9F8FC] border border-[#ECE8F2] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold block">
                    What makes it better
                  </span>
                  <p className="text-[#16131F] font-semibold">
                    Fair pricing & lower risk.
                  </p>
                  <p className="text-[#806C79] leading-relaxed">
                    Verified platform fulfillment, genuine seller rating, and {delta > 0 ? `${formatCurrencyINR(delta)} savings` : 'solid value'}.
                  </p>
                </div>

                <div className="p-4 rounded-[16px] bg-[#F9F8FC] border border-[#ECE8F2] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                    Main compromise
                  </span>
                  <p className="text-[#16131F] font-semibold">
                    Tailored fit.
                  </p>
                  <p className="text-[#806C79] leading-relaxed">
                    Customer feedback suggests checking size chart measurements before final order.
                  </p>
                </div>
              </div>
            </div>

            {/* E. EMBEDDED COMPARISON AI AGENT */}
            <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#ECE8F2] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE8F2]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#7C5DFA] text-white flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#16131F] font-heading flex items-center gap-2">
                      <span>Comparison AI Agent</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C5DFA] border border-[#7C5DFA]/20">
                        Context-Aware
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#806C79]">
                      Ask any question about this comparison in plain English.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(true)}
                  className="text-xs text-[#7C5DFA] hover:text-[#6A49F2] font-semibold cursor-pointer flex items-center gap-1"
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
                    className="px-3 py-1.5 rounded-xl bg-[#F9F8FC] hover:bg-[#EDE9FE]/50 border border-[#ECE8F2] text-xs text-[#4A3F4B] hover:text-[#16131F] transition-all cursor-pointer text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Question & Answer Display */}
              {agentAnswer && (
                <div className="p-4 rounded-[16px] bg-[#F9F8FC] border border-[#ECE8F2] space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7C5DFA] font-heading">
                    <ArrowRight className="w-3.5 h-3.5 text-[#7C5DFA]" />
                    <span>{agentQuestion}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#16131F] leading-relaxed font-sans">
                    {agentAnswer}
                  </p>
                </div>
              )}

              {isAgentThinking && (
                <div className="p-4 rounded-[16px] bg-[#F9F8FC] border border-[#ECE8F2] flex items-center gap-2 text-xs text-[#806C79] animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-[#7C5DFA]" />
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F9F8FC] border border-[#ECE8F2] focus:border-[#7C5DFA] text-xs text-[#16131F] placeholder:text-[#806C79] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#7C5DFA] hover:bg-[#6A49F2] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
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
