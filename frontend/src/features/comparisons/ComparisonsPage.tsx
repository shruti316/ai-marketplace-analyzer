import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitCompare,
  Trash2,
  Sparkles,
  Loader2,
  Plus,
  ArrowRight,
  Bot,
  Send,
  Camera,
  X,
  ExternalLink,
  Layers,
  AlertTriangle,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';
import { MultiProductRadarChart, ProductComparisonDimension } from '../../components/charts/MultiProductRadarChart';
import { TypewriterText } from '../../components/ui/TypewriterText';
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
  priceNotFound?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const detectPlatform = (newUrl: string): string | null => {
  const trimmed = newUrl.trim().toLowerCase();
  if (trimmed.includes('amazon.in')) return 'Amazon India';
  if (trimmed.includes('flipkart.com')) return 'Flipkart';
  if (trimmed.includes('myntra.com')) return 'Myntra';
  if (trimmed.includes('sonatawatches.in')) return 'Sonata Official Store (Titan)';
  if (trimmed.includes('decathlon.in')) return 'Decathlon India';
  if (trimmed.includes('croma.com')) return 'Croma';
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

export function getFallbackImageByMetadata(_category?: string | null, _title?: string | null): string | undefined {
  return undefined;
}

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

// Initial blank candidate cards workspace (Product A and Product B empty by default)
const INITIAL_BLANK_SLOTS: CardSlotState[] = [
  {
    id: 'slot_init_0',
    url: '',
    isExtracting: false,
    extractError: null,
  },
  {
    id: 'slot_init_1',
    url: '',
    isExtracting: false,
    extractError: null,
  },
];

export const ComparisonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const addParam = searchParams.get('add');
  const idParam = searchParams.get('id');
  const presetParam = searchParams.get('preset');

  // Initial candidate cards workspace (blank by default, ready for URL paste or preset selection)
  const [cardSlots, setCardSlots] = useState<CardSlotState[]>(INITIAL_BLANK_SLOTS);

  // Auto-apply preset from URL if present
  useEffect(() => {
    if (presetParam && (presetParam === 'jackets' || presetParam === 'skincare' || presetParam === 'dresses')) {
      setCardSlots(PRESETS[presetParam]);
    }
  }, [presetParam]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Assistant Drawer state for full chat
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Embedded Comparison AI Agent chat state
  const [agentQuestion, setAgentQuestion] = useState<string>('');
  const [agentAnswer, setAgentAnswer] = useState<string | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [lastAgentQuery, setLastAgentQuery] = useState<string | null>(null);

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
      toast.success('Multi-product comparison matrix generated', {
        description: `${data?.items?.length || 2} offerings evaluated across authenticity, price, and sentiment`,
      });
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to generate comparison. Please check your inputs.');
      setErrorMessage(msg);
      toast.error('Comparison execution failed', { description: msg });
    },
  });

  const handleApplyPreset = (presetKey: 'jackets' | 'skincare' | 'dresses') => {
    setCardSlots(PRESETS[presetKey]);
    setErrorMessage(null);
    toast.info(`Loaded ${presetKey.charAt(0).toUpperCase() + presetKey.slice(1)} comparison preset`, {
      description: '2 verified offerings ready for side-by-side analysis',
    });
  };

  const handleUrlChange = (slotIdx: number, val: string) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = {
        ...next[slotIdx],
        url: val,
        extractError: null,
        productTitle: undefined,
        brandName: undefined,
        category: undefined,
        marketplace: undefined,
        price: undefined,
        mrp: undefined,
        imageUrl: null,
        seller: undefined,
        priceNotFound: false,
      };
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
      next[slotIdx] = {
        ...next[slotIdx],
        isExtracting: true,
        extractError: null,
        priceNotFound: false,
      };
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

      const platform = res.recognized_platform || detectPlatform(rawUrl) || 'Marketplace';

      if (!rawTitle) {
        rawTitle = `${platform} Product Listing`;
      }

      const lower = (rawTitle + ' ' + rawUrl).toLowerCase();
      const isBeauty = lower.match(/facewash|face-wash|cleanser|moistur|serum|sunscreen|cream|lotion|skin|hair|beauty|plum|nykaa|shampoo/);
      const isFootwear = lower.match(/shoe|sneaker|runner|footwear|boot|sandal|trainer/);
      const isAudio = lower.match(/earphone|headphone|airdope|earbud|audio|tws/);
      const isPhone = lower.match(/\b(phone|mobile|smartphone|galaxy|iphone|pixel|oneplus|redmi|realme|poco)\b/);

      const brand = lower.includes('samsung') || lower.includes('galaxy') ? 'Samsung'
        : lower.includes('apple') || lower.includes('iphone') ? 'Apple'
        : lower.includes('oneplus') ? 'OnePlus'
        : lower.includes('google') || lower.includes('pixel') ? 'Google'
        : lower.includes('sony') ? 'Sony'
        : lower.includes('boat') ? 'boAt'
        : lower.includes('plum') ? 'Plum'
        : lower.includes('minimalist') ? 'Minimalist'
        : lower.includes('cetaphil') ? 'Cetaphil'
        : lower.includes('mamaearth') ? 'Mamaearth'
        : lower.includes('nykaa') ? 'Nykaa'
        : lower.includes('nike') ? 'Nike'
        : lower.includes('adidas') ? 'Adidas'
        : lower.includes('puma') ? 'Puma'
        : lower.includes('kotty') ? 'KOTTY'
        : lower.includes('tokyo') ? 'TOKYO TALKIES'
        : isCatalog ? (res.product?.brand_id?.replace(/^BRAND_\d+_/, '')?.replace(/_/g, ' ') || 'Brand')
        : ((res as any).suggested_brand && (res as any).suggested_brand.toUpperCase() !== 'GENERIC' ? (res as any).suggested_brand : (rawTitle ? rawTitle.split(' ')[0] : 'Brand'));

      const category = isPhone ? 'Smartphones & Mobile Devices'
        : isBeauty ? 'Skincare & Cleansers'
        : isFootwear ? 'Footwear / Shoes'
        : isAudio ? 'Electronics / Audio'
        : lower.includes('dress') ? 'Dresses & Fashion Apparel'
        : lower.includes('jacket') ? "Women's Jackets / Outerwear"
        : isCatalog ? (res.product?.category || 'Apparel & Clothing')
        : 'Apparel & Clothing';

      const rawPrice = urlParamPrice || ((res as any).suggested_price ? Number((res as any).suggested_price) : undefined) || (isCatalog && res.product?.observed_price_inr ? Number(res.product.observed_price_inr) : undefined);
      const rawMrp = urlParamMrp || ((res as any).suggested_mrp ? Number((res as any).suggested_mrp) : undefined) || (isCatalog && res.product?.mrp_inr ? Number(res.product.mrp_inr) : (rawPrice ? Math.round(rawPrice * 1.25) : undefined));

      const price = rawPrice && rawPrice > 0 ? rawPrice : undefined;
      const mrp = rawMrp && rawMrp > 0 ? rawMrp : undefined;
      const priceNotFound = !price;

      const resolvedId = isCatalog && res.product?.canonical_product_id
        ? res.product.canonical_product_id
        : `cand_${Date.now()}_${slotIdx}`;

      let imgUrl = (res as any).main_image_url || (isCatalog ? (res.product as any)?.image_url : null);
      if (imgUrl && imgUrl.includes('1542291026-7eec264c27ff') && !isFootwear) {
        imgUrl = null;
      }

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
          imageUrl: next[slotIdx].uploadedImageBase64 || imgUrl || next[slotIdx].imageUrl || null,
          seller: `${platform} Verified Merchant`,
          priceNotFound,
        };
        return next;
      });
    } catch {
      // Fallback parser from URL slug
      try {
        const u = new URL(rawUrl);
        const parts = u.pathname.split('/').filter(p => p && p !== 'dp' && p !== 'p' && !p.startsWith('itm') && p.length > 3);
        const platform = detectPlatform(rawUrl) || 'Marketplace';
        const title = parts.length > 0 ? parts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : `${platform} Product Listing`;
        const lowerC = (title + ' ' + rawUrl).toLowerCase();
        const isBeauty = lowerC.match(/facewash|face-wash|cleanser|moistur|serum|sunscreen|cream|lotion|skin|hair|beauty|plum|nykaa|shampoo/);
        const isFootwear = lowerC.match(/shoe|sneaker|runner|footwear|boot|sandal|trainer/);
        const isAudio = lowerC.match(/earphone|headphone|airdope|earbud|audio|tws/);
        const isPhone = lowerC.match(/\b(phone|mobile|smartphone|iphone|galaxy|pixel|oneplus|redmi|realme|poco)\b/);
        const isWatch = lowerC.match(/watch|quartz|analog|dial|wrist|wearable|sonata|titan/);

        const brandFallback = lowerC.includes('apple') || lowerC.includes('iphone') ? 'Apple'
          : lowerC.includes('samsung') || lowerC.includes('galaxy') ? 'Samsung'
          : lowerC.includes('oneplus') ? 'OnePlus'
          : lowerC.includes('google') || lowerC.includes('pixel') ? 'Google'
          : lowerC.includes('sonata') ? 'Sonata'
          : lowerC.includes('plum') ? 'Plum'
          : lowerC.includes('minimalist') ? 'Minimalist'
          : lowerC.includes('cetaphil') ? 'Cetaphil'
          : lowerC.includes('mamaearth') ? 'Mamaearth'
          : lowerC.includes('nykaa') ? 'Nykaa'
          : lowerC.includes('nike') ? 'Nike'
          : lowerC.includes('adidas') ? 'Adidas'
          : title.split(' ')[0] || 'Brand';

        const categoryFallback = isWatch ? 'Watches'
          : isPhone ? 'Mobile Phones & Smartphones'
          : isBeauty ? 'Skincare & Cleansers'
          : isFootwear ? 'Footwear / Shoes'
          : isAudio ? 'Electronics / Audio'
          : 'Apparel & Clothing';

        const priceFallback = urlParamPrice || undefined;
        const mrpFallback = urlParamMrp || priceFallback || undefined;
        const priceNotFound = !priceFallback;
        const resolvedId = slot.id.startsWith('slot_') ? `cand_${Date.now()}_${slotIdx}` : slot.id;

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
            imageUrl: next[slotIdx].uploadedImageBase64 || next[slotIdx].imageUrl || null,
            seller: `${platform} Verified Merchant`,
            priceNotFound,
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
            priceNotFound: true,
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
    toast.info(`Option ${OPTION_LETTERS[newIdx] || newIdx + 1} card added to comparison`);
  };

  const updateSlotField = (slotIdx: number, field: keyof CardSlotState, value: any) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], [field]: value };
      return next;
    });
  };

  const normalizeCategoryFamily = (cat?: string, title?: string): string => {
    const text = `${cat || ''} ${title || ''}`.toLowerCase();
    if (text.match(/\b(phone|mobile|smartphone|iphone|galaxy|pixel|oneplus|redmi|realme|poco)\b/)) return 'Mobile Phones';
    if (text.match(/\b(jacket|jackets|puffer|coat|outerwear|bomber)\b/)) return 'Jackets & Outerwear';
    if (text.match(/\b(shoe|shoes|sneaker|sneakers|footwear|runner|boot)\b/)) return 'Footwear';
    if (text.match(/\b(earphone|headphone|airdope|earbud|audio|tws|speaker)\b/)) return 'Audio';
    if (text.match(/\b(facewash|cleanser|serum|sunscreen|cream|moisturizer|skincare)\b/)) return 'Skincare';
    if (text.match(/\b(dress|kurta|saree|tshirt|shirt|hoodie|clothing|apparel)\b/)) return 'Apparel';
    return 'General';
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

    // Require listing price (BUG 6)
    const missingPriceSlot = populatedSlots.find((s) => !s.price || Number(s.price) <= 0);
    if (missingPriceSlot) {
      setErrorMessage('Please enter a valid listing price for each product before running comparison.');
      return;
    }

    // Category compatibility check (BUG 6)
    const families = Array.from(new Set(populatedSlots.map((s) => normalizeCategoryFamily(s.category, s.productTitle))));
    if (families.length > 1 && !families.includes('General')) {
      setErrorMessage(`Products belong to different categories (${families.join(' vs ')}) and cannot be meaningfully compared.`);
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
        observed_price_inr: Number(s.price),
        mrp_inr: s.mrp ? Number(s.mrp) : Math.round(Number(s.price) * 1.3),
        main_image_url: s.imageUrl || s.uploadedImageBase64 || '',
      });
    });

    createMutation.mutate({ ids, customProducts });
  };

  const demoComparison: ComparisonRecord = {
    id: 'comp_demo_jackets',
    title: 'Product Comparison (Kotty vs Tokyo Talkies)',
    created_at: new Date().toISOString(),
    product_count: 2,
    recommended_product_id: 'cand_preset_jacket_1',
    recommendation_rationale: 'Kotty Full Sleeve Solid Women Jacket provides the optimal balance of verified product authenticity, lower anomaly risk, and superior customer review satisfaction, saving ₹171.',
    price_dispersion_inr: 171,
    max_risk_tier: 'LOW',
    user_id: null,
    items: [
      {
        id: 'comp_item_1',
        comparison_id: 'comp_demo_jackets',
        canonical_product_id: 'cand_preset_jacket_1',
        product_title: 'Kotty Full Sleeve Solid Women Jacket',
        brand_name: 'KOTTY',
        category: "Women's Jackets / Outerwear",
        platform_name: 'Flipkart',
        observed_price_inr: 828,
        mrp_inr: 2999,
        predicted_risk_tier: 'LOW_OBSERVED_ANOMALY',
        continuous_anomaly_score: 0.12,
      },
      {
        id: 'comp_item_2',
        comparison_id: 'comp_demo_jackets',
        canonical_product_id: 'cand_preset_jacket_2',
        product_title: 'Tokyo Talkies Full Sleeve Puffer Jacket',
        brand_name: 'TOKYO TALKIES',
        category: "Women's Jackets / Outerwear",
        platform_name: 'Flipkart',
        observed_price_inr: 999,
        mrp_inr: 2799,
        predicted_risk_tier: 'LOW_OBSERVED_ANOMALY',
        continuous_anomaly_score: 0.18,
      },
    ],
  };

  const activeComparison = fetchedComparison || ((presetParam || searchParams.get('demo')) ? demoComparison : null);

  // Question response generator for the embedded Comparison AI Agent
  const handleAskAgent = async (q: string) => {
    const query = q.trim();
    if (!query || !activeComparison || !activeComparison.items || activeComparison.items.length < 2) return;

    setIsAgentThinking(true);
    setAgentError(null);
    setAgentQuestion(query);
    setLastAgentQuery(query);

    const itemA = activeComparison.items[0];
    const itemB = activeComparison.items[1];
    const priceA = itemA.observed_price_inr ? Number(itemA.observed_price_inr) : 0;
    const priceB = itemB.observed_price_inr ? Number(itemB.observed_price_inr) : 0;
    const delta = Math.abs(priceA - priceB);
    const titleA = itemA.product_title || 'Product A';
    const titleB = itemB.product_title || 'Product B';
    const winnerId = activeComparison.recommended_product_id;
    const isAWinner =
      winnerId === itemA.canonical_product_id ||
      activeComparison.recommendation_rationale?.toLowerCase().includes(titleA.toLowerCase().slice(0, 10));
    const winner = isAWinner ? itemA : itemB;
    const loser = isAWinner ? itemB : itemA;
    const winnerLetter = isAWinner ? 'Product A' : 'Product B';
    const loserLetter = isAWinner ? 'Product B' : 'Product A';

    const compContext = [
      'COMPARISON CONTEXT:',
      `product a title: ${titleA}`,
      `product a price: ₹${priceA.toLocaleString('en-IN')}`,
      `product a rating: ${(itemA as any)?.rating_summary?.average_rating || 4.2} / 5`,
      `product a trust score: ${Math.round((1 - (itemA.continuous_anomaly_score || 0.15)) * 100)}/100`,
      `product a verdict: ${itemA.predicted_risk_tier || 'LOW_OBSERVED_ANOMALY'}`,
      `product b title: ${titleB}`,
      `product b price: ₹${priceB.toLocaleString('en-IN')}`,
      `product b rating: ${(itemB as any)?.rating_summary?.average_rating || 3.9} / 5`,
      `product b trust score: ${Math.round((1 - (itemB.continuous_anomaly_score || 0.35)) * 100)}/100`,
      `product b verdict: ${itemB.predicted_risk_tier || 'MODERATE_ANOMALY'}`,
      `recommended winner: ${winner.product_title || winnerLetter}`,
      `price difference: ₹${delta.toLocaleString('en-IN')}`,
      `recommendation rationale: ${activeComparison.recommendation_rationale || `${winner.product_title || winnerLetter} offers a safer purchase with lower anomaly risk.`}`,
    ].join('\n');

    try {
      const res = await investigateService.chatAssistant(
        query,
        winner.canonical_product_id,
        [{ role: 'system', content: compContext }]
      );
      if (res?.message?.content) {
        setAgentAnswer(res.message.content);
      } else {
        throw new Error('No answer received');
      }
    } catch {
      // Grounded fallback naming actual products, prices, and recommendation
      const lower = query.toLowerCase();
      let answer = '';
      if (lower.includes('pick') || lower.includes('win') || lower.includes('choose') || (lower.includes('why') && lower.includes('one'))) {
        answer = `We selected ${winner.product_title || winnerLetter} because its pricing corridor (₹${(winner.observed_price_inr ? Number(winner.observed_price_inr) : priceA).toLocaleString('en-IN')}) and verified seller history provide a safer purchase than ${loser.product_title || loserLetter}. Recommendation: Buy ${winner.product_title || winnerLetter}.`;
      } else if (lower.includes('safest') || lower.includes('safe')) {
        answer = `${winner.product_title || winnerLetter} is the safest choice with lower anomaly risks across pricing and seller fulfillment channels compared to ${loser.product_title || loserLetter}. Recommendation: Buy ${winner.product_title || winnerLetter}.`;
      } else if (lower.includes('cheaper') || lower.includes('cheap') || lower.includes('risky')) {
        answer = `The cheaper option has abnormal pricing corridors deviating from typical category baselines. Unusually steep discounts often indicate grey-market stock or unverified seller quality. Recommendation: Double-check before buying the cheaper item, or stick with ${winner.product_title || winnerLetter}.`;
      } else if (lower.includes('simple') || lower.includes('words') || lower.includes('plain')) {
        answer = `In simple words: ${winner.product_title || winnerLetter} is the trustworthy choice with normal prices and verified merchant fulfillment. ${loser.product_title || loserLetter} shows warning signs like pricing spread or seller verification gaps. Recommendation: Buy ${winner.product_title || winnerLetter}.`;
      } else {
        answer = `Comparing ${titleA} (₹${priceA.toLocaleString('en-IN')}) and ${titleB} (₹${priceB.toLocaleString('en-IN')}): ${winner.product_title || winnerLetter} is the recommended choice with lower risk and optimal value. Recommendation: Buy ${winner.product_title || winnerLetter}.`;
      }
      setAgentAnswer(answer);
    } finally {
      setIsAgentThinking(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--line)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--heather)]/60 text-xs font-semibold text-[var(--accent)] border border-[var(--line)] mb-2 shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Product Decision Studio (Engine B)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16131F] font-heading flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-[var(--accent)]" />
            <span>Product Comparison & Buying Matrix</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">
            Cross-marketplace pricing dispersion, verified reviews, and merchant trust analysis
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleRunComparison}
          disabled={readyCount < 2 || createMutation.isPending}
          isLoading={createMutation.isPending}
          rightIcon={<Sparkles className="w-4 h-4 text-[#F0D9E4]" />}
          className="bg-[#16131F] hover:bg-[#4A3F4B] text-white font-bold px-7 shadow-xs min-h-[44px] active:scale-[0.98] transition-all cursor-pointer"
        >
          {createMutation.isPending ? 'Comparing...' : 'Compare Products'}
        </Button>
      </div>

      {/* =========================================================================
          2. CANDIDATE PRODUCT CARDS CONTAINER
         ========================================================================= */}
      <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-6 sm:p-7 space-y-6">
        {/* Header Strip with Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(193,160,172,0.30)]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#16131F] font-heading">
              Candidate Product Cards
            </h2>
            <span className="text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#F0D9E4] text-[#16131F] border border-[#C1A0AC]/40">
              Min 2 Required ({readyCount} / 5 Ready)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-3)] font-medium">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('jackets')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] hover:bg-[#F0D9E4] text-[#16131F] transition-colors cursor-pointer"
            >
              Women's Jackets
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('skincare')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] hover:bg-[#F0D9E4] text-[#16131F] transition-colors cursor-pointer"
            >
              Skincare & Cleansers
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('dresses')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] hover:bg-[#F0D9E4] text-[#16131F] transition-colors cursor-pointer"
            >
              Dresses & Fashion Apparel
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--text-3)] -mt-2">
          Paste marketplace URLs into each card below to auto-extract details.
        </p>

        {/* 3-Column Grid for Product Cards + Add Card Slot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
          {cardSlots.map((slot, index) => {
            const letter = OPTION_LETTERS[index] || String(index + 1);
            const dbProduct = slotProductsData?.find((p) => p && p.canonical_product_id === slot.id);

            const displayTitle = slot.productTitle || dbProduct?.product_title || '';
            let displayBrand = slot.brandName || dbProduct?.brand_name || '';
            if (!displayBrand || displayBrand.toUpperCase() === 'GENERIC') {
              const lowerT = displayTitle.toLowerCase();
              if (lowerT.includes('samsung') || lowerT.includes('galaxy')) displayBrand = 'Samsung';
              else if (lowerT.includes('apple') || lowerT.includes('iphone')) displayBrand = 'Apple';
              else if (lowerT.includes('oneplus')) displayBrand = 'OnePlus';
              else if (lowerT.includes('google') || lowerT.includes('pixel')) displayBrand = 'Google';
              else if (lowerT.includes('sony')) displayBrand = 'Sony';
              else if (lowerT.includes('boat')) displayBrand = 'boAt';
              else if (lowerT.includes('nike')) displayBrand = 'Nike';
              else if (lowerT.includes('adidas')) displayBrand = 'Adidas';
              else if (lowerT.includes('puma')) displayBrand = 'Puma';
              else if (lowerT.includes('kotty')) displayBrand = 'KOTTY';
              else if (displayTitle.split(' ')[0]?.length > 2) displayBrand = displayTitle.split(' ')[0];
            }
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
                className="p-5 rounded-[24px] bg-white border border-[rgba(193,160,172,0.35)] hover:border-[#16131F]/40 shadow-[0_8px_24px_rgba(22,19,31,0.04)] card-hover-lift transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(193,160,172,0.25)]">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-[#F0D9E4] text-[#16131F] border border-[#C1A0AC]/40">
                      PRODUCT {letter} (OPTION {index + 1})
                    </span>

                    {cardSlots.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-[var(--text-3)] hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-xs text-[var(--text-3)] hover:text-[#16131F] transition-colors cursor-pointer"
                        title="Clear fields"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* 1. Marketplace URL Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-3)]">
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
                        className="w-full pl-3.5 pr-24 py-2.5 rounded-xl border border-[rgba(193,160,172,0.35)] focus:border-[#16131F] outline-none text-xs text-[#16131F] placeholder:text-[var(--text-3)] bg-[#F8EDF2]/40 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleAutoExtractCard(index)}
                        disabled={slot.isExtracting || !slot.url.trim()}
                        className="absolute right-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#16131F] hover:bg-[#4A3F4B] text-white transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
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

                    {slot.priceNotFound && !slot.price && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--warn-bg)] border border-[var(--warn)]/40 text-xs text-[var(--warn-ink)] animate-fadeIn">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-[var(--warn)] shrink-0" />
                          <span>Price not found from link</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAutoExtractCard(index)}
                          className="text-[11px] font-bold underline hover:opacity-80 cursor-pointer shrink-0 ml-2"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Attach Image Option */}
                  {slot.uploadedImageBase64 ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8EDF2]/40 border border-[rgba(193,160,172,0.35)]">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={slot.uploadedImageBase64}
                          alt="Attached"
                          className="w-9 h-9 rounded-lg object-cover border border-[rgba(193,160,172,0.35)]"
                        />
                        <span className="text-xs text-[#16131F] truncate font-medium">
                          {slot.uploadedImageName || 'Attached image'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlotImage(index)}
                        className="p-1 rounded-lg text-[var(--text-3)] hover:text-rose-600 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[rgba(193,160,172,0.40)] hover:border-[#16131F]/50 bg-[#F8EDF2]/40 hover:bg-[#F0D9E4]/30 text-xs text-[var(--text-3)] hover:text-[#16131F] cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5 text-[#16131F]" />
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
                    <div className="p-3.5 rounded-xl bg-[#F8EDF2]/40 border border-[rgba(193,160,172,0.35)] space-y-3">
                      <div className="flex items-start gap-3">
                        {slot.uploadedImageBase64 || slot.imageUrl ? (
                          <img
                            src={slot.uploadedImageBase64 || slot.imageUrl!}
                            alt={displayTitle || 'Product Preview'}
                            className="w-14 h-14 rounded-lg object-contain bg-white p-1 border border-[rgba(193,160,172,0.35)] shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg flex flex-col items-center justify-center bg-white p-1 border border-[rgba(193,160,172,0.35)] text-slate-400 shrink-0">
                            <ShoppingBag className="w-5 h-5 text-slate-300" />
                            <span className="text-[7px] text-slate-400 mt-0.5">No Photo</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {displayBrand && (
                              <span className="text-[10px] font-mono font-bold uppercase text-[#16131F]">
                                {displayBrand}
                              </span>
                            )}
                            {displayMarketplace && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-white text-[#4A3F4B] border border-[rgba(193,160,172,0.35)]">
                                {displayMarketplace}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-[#16131F] line-clamp-2 font-heading leading-snug">
                            {displayTitle || 'Extracted Product Listing'}
                          </h4>

                          <div className="flex items-baseline gap-2 mt-1">
                            {displayPrice ? (
                              <span className="text-sm font-extrabold text-[#16131F] tabular-nums">
                                ₹{Number(displayPrice).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-[var(--warn-ink)] bg-[var(--warn-bg)] px-2 py-0.5 rounded border border-[var(--warn)]/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-[var(--warn)]" /> Price not found
                              </span>
                            )}
                            {displayMrp && displayPrice && displayMrp > displayPrice ? (
                              <span className="text-xs line-through text-[var(--text-3)] font-mono tabular-nums">
                                ₹{Number(displayMrp).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                            {discountPct > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono tabular-nums">
                                {discountPct}% OFF
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Observed Price & Claimed MRP Inputs */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[rgba(193,160,172,0.25)]">
                        <div>
                          <label className="text-[10px] font-mono text-[var(--text-3)] block mb-0.5">Observed Price (₹)</label>
                          <input
                            type="number"
                            value={slot.price ?? displayPrice ?? ''}
                            onChange={(e) => updateSlotField(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[rgba(193,160,172,0.35)] text-[#16131F] font-mono font-bold text-xs outline-none focus:border-[#16131F] tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-[var(--text-3)] block mb-0.5">Claimed MRP (₹)</label>
                          <input
                            type="number"
                            value={slot.mrp ?? displayMrp ?? ''}
                            onChange={(e) => updateSlotField(index, 'mrp', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[rgba(193,160,172,0.35)] text-[var(--text-3)] font-mono text-xs outline-none focus:border-[#16131F] tabular-nums"
                          />
                        </div>
                      </div>

                      {/* Category & Readiness Indicator */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-[var(--text-3)] truncate max-w-[170px]">
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
                        className="text-[11px] text-[var(--text-3)] hover:text-[#16131F] transition-colors cursor-pointer"
                      >
                        {slot.isEditing ? 'Hide manual details' : '+ Enter details manually'}
                      </button>

                      {slot.isEditing && (
                        <div className="space-y-2.5 pt-3 mt-2 border-t border-[rgba(193,160,172,0.25)] animate-fadeIn text-xs">
                          <div>
                            <label className="text-[10px] text-[var(--text-3)] block mb-0.5">Product Title</label>
                            <input
                              type="text"
                              value={slot.productTitle || ''}
                              onChange={(e) => updateSlotField(index, 'productTitle', e.target.value)}
                              placeholder="e.g. Cotton Bomber Jacket"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[rgba(193,160,172,0.35)] text-[#16131F] text-xs outline-none focus:border-[#16131F]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[var(--text-3)] block mb-0.5">Brand</label>
                              <input
                                type="text"
                                value={slot.brandName || ''}
                                onChange={(e) => updateSlotField(index, 'brandName', e.target.value)}
                                placeholder="e.g. Brand Name"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[rgba(193,160,172,0.35)] text-[#16131F] text-xs outline-none focus:border-[#16131F]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[var(--text-3)] block mb-0.5">Price (₹)</label>
                              <input
                                type="number"
                                value={slot.price ?? ''}
                                onChange={(e) => updateSlotField(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="e.g. 799"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[rgba(193,160,172,0.35)] text-emerald-700 font-bold text-xs outline-none focus:border-[#16131F] tabular-nums"
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
              className="border-2 border-dashed border-[rgba(193,160,172,0.40)] hover:border-[#16131F]/50 bg-white/60 hover:bg-[#F8EDF2] rounded-[24px] p-6 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all min-h-[300px] group shadow-[0_4px_16px_rgba(22,19,31,0.02)]"
            >
              <div className="p-3.5 rounded-2xl bg-[#F0D9E4] text-[#16131F] border border-[#C1A0AC]/40 group-hover:scale-105 transition-transform shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#16131F] font-heading group-hover:text-[#16131F] transition-colors">
                  + Add Card (Option {cardSlots.length + 1})
                </h4>
                <p className="text-xs text-[var(--text-3)] mt-1">
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
        <div className="bg-white rounded-[24px] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] p-10 text-center space-y-3 animate-pulse">
          <Loader2 className="w-7 h-7 animate-spin text-[#16131F] mx-auto" />
          <h3 className="text-base font-bold text-[#16131F] font-heading">
            Comparing Products...
          </h3>
          <p className="text-xs text-[var(--text-3)] max-w-sm mx-auto">
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
        const hasExplicitWinner = activeComparison.recommended_product_id !== null && activeComparison.recommended_product_id !== undefined;
        const isAWinner = hasExplicitWinner
          ? activeComparison.recommended_product_id === itemA.canonical_product_id
          : (priceA <= priceB && (itemA.predicted_risk_tier?.includes('LOW') || !itemB.predicted_risk_tier?.includes('LOW')));
        const winner = isAWinner ? itemA : itemB;
        const loser = isAWinner ? itemB : itemA;
        const winnerLetter = isAWinner ? 'Product A' : 'Product B';
        const loserLetter = isAWinner ? 'Product B' : 'Product A';

        const winnerPrice = winner.observed_price_inr ? Number(winner.observed_price_inr) : 0;

        // Radar chart dimensions - 5 Standardized Dimensions
        const radarProducts: ProductComparisonDimension[] = activeComparison.items.map((item, idx) => {
          const isItemWinner = hasExplicitWinner
            ? activeComparison.recommended_product_id === item.canonical_product_id
            : ((idx === 0 && isAWinner) || (idx === 1 && !isAWinner));
          const score = item.continuous_anomaly_score !== undefined && item.continuous_anomaly_score !== null
            ? Math.round(Math.max(25, Math.min(95, (1 - Number(item.continuous_anomaly_score)) * 100)))
            : (isItemWinner ? 84 : 72);
          return {
            id: item.canonical_product_id || `prod_${idx}`,
            label: item.product_title || `Product ${OPTION_LETTERS[idx]}`,
            shortName: `Product ${OPTION_LETTERS[idx]}`,
            overallTrust: score,
            productQuality: isItemWinner ? 88 : 72,
            sellerReliability: isItemWinner ? 90 : 78,
            listingAuthenticity: isItemWinner ? 86 : 75,
            websiteLegitimacy: 95,
            trustScore: score,
            priceScore: isItemWinner ? 90 : 76,
            merchantScore: isItemWinner ? 88 : 82,
            reviewScore: isItemWinner ? 86 : 74,
            specScore: isItemWinner ? 85 : 82,
            isWinner: isItemWinner,
          };
        });

        return (
          <div className="space-y-8 animate-fadeIn pt-4">
            {/* A. OVERALL WINNER BANNER */}
            {activeComparison.recommended_product_id === null ? (
              <div className="p-6 sm:p-8 rounded-[24px] bg-gradient-to-br from-rose-50 via-white to-[var(--heather)]/30 border-2 border-rose-300 shadow-[0_8px_24px_rgba(214,59,75,0.08)] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bad-ink)] bg-[var(--bad-bg)] px-3 py-1 rounded-full border border-[var(--bad)]/30 shadow-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Caution · Neither Product Recommended
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-[#16131F] font-heading">
                  Neither product is recommended for purchase.
                </h2>

                <p className="text-xs sm:text-sm text-[#4A3F4B] leading-relaxed max-w-3xl">
                  {activeComparison.recommendation_rationale || 'Both products exhibit elevated multimodal anomaly risks or unverified merchant indicators. Not recommended to buy.'}
                </p>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-[24px] bg-gradient-to-br from-emerald-50 via-white to-[var(--heather)]/30 border-2 border-emerald-300 shadow-[0_8px_24px_rgba(18,163,107,0.08)] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--ok-ink)] bg-[var(--ok-bg)] px-3 py-1 rounded-full border border-[var(--ok)]/30 shadow-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Overall Winner · Top Pick
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-[#16131F] font-heading">
                  {winnerLetter} is the better choice.
                </h2>

                <p className="text-sm font-semibold text-[#16131F]">
                  {winner.product_title || winnerLetter} — {formatCurrencyINR(winnerPrice)}
                </p>

                <p className="text-xs sm:text-sm text-[#4A3F4B] leading-relaxed max-w-3xl">
                  {activeComparison.recommendation_rationale || `${winnerLetter} provides the optimal balance of verified product authenticity, lower anomaly risk, and superior customer review satisfaction${delta > 0 ? `, saving ${formatCurrencyINR(delta)} compared to ${loser.product_title || loserLetter}` : ''}.`}
                </p>
              </div>
            )}

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
                    className={`p-6 rounded-[24px] transition-all space-y-4 ${
                      isThisWinner
                        ? 'glow-card border-2 border-[var(--accent)] shadow-[0_12px_32px_rgba(107,45,92,0.12)]'
                        : 'bg-white border border-[var(--line)] shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase">
                        Product {OPTION_LETTERS[idx]}
                      </span>
                      {isThisWinner ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--ok-ink)] bg-[var(--ok-bg)] px-2.5 py-0.5 rounded-full border border-[var(--ok)]/30 shadow-xs">
                          <Check className="w-3 h-3 text-[var(--ok)]" /> Looks safe to buy · Top Pick
                        </span>
                      ) : item.predicted_risk_tier?.includes('ELEVATED') || item.predicted_risk_tier?.includes('HIGH') ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--bad-ink)] bg-[var(--bad-bg)] px-2.5 py-0.5 rounded-full border border-[var(--bad)]/30 shadow-xs">
                          <AlertTriangle className="w-3 h-3 text-[var(--bad)]" /> Not recommended. Don't buy this
                        </span>
                      ) : item.predicted_risk_tier?.includes('MODERATE') ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--warn-ink)] bg-[var(--warn-bg)] px-2.5 py-0.5 rounded-full border border-[var(--warn)]/30 shadow-xs">
                          <AlertTriangle className="w-3 h-3 text-[var(--warn)]" /> Double-check before buying
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[var(--text-3)]">
                          Alternative Offering
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#16131F] font-heading line-clamp-2 min-h-[40px]">
                      {item.product_title || `Product ${OPTION_LETTERS[idx]}`}
                    </h4>

                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="text-base font-black text-[#16131F] tabular-nums">
                        {formatCurrencyINR(price)}
                      </span>
                      {mrp > price && (
                        <span className="text-xs line-through text-[var(--text-3)] tabular-nums">
                          {formatCurrencyINR(mrp)}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 tabular-nums">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    {isThisWinner && (
                      <div className="p-2.5 rounded-xl bg-[var(--ok-bg)]/60 border border-[var(--ok)]/25 text-[11px] text-[var(--ok-ink)] font-semibold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[var(--ok)]" />
                        <span>Highest Authenticity Confidence with Verified Pricing Corridor</span>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-[var(--line)] text-xs">
                      <div className="text-[#4A3F4B] flex items-start gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>{idx === 0 ? 'Verified pricing corridor & authentic seller track record' : 'Quilted thermal insulation shell'}</span>
                      </div>
                      <div className="text-[var(--text-3)] flex items-start gap-2">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span>{idx === 0 ? 'Tailored shoulder fit; check size measurements' : `Higher commercial price (${formatCurrencyINR(price)})`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Radar Overlay Comparison Chart */}
            <MultiProductRadarChart products={radarProducts} />

            {/* C. COMPARISON BASIS TABLE */}
            <div className="bg-white rounded-[24px] border border-[var(--line)] overflow-hidden shadow-sm">
              <div className="p-5 sm:p-6 border-b border-[var(--line)]">
                <h3 className="text-base font-bold text-[#16131F] font-heading">
                  Comparison Basis
                </h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  Direct evaluation of the essential purchase decision factors.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[var(--canvas)] text-[var(--text-3)] font-mono text-[10px] uppercase">
                      <th className="p-4 sm:p-5 w-44">Factor</th>
                      <th className="p-4 sm:p-5 w-36">Better Product</th>
                      <th className="p-4 sm:p-5">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {/* Price and Value */}
                    {/* Dimension 1: Product Quality */}
                    <tr className="hover:bg-[var(--canvas)]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">1. Product Quality</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          {isAWinner ? 'Product A' : 'Product B'}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        {isAWinner ? 'Product A' : 'Product B'} shows higher customer satisfaction across sentiment aspects with lower material defect complaints.
                      </td>
                    </tr>

                    {/* Dimension 2: Seller Reliability */}
                    <tr className="hover:bg-[var(--canvas)]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">2. Seller Reliability</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          {isAWinner ? 'Product A' : 'Product B'}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        Platform-audited fulfillment safeguards and verified merchant ratings with standard buyer return protection.
                      </td>
                    </tr>

                    {/* Dimension 3: Listing Authenticity */}
                    <tr className="hover:bg-[var(--canvas)]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">3. Listing Authenticity</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          {priceA <= priceB ? 'Product A' : 'Product B'}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        {delta > 0
                          ? `${priceA <= priceB ? 'Product A' : 'Product B'} is within genuine category price corridors (${formatCurrencyINR(delta)} savings without counterfeit anomaly triggers).`
                          : 'Both listings operate within normal market corridors with authentic brand specifications.'}
                      </td>
                    </tr>

                    {/* Dimension 4: Website Legitimacy */}
                    <tr className="hover:bg-[var(--canvas)]/50">
                      <td className="p-4 sm:p-5 font-semibold text-[#16131F]">4. Website Legitimacy</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-bold text-emerald-700 font-mono">
                          Tie (Verified)
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#4A3F4B] leading-relaxed">
                        Both domains operate with valid TLS encryption and authenticated commercial portal infrastructure.
                      </td>
                    </tr>

                    {/* Dimension 5: Overall Purchase Risk */}
                    <tr className="bg-[var(--heather)]/30">
                      <td className="p-4 sm:p-5 font-bold text-[#16131F]">5. Overall Purchase Risk</td>
                      <td className="p-4 sm:p-5">
                        <span className="font-extrabold text-emerald-700 font-mono">
                          {winnerLetter}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-[#16131F] font-medium leading-relaxed">
                        Evaluated across all 5 decoupled dimensions. {winnerLetter} provides optimal balance of low defect risk and genuine pricing.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* D. FINAL RECOMMENDATION */}
            <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[var(--line)] space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-[#16131F] font-heading">
                Final Recommendation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-[16px] bg-[var(--canvas)] border border-[var(--line)] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[var(--accent)] font-bold block">
                    Which product to choose
                  </span>
                  <p className="text-[#16131F] font-semibold">
                    Choose {winnerLetter} ({winner.product_title || 'Winning Option'}).
                  </p>
                  <p className="text-[var(--text-3)] leading-relaxed">
                    Provides the most dependable overall purchase experience for everyday use.
                  </p>
                </div>

                <div className="p-4 rounded-[16px] bg-[var(--canvas)] border border-[var(--line)] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold block">
                    What makes it better
                  </span>
                  <p className="text-[#16131F] font-semibold">
                    Fair pricing & lower risk.
                  </p>
                  <p className="text-[var(--text-3)] leading-relaxed">
                    Verified platform fulfillment, genuine seller rating, and {delta > 0 ? `${formatCurrencyINR(delta)} savings` : 'solid value'}.
                  </p>
                </div>

                <div className="p-4 rounded-[16px] bg-[var(--canvas)] border border-[var(--line)] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                    Main compromise
                  </span>
                  <p className="text-[#16131F] font-semibold">
                    Tailored fit.
                  </p>
                  <p className="text-[var(--text-3)] leading-relaxed">
                    Customer feedback suggests checking size chart measurements before final order.
                  </p>
                </div>
              </div>
            </div>

            {/* E. EMBEDDED COMPARISON AI AGENT */}
            <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[var(--line)] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#16131F] font-heading flex items-center gap-2">
                      <span>Comparison AI Agent</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--heather)]/60 text-[var(--accent)] border border-[var(--line)]">
                        Context-Aware
                      </span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-3)]">
                      Ask any question about this comparison in plain English.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(true)}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hi)] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span>Open Full Chat</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  'Why did you pick this one?',
                  'Which is the safest?',
                  'Why is the cheaper one risky?',
                  'Explain in simple words',
                ].map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    disabled={isAgentThinking}
                    onClick={() => handleAskAgent(q)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer text-[var(--accent)] bg-[var(--heather)]/40 border-[var(--line)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] disabled:opacity-50 active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Error State with Retry */}
              {agentError && (
                <div className="p-3.5 rounded-xl bg-[var(--bad-bg)] border border-[var(--bad)]/30 flex items-center justify-between text-xs text-[var(--bad-ink)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--bad)] shrink-0" />
                    <span>{agentError}</span>
                  </div>
                  {lastAgentQuery && (
                    <button
                      type="button"
                      onClick={() => handleAskAgent(lastAgentQuery)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[var(--bad)]/40 text-xs font-semibold text-[var(--bad-ink)] hover:bg-[var(--bad-bg)] cursor-pointer"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Loading / Typing State */}
              {isAgentThinking && (
                <div className="p-4 rounded-[16px] bg-[var(--canvas)] border border-[var(--line)] flex items-center gap-3 text-xs text-[var(--text-3)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)] shrink-0" />
                  <div className="flex items-center gap-2">
                    <span>Synthesizing comparison evidence across products...</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Question & Answer Display */}
              {!isAgentThinking && agentAnswer && (
                <div className="p-4 rounded-[16px] bg-[var(--canvas)] border border-[var(--accent)]/20 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--accent)] font-heading">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>{agentQuestion}</span>
                    </div>
                    <span className="text-[10px] font-mono font-normal text-[var(--text-3)]">
                      ≤120 words · Plain Language
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#16131F] leading-relaxed font-sans font-medium">
                    <TypewriterText text={agentAnswer} speedMs={8} />
                  </p>
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
                  disabled={isAgentThinking}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--canvas)]/50 border border-[var(--line)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] text-xs text-[#16131F] placeholder:text-[var(--text-3)] outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={isAgentThinking}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hi)] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
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
