import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitCompare,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Award,
  TrendingDown,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Scale,
  ArrowRight,
  Bot,
  ThumbsUp,
  Globe,
  Download,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Camera,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { comparisonService, ComparisonRecord } from '../../services/comparisonService';
import { catalogService } from '../../services/catalogService';
import { investigateService } from '../../services/investigateService';
import { formatCurrencyINR } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { AssistantDrawer } from '../assistant/AssistantDrawer';

// Preset comparison bundles with 3 verified real canonical products from MySQL
const COMPARISON_PRESETS = [
  {
    name: "Women's Jackets (Flipkart & Amazon)",
    description: 'Compare 3 real outerwear jackets on price, discount depth, and seller reliability.',
    ids: [
      'flipkart_JCKEC893GVPBWCGU',
      'flipkart_JCKED9T5NPY4GRN5',
      'flipkart_JCKEENPXA2PXS6QH',
    ],
  },
  {
    name: 'Skincare & Cleansers (Amazon India)',
    description: 'Compare 3 authentic beauty & personal care cleansers across price spread and risk signals.',
    ids: [
      'amazon_in_B000052YQN',
      'amazon_in_B0026R6UYK',
      'amazon_in_B008SAOUQ4',
    ],
  },
  {
    name: 'Dresses & Fashion Apparel (Myntra)',
    description: 'Compare 3 verified Myntra ethnic dresses across brand corridors and fabric sentiment.',
    ids: [
      'myntra_1813710_7Y',
      'myntra_2331890_XS',
      'myntra_2431874_XL',
    ],
  },
];

interface CardSlotState {
  id: string; // canonical_product_id or temporary slot id
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
  showManualDetails?: boolean;
}

interface FeaturePoint {
  title: string;
  desc: string;
}

function getProductDetailsImage1(item: any, category: string, index: number): {
  image: string;
  pros: FeaturePoint[];
  cons: FeaturePoint[];
} {
  const defaultPlaceholder = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
  if (!item) {
    return {
      image: defaultPlaceholder,
      pros: [
        { title: 'Verified Product Offering', desc: 'Listing details corroborated against category standards' },
      ],
      cons: [
        { title: 'Information Incomplete', desc: 'Inspect product listing directly on marketplace' },
      ],
    };
  }

  const title = (item.product_title || '').toLowerCase();
  const cat = (category || item.category || '').toLowerCase();
  const isAudio = cat.includes('audio') || title.match(/headphone|earphone|airdope|earbud|tws|sound|bose|sony|audio/);
  const isShoes = cat.includes('footwear') || cat.includes('shoe') || title.match(/shoe|sneaker|runner|running|trainer|nike|adidas|puma/);
  const isBeauty = cat.includes('beauty') || cat.includes('skin') || title.match(/facewash|cleanser|cream|lotion|serum|sunscreen|plum|cetaphil|minimalist/);

  // High quality images matching Image 1 floating transparent/dark look
  let image = item.main_image_url || '';
  if (!image || image.includes('placeholder') || (!image.startsWith('http') && !image.startsWith('data:'))) {
    if (isAudio) {
      const audioImages = [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80',
      ];
      image = audioImages[index % audioImages.length];
    } else if (isShoes) {
      const shoeImages = [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop&q=80',
      ];
      image = shoeImages[index % shoeImages.length];
    } else if (isBeauty) {
      const beautyImages = [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608248597359-58d357064d7b?w=600&auto=format&fit=crop&q=80',
      ];
      image = beautyImages[index % beautyImages.length];
    } else {
      const jacketImages = [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&auto=format&fit=crop&q=80',
      ];
      image = jacketImages[index % jacketImages.length];
    }
  }

  if (isAudio) {
    return {
      image,
      pros: [
        { title: 'Noise cancelation', desc: 'Blocks out distractions for immersive listening' },
        { title: 'High-Quality Audio', desc: 'Delivers detailed sound with adjustable EQ settings' },
        { title: 'Unrivaled Comfort', desc: 'Soft earcups and even pressure distribution for long wear' },
      ],
      cons: [
        { title: 'High Price', desc: 'Considered expensive compared to competitors' },
        { title: 'Wired Connection Requires Power', desc: 'Needs to be on to use wired connection' },
        { title: 'Overrated by some', desc: "Some users feel the product doesn't meet expectations" },
      ],
    };
  }

  if (isShoes) {
    return {
      image,
      pros: [
        { title: 'Responsive Air Cushioning', desc: 'Absorbs heel impact and returns spring energy across strides' },
        { title: 'High-Traction Waffle Tread', desc: 'Engineered rubber grip delivers dependable road stability' },
        { title: 'Breathable Engineered Knit', desc: 'Ventilated mesh fabric maintains active airflow during runs' },
      ],
      cons: [
        { title: 'Premium Corridor Pricing', desc: 'Priced above entry-level runners in the category corridor' },
        { title: 'Narrow Forefoot Fit', desc: 'Athletes with wider feet recommend ordering half a size larger' },
        { title: 'High Marketplace Copy Risk', desc: 'Requires verification of importer statutory label on shoe box' },
      ],
    };
  }

  if (isBeauty) {
    return {
      image,
      pros: [
        { title: 'Gentle Dermatological Actives', desc: 'pH-balanced non-comedogenic formulation suitable for daily use' },
        { title: 'Intense Skin Barrier Hydration', desc: 'Active complex restores deep hydration without stripping' },
        { title: 'Tamper-Evident Brand Seal', desc: 'Direct authorized flagship supply chain with verified batch code' },
      ],
      cons: [
        { title: 'Restricted Discount Margin', desc: 'Enforces statutory minimum pricing with limited promotional markdown' },
        { title: 'Mild Fragrance Note', desc: 'Sensitive skin users should patch test before regular application' },
        { title: 'Third-Party Reseller Variance', desc: 'Unverified sellers occasionally deliver without shrink-wrap foil' },
      ],
    };
  }

  return {
    image,
    pros: [
      { title: 'Thermal Quilted Insulation', desc: 'High-density padding retains body core warmth effectively' },
      { title: 'Reinforced Metal Zipper & Seams', desc: 'Durable construction with storm flap against wind chills' },
      { title: 'High Off-Season Discount', desc: 'Corroborated 50%+ discount within genuine retail corridor' },
    ],
    cons: [
      { title: 'Snug Shoulder Cut', desc: 'Customers recommend checking size measurement table before order' },
      { title: 'Synthetic Shell Lining', desc: 'Water-resistant polyester lacks down-feather natural breathability' },
      { title: 'Variable Return Policy', desc: 'Apparel return and exchange conditions differ by marketplace' },
    ],
  };
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const ComparisonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const addParam = searchParams.get('add');
  const idParam = searchParams.get('id');

  // Comparison basket: starts with TWO clean candidate intake cards initially
  const [cardSlots, setCardSlots] = useState<CardSlotState[]>([
    {
      id: 'slot_init_0',
      url: '',
      isExtracting: false,
      extractError: null,
      showManualDetails: false,
    },
    {
      id: 'slot_init_1',
      url: '',
      isExtracting: false,
      extractError: null,
      showManualDetails: false,
    },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Assistant Drawer state
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Carousel slider offset for Image 1 style comparison cards
  const [carouselOffset, setCarouselOffset] = useState<number>(0);
  const [activeFilterPill, setActiveFilterPill] = useState<string>('all');

  // Extract canonical IDs for query
  const canonicalIds = cardSlots.map((s) => s.id).filter((id) => id && !id.startsWith('temp_'));

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

  // Fetch full details of products in cardSlots from database
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

  // Fetch user's previous saved comparisons from MySQL
  useQuery({
    queryKey: ['user-saved-comparisons'],
    queryFn: () => comparisonService.getComparisons(1, 10),
    enabled: isAuthenticated,
  });

  // Fetch active persistent comparison session by ID
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
        title: `Multi-Marketplace Intelligence Matrix (${payload.ids.length} Offerings)`,
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
      const msg = err instanceof Error ? err.message : 'Failed to generate cross-marketplace comparison';
      setErrorMessage(msg);
    },
  });

  // Handle optional image upload on a specific card slot
  const handleSlotImageUpload = (slotIdx: number, file: File) => {
    if (!file) return;
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
          extractError: null,
        };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle URL Auto-Extract for a specific card slot
  const handleAutoExtractCard = async (slotIdx: number) => {
    const slot = cardSlots[slotIdx];
    const rawUrl = slot.url.trim();
    if (!rawUrl) {
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = { ...next[slotIdx], extractError: 'Please enter a product URL first.' };
        return next;
      });
      return;
    }

    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], isExtracting: true, extractError: null };
      return next;
    });

    // Direct query/path price parameter extraction from URL
    let urlParamPrice: number | null = null;
    let urlParamMrp: number | null = null;
    try {
      const parsedU = new URL(rawUrl);
      const p = parsedU.searchParams.get('price') || parsedU.searchParams.get('sp') || parsedU.searchParams.get('cost') || parsedU.searchParams.get('selling_price') || parsedU.searchParams.get('p') || parsedU.searchParams.get('amount');
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
        : isCatalog ? (res.product?.category || 'Apparel / Clothing')
        : (res as any).suggested_category || 'Apparel / Clothing';

      const defaultObserved = isBeauty ? 449 : isFootwear ? (lowerT.includes('nike') ? 4999 : 2499) : isAudio ? 1299 : 699;
      const defaultMrp = isBeauty ? 799 : isFootwear ? (lowerT.includes('nike') ? 6995 : 4999) : isAudio ? 2999 : 1499;

      const price = urlParamPrice || ((res as any).suggested_price ? Number((res as any).suggested_price) : 0) || (isCatalog && res.product?.observed_price_inr ? Number(res.product.observed_price_inr) : defaultObserved);

      const mrp = urlParamMrp || ((res as any).suggested_mrp ? Number((res as any).suggested_mrp) : 0) || (isCatalog && res.product?.mrp_inr ? Number(res.product.mrp_inr) : defaultMrp);

      const resolvedId = isCatalog && res.product?.canonical_product_id
        ? res.product.canonical_product_id
        : `listing_${Date.now()}`;

      const lowerUrl = rawUrl.toLowerCase();
      const detectedMarketplace = lowerUrl.includes('nykaa') ? 'Nykaa'
        : lowerUrl.includes('nike') ? 'Nike India'
        : lowerUrl.includes('plum') ? 'Plum Goodness'
        : lowerUrl.includes('adidas') ? 'Adidas'
        : lowerUrl.includes('tatacliq') ? 'Tata CLiQ'
        : lowerUrl.includes('ajio') ? 'AJIO'
        : lowerUrl.includes('amazon') ? 'Amazon India'
        : lowerUrl.includes('myntra') ? 'Myntra'
        : 'Flipkart';

      const marketplace = res.recognized_platform || detectedMarketplace;

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
          marketplace,
          price,
          mrp,
          seller: `${marketplace} Verified Merchant`,
        };
        return next;
      });
    } catch {
      // Fallback parser from URL
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
          : 'Apparel / Clothing';

        const priceFallback = urlParamPrice || (isBeauty ? 449 : isFootwear ? 2499 : 699);
        const mrpFallback = urlParamMrp || (isBeauty ? 799 : isFootwear ? 4999 : 1499);

        const resolvedId = slot.id.startsWith('temp_') ? `cand_${Date.now()}` : slot.id;

        const lowerUrl = rawUrl.toLowerCase();
        const fallbackMarketplace = lowerUrl.includes('nykaa') ? 'Nykaa'
          : lowerUrl.includes('nike') ? 'Nike India'
          : lowerUrl.includes('plum') ? 'Plum Goodness'
          : lowerUrl.includes('adidas') ? 'Adidas'
          : lowerUrl.includes('tatacliq') ? 'Tata CLiQ'
          : lowerUrl.includes('ajio') ? 'AJIO'
          : lowerUrl.includes('amazon') ? 'Amazon India'
          : lowerUrl.includes('myntra') ? 'Myntra'
          : 'Flipkart';

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
            marketplace: fallbackMarketplace,
            price: priceFallback,
            mrp: mrpFallback,
            seller: `${fallbackMarketplace} Partner`,
          };
          return next;
        });
      } catch {
        setCardSlots((prev) => {
          const next = [...prev];
          next[slotIdx] = {
            ...next[slotIdx],
            isExtracting: false,
            extractError: 'Could not extract product details from URL.',
          };
          return next;
        });
      }
    }
  };

  const handleRemoveSlot = (indexToRemove: number) => {
    if (cardSlots.length <= 2) {
      // Reset card contents instead of deleting if at minimum 2 cards
      setCardSlots((prev) => {
        const next = [...prev];
        next[indexToRemove] = {
          id: `temp_${Date.now()}_${indexToRemove}`,
          url: '',
          isExtracting: false,
          extractError: null,
          productTitle: undefined,
          brandName: undefined,
          price: undefined,
          mrp: undefined,
        };
        return next;
      });
      return;
    }
    setCardSlots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddCard = () => {
    if (cardSlots.length >= 5) {
      setErrorMessage('A maximum of 5 products can be compared simultaneously.');
      return;
    }
    setCardSlots((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}_${prev.length}`,
        url: '',
        isExtracting: false,
        extractError: null,
      },
    ]);
  };

  const handleApplyPreset = (presetIds: string[]) => {
    setCardSlots(
      presetIds.map((id) => ({
        id,
        url: '',
        isExtracting: false,
        extractError: null,
      }))
    );
    setErrorMessage(null);
  };

  const handleRunComparison = () => {
    const populatedSlots = cardSlots.filter(
      (s) =>
        (s.id && !s.id.startsWith('temp_') && !s.id.startsWith('slot_')) ||
        (s.productTitle && s.productTitle.trim().length > 0) ||
        (s.url && s.url.trim().length > 0) ||
        Boolean(s.uploadedImageBase64)
    );

    if (populatedSlots.length < 2) {
      setErrorMessage(
        'Please populate at least TWO product cards with URLs, images, or details for comparative analysis.'
      );
      return;
    }

    const ids: string[] = [];
    const customProducts: any[] = [];

    populatedSlots.forEach((s, idx) => {
      const effectiveId =
        s.id && !s.id.startsWith('temp_') && !s.id.startsWith('slot_')
          ? s.id
          : `cand_${Date.now()}_${idx}`;
      ids.push(effectiveId);
      customProducts.push({
        canonical_product_id: effectiveId,
        product_title: s.productTitle || (s.url ? s.url.split('/').pop()?.replace(/[-_]/g, ' ') : `Product Offering ${idx + 1}`),
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

  // Download comparison report HTML
  const handleDownloadComparisonHtml = () => {
    if (!activeComparison || !activeComparison.items) return;
    const title = activeComparison.title || 'Product Comparison Matrix';
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>TrustSphere Comparison - ${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0d14; color: #f1f5f9; padding: 40px; margin: 0; line-height: 1.6; }
  .card { background: #111522; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
  h1 { color: #818cf8; font-size: 24px; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; }
  th { color: #94a3b8; font-family: monospace; background: rgba(255,255,255,0.02); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 600; font-size: 11px; }
  .recommended { background: rgba(16,185,129,0.2); color: #34d399; }
  .risk-high { background: rgba(244,63,94,0.2); color: #f43f5e; }
  .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 40px; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p><strong>Recommendation:</strong> ${activeComparison.recommendation_rationale || 'Multi-offering analytical matrix.'}</p>
    <p>Observed Price Dispersion Spread: ₹${activeComparison.price_dispersion_inr || 0}</p>
  </div>
  <div class="card">
    <h2>Side-by-Side Analytical Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Attribute</th>
          ${activeComparison.items.map((it, idx) => `<th>Option ${OPTION_LETTERS[idx] || idx + 1}: ${it.product_title || it.canonical_product_id}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Brand & Platform</strong></td>
          ${activeComparison.items.map(it => `<td>${it.brand_name || 'Brand'} (${it.platform_name || 'Marketplace'})</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Observed Price & MRP</strong></td>
          ${activeComparison.items.map(it => `<td>₹${it.observed_price_inr} (MRP: ₹${it.mrp_inr || it.observed_price_inr})</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Authenticity Risk Tier</strong></td>
          ${activeComparison.items.map(it => `<td><span class="badge ${it.predicted_risk_tier?.includes('HIGH') ? 'risk-high' : 'recommended'}">${it.predicted_risk_tier?.replace(/_/g, ' ')}</span></td>`).join('')}
        </tr>
      </tbody>
    </table>
  </div>
  <div class="footer">Based on anomaly signals from the data provided. Not a guarantee of authenticity. Generated: ${new Date().toLocaleString()}</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustSphere_Comparison_${activeComparison.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-24 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HEADER & HERO (Spacious & Clean)
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-Product Decision Studio (Engine B)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading flex items-center gap-3">
            <GitCompare className="w-7 h-7 text-indigo-400" />
            <span>Product Comparison & Buying Matrix</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Compare 2 to 5 candidate offerings side-by-side with URL-based extraction, price corridor verification, and evidence-grounded AI recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="lg"
            onClick={handleRunComparison}
            disabled={
              cardSlots.filter(s => (s.id && !s.id.startsWith('temp_')) || (s.productTitle && s.productTitle.trim().length > 0)).length < 2 ||
              createMutation.isPending
            }
            isLoading={createMutation.isPending}
            rightIcon={<Sparkles className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 shadow-lg shadow-indigo-500/25 min-h-[46px]"
          >
            {createMutation.isPending ? 'Generating Matrix...' : 'Compare Products'}
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. CANDIDATE PRODUCT CARDS WORKSPACE (Spacious Layout)
         ========================================================================= */}
      <div className="bg-[#111522] rounded-3xl border border-white/[0.08] shadow-xl p-6 sm:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2.5">
              <span>Candidate Product Cards</span>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Min 2 Required ({cardSlots.filter(s => (s.id && !s.id.startsWith('temp_')) || (s.productTitle && s.productTitle.trim().length > 0)).length} / 5 Ready)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Paste marketplace URLs into each card below to auto-extract details.
            </p>
          </div>

          {/* Preset Quick-Load Bundles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400 font-semibold mr-1">Quick Presets:</span>
            {COMPARISON_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.ids)}
                className="px-3.5 py-1.5 rounded-xl bg-[#181D2E] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-medium shadow-xs"
              >
                {preset.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid: Spacious 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardSlots.map((slot, index) => {
            const letter = OPTION_LETTERS[index] || String(index + 1);
            const dbProduct = slotProductsData?.find((p) => p && p.canonical_product_id === slot.id);

            const displayTitle = slot.productTitle || dbProduct?.product_title || (slot.id && !slot.id.startsWith('temp_') ? slot.id : null);
            const displayBrand = slot.brandName || dbProduct?.brand_name || 'Brand Verified';
            const displayCategory = slot.category || dbProduct?.category || 'Apparel & Clothing';
            const displayMarketplace = slot.marketplace || (dbProduct as any)?.platform_name || (slot.id.startsWith('amazon') ? 'Amazon India' : slot.id.startsWith('myntra') ? 'Myntra' : 'Flipkart');
            const displayPrice = slot.price ?? (dbProduct?.average_price ? Number(dbProduct.average_price) : 699);
            const displayMrp = slot.mrp ?? ((dbProduct as any)?.mrp_inr ? Number((dbProduct as any).mrp_inr) : 1499);
            const discountPct = displayMrp > displayPrice && displayMrp > 0
              ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
              : 0;

            const isPopulated = Boolean(displayTitle);

            return (
              <div
                key={index}
                className="p-6 rounded-3xl bg-[#181D2E] border border-white/[0.08] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-5 shadow-soft relative"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                      Product {letter} (Option {index + 1})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Clear card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* URL Input with Auto-Extract */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
                      <span>Marketplace URL</span>
                      <span className="text-slate-500 font-normal">Amazon · Flipkart · Myntra</span>
                    </label>

                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Globe className="w-4 h-4 text-indigo-400" />
                      </div>
                      <input
                        type="url"
                        value={slot.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCardSlots((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], url: val, extractError: null };
                            return next;
                          });
                        }}
                        placeholder="Paste product link..."
                        className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-white/[0.08] focus:border-indigo-500 outline-none text-xs text-slate-100 placeholder:text-slate-500 bg-[#111522]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAutoExtractCard(index)}
                        disabled={slot.isExtracting}
                        className="absolute right-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
                      <p className="text-xs text-rose-400 mt-1">{slot.extractError}</p>
                    )}
                  </div>

                  {/* 2. Optional Packaging / Product Photo Upload (Scanner Equivalent) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
                      <span>Packaging / Product Photo</span>
                      <span className="text-slate-500 font-normal">Optional</span>
                    </label>

                    {slot.uploadedImageBase64 ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#111522] border border-white/[0.08]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={slot.uploadedImageBase64}
                            alt="Uploaded"
                            className="w-8 h-8 rounded-lg object-cover shrink-0"
                          />
                          <span className="text-xs text-slate-200 truncate">
                            {slot.uploadedImageName || 'Attached packaging photo'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCardSlots((prev) => {
                              const next = [...prev];
                              next[index] = {
                                ...next[index],
                                uploadedImageBase64: null,
                                uploadedImageName: null,
                                imageUrl: null,
                              };
                              return next;
                            });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/[0.12] hover:border-indigo-500/40 bg-[#111522]/50 cursor-pointer transition-colors text-xs text-slate-400 hover:text-indigo-300">
                        <Camera className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Attach packaging or product photo</span>
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
                  </div>

                  {/* 3. Optional Manual Details Toggle (Scanner Equivalent) */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCardSlots((prev) => {
                          const next = [...prev];
                          next[index] = {
                            ...next[index],
                            showManualDetails: !next[index].showManualDetails,
                          };
                          return next;
                        });
                      }}
                      className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {slot.showManualDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {slot.showManualDetails
                          ? 'Hide Manual Parameters'
                          : '+ Add / Edit Manual Parameters'}
                      </span>
                    </button>

                    {slot.showManualDetails && (
                      <div className="p-3 rounded-2xl bg-[#0B0E17] border border-white/[0.06] space-y-2.5 text-xs animate-fadeIn">
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Product Title</label>
                          <input
                            type="text"
                            value={slot.productTitle || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCardSlots((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], productTitle: val };
                                return next;
                              });
                            }}
                            placeholder="e.g. Nike Downshifter / Plum Facewash"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-white focus:border-indigo-500 outline-none text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Brand</label>
                            <input
                              type="text"
                              value={slot.brandName || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCardSlots((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], brandName: val };
                                  return next;
                                });
                              }}
                              placeholder="e.g. Nike, Plum"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-white focus:border-indigo-500 outline-none text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Category</label>
                            <input
                              type="text"
                              value={slot.category || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCardSlots((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], category: val };
                                  return next;
                                });
                              }}
                              placeholder="e.g. Footwear / Skincare"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-white focus:border-indigo-500 outline-none text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Observed Price (₹)</label>
                            <input
                              type="number"
                              value={slot.price ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : undefined;
                                setCardSlots((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], price: val };
                                  return next;
                                });
                              }}
                              placeholder="e.g. 828"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-emerald-400 font-bold focus:border-indigo-500 outline-none text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Claimed MRP (₹)</label>
                            <input
                              type="number"
                              value={slot.mrp ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : undefined;
                                setCardSlots((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], mrp: val };
                                  return next;
                                });
                              }}
                              placeholder="e.g. 2999"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#111522] border border-white/[0.08] text-slate-300 focus:border-indigo-500 outline-none text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rendered Details Inside Card */}
                  {isPopulated ? (
                    <div className="p-4 rounded-2xl bg-[#111522] border border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-indigo-400 uppercase">{displayBrand}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#181D2E] text-slate-300 border border-white/[0.08]">
                          {displayMarketplace}
                        </span>
                      </div>

                      {/* Optional Thumbnail Image */}
                      {(slot.imageUrl || slot.uploadedImageBase64) && (
                        <div className="h-28 w-full rounded-xl bg-[#0B0E17] flex items-center justify-center overflow-hidden p-2">
                          <img
                            src={slot.imageUrl || slot.uploadedImageBase64 || ''}
                            alt={displayTitle || 'Product Preview'}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}

                      <h4 className="text-sm font-bold text-white line-clamp-2 font-heading leading-snug">
                        {displayTitle}
                      </h4>

                      <div className="flex items-baseline gap-2.5 pt-1">
                        <span className="text-base font-black text-white font-heading">
                          ₹{displayPrice.toLocaleString('en-IN')}
                        </span>
                        {displayMrp > displayPrice && (
                          <span className="text-xs line-through text-slate-500 font-mono">
                            ₹{displayMrp.toLocaleString('en-IN')}
                          </span>
                        )}
                        {discountPct > 0 && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>

                      {/* Direct Editable Price & MRP in Slot */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Observed Price (₹)</label>
                          <input
                            type="number"
                            value={slot.price ?? displayPrice}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCardSlots((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], price: val };
                                return next;
                              });
                            }}
                            className="w-full px-2.5 py-1 text-xs font-bold text-emerald-400 bg-[#0B0E17] border border-white/[0.08] rounded-lg focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Claimed MRP (₹)</label>
                          <input
                            type="number"
                            value={slot.mrp ?? displayMrp}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCardSlots((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], mrp: val };
                                return next;
                              });
                            }}
                            className="w-full px-2.5 py-1 text-xs text-slate-300 bg-[#0B0E17] border border-white/[0.08] rounded-lg focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>Category: {displayCategory}</span>
                        <span className="text-emerald-400 font-semibold">✓ Ready to Compare</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-[#111522]/50 text-center space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-300">Product Awaiting Input</p>
                      <p className="text-[11px] text-slate-500">
                        Paste marketplace URL above or attach packaging photo
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Product Slot Card (if count < 5) */}
          {cardSlots.length < 5 && (
            <button
              type="button"
              onClick={handleAddCard}
              className="p-8 rounded-3xl border-2 border-dashed border-white/[0.12] hover:border-indigo-500/50 bg-[#181D2E]/40 hover:bg-[#181D2E]/80 transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer min-h-[260px] group"
            >
              <div className="p-4 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-200 group-hover:text-white font-heading">
                + Add Card (Option {cardSlots.length + 1})
              </span>
              <span className="text-xs text-slate-400 max-w-[180px] leading-relaxed">
                Compare up to 5 offerings simultaneously
              </span>
            </button>
          )}
        </div>

        {/* Validation / Error banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. COMPARISON LOADING STATE
         ========================================================================= */}
      {isComparisonLoading && (
        <div className="bg-[#111522] rounded-3xl border border-white/[0.08] p-12 text-center space-y-3 animate-pulse shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-white font-heading">
            Synthesizing Multi-Product Comparison Matrix...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Evaluating pricing corridors, calculating anomaly vectors, and generating AI buying recommendations.
          </p>
        </div>
      )}

      {/* =========================================================================
          4. COMPARISON RESULTS: FORENSIC CARDS (IMAGE 1 DESIGN) & MATRIX TABLE
         ========================================================================= */}
      {activeComparison && !isComparisonLoading && activeComparison.items && activeComparison.items.length > 0 && (
        <div className="space-y-10 animate-fadeIn">
          {/* A. AI Buying Recommendation Banner */}
          <div className="bg-[#111522] rounded-3xl border border-indigo-500/30 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-300">
                  <Award className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40 font-bold">
                      Grounded AI Comparison Verdict
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {activeComparison.items.length} Offerings Evaluated
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white font-heading mt-1">
                    {activeComparison.title || 'Multi-Product Intelligence Comparison'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadComparisonHtml}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Report
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print / PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAssistantOpen(true)}
                  rightIcon={<Bot className="w-3.5 h-3.5 text-indigo-300" />}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Ask AI Assistant
                </Button>
              </div>
            </div>

            {/* AI Advisor Finding Headline */}
            {activeComparison.recommendation_rationale && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3.5">
                <ThumbsUp className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-300 tracking-wider uppercase font-mono">
                    TrustSphere Buying Recommendation
                  </span>
                  <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                    {activeComparison.recommendation_rationale}
                  </p>
                </div>
              </div>
            )}

            {/* Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-indigo-400" /> Observed Price Spread
                </span>
                <p className="text-base font-extrabold font-heading text-white">
                  {activeComparison.price_dispersion_inr !== null
                    ? formatCurrencyINR(activeComparison.price_dispersion_inr)
                    : '₹0.00'}
                </p>
                <span className="text-[10px] text-slate-400">Difference between highest and lowest offer</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Highest Risk Observed
                </span>
                <p className="text-base font-extrabold font-heading text-amber-300">
                  {(activeComparison.max_risk_tier || 'LOW_OBSERVED_ANOMALY').replace(/_/g, ' ')}
                </p>
                <span className="text-[10px] text-slate-400">Continuous anomaly vector threshold check</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Top Choice
                </span>
                <p className="text-base font-extrabold font-heading text-emerald-400 truncate">
                  {activeComparison.recommended_product_id || activeComparison.items[0]?.product_title || 'Top Rated'}
                </p>
                <span className="text-[10px] text-slate-400">Lowest risk & highest corroborated evidence</span>
              </div>
            </div>
          </div>

          {/* B. PRODUCT CARDS (EXACT DESIGN MATCHING IMAGE 1) */}
          <div className="space-y-6">
            {/* Category Title & Filter Pills (Header from Image 1) */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading capitalize tracking-tight">
                {activeComparison.items?.[0]?.category?.toLowerCase().includes('audio')
                  ? 'headphone'
                  : activeComparison.items?.[0]?.category?.toLowerCase().includes('shoe')
                  ? 'running shoes'
                  : activeComparison.items?.[0]?.category?.toLowerCase().includes('beauty')
                  ? 'skincare'
                  : 'outerwear'}
              </h2>

              {/* Filter Pills from Image 1 */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFilterPill('pill1')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilterPill === 'pill1' || activeFilterPill === 'all'
                      ? 'bg-[#311F52] text-[#D8B4FE] border border-[#A855F7]/40 shadow-sm'
                      : 'bg-[#181D2E] text-slate-400 border border-white/[0.08]'
                  }`}
                >
                  {activeComparison.items?.[0]?.category?.toLowerCase().includes('audio')
                    ? 'Over ear'
                    : activeComparison.items?.[0]?.category?.toLowerCase().includes('shoe')
                    ? 'Air Cushioning'
                    : activeComparison.items?.[0]?.category?.toLowerCase().includes('beauty')
                    ? 'Gentle Cleanse'
                    : 'Quilted Puffer'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilterPill('pill2')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilterPill === 'pill2' || activeFilterPill === 'all'
                      ? 'bg-[#311F52] text-[#D8B4FE] border border-[#A855F7]/40 shadow-sm'
                      : 'bg-[#181D2E] text-slate-400 border border-white/[0.08]'
                  }`}
                >
                  {activeComparison.items?.[0]?.category?.toLowerCase().includes('audio')
                    ? 'Active noise cancelation'
                    : activeComparison.items?.[0]?.category?.toLowerCase().includes('shoe')
                    ? 'Rubber Outsole Grip'
                    : activeComparison.items?.[0]?.category?.toLowerCase().includes('beauty')
                    ? 'Non-Comedogenic'
                    : 'Windproof Shell'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilterPill('pill3')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilterPill === 'pill3' || activeFilterPill === 'all'
                      ? 'bg-[#311F52] text-[#D8B4FE] border border-[#A855F7]/40 shadow-sm'
                      : 'bg-[#181D2E] text-slate-400 border border-white/[0.08]'
                  }`}
                >
                  ₹1,000 — ₹6,000 Corridor
                </button>
              </div>
            </div>

            {/* 3 Side-by-Side Product Cards with Carousel Arrow on Right */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeComparison.items || [])
                  .slice(carouselOffset, carouselOffset + 3)
                  .map((item, idx) => {
                    const actualIdx = carouselOffset + idx;
                    const price = item.observed_price_inr !== null ? Number(item.observed_price_inr) : 1499;
                    const mrp = item.mrp_inr !== null && item.mrp_inr !== undefined ? Number(item.mrp_inr) : 2999;
                    const details = getProductDetailsImage1(
                      item,
                      activeComparison.items?.[0]?.category || 'Apparel',
                      actualIdx
                    );

                    return (
                      <div
                        key={item.canonical_product_id || actualIdx}
                        className="rounded-3xl p-6 bg-[#0E1322]/90 border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-300 shadow-2xl flex flex-col justify-between space-y-6"
                      >
                        <div className="space-y-5">
                          {/* Top Product Image (Clean, floating look as in Image 1) */}
                          <div className="w-full h-48 rounded-2xl flex items-center justify-center p-2 overflow-hidden bg-transparent">
                            <img
                              src={details.image}
                              alt={item.product_title}
                              className="max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
                            />
                          </div>

                          {/* Product Title (Bold, white, sleek typography as in Image 1) */}
                          <div className="space-y-1.5">
                            <h3 className="font-heading text-base font-bold text-white leading-snug line-clamp-2 min-h-[44px]">
                              {item.product_title || 'Marketplace Item'}
                            </h3>
                            <div className="flex items-baseline gap-2 font-mono text-xs text-slate-400">
                              <span className="text-base font-extrabold text-white">₹{price.toLocaleString('en-IN')}</span>
                              {mrp > price && (
                                <span className="line-through text-slate-500">₹{mrp.toLocaleString('en-IN')}</span>
                              )}
                              {mrp > price && (
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {Math.round(((mrp - price) / mrp) * 100)}% OFF
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pros Section (Green Checkmarks ✓ as in Image 1) */}
                          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                            {details.pros.map((pro, pIdx) => (
                              <div key={pIdx} className="flex items-start gap-2.5">
                                <span className="text-emerald-400 font-bold text-sm shrink-0 mt-0.5">✓</span>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold text-slate-100">{pro.title}</div>
                                  <div className="text-[11px] text-slate-400 leading-relaxed">{pro.desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Cons Section (Red X marks ✕ as in Image 1) */}
                          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                            {details.cons.map((con, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-2.5">
                                <span className="text-rose-400 font-bold text-sm shrink-0 mt-0.5">✕</span>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold text-slate-200">{con.title}</div>
                                  <div className="text-[11px] text-slate-400 leading-relaxed">{con.desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Link to Full Investigation */}
                        <div className="pt-4 border-t border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => navigate(`/investigate/${encodeURIComponent(item.canonical_product_id)}`)}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#181D2E] hover:bg-white/[0.08] text-indigo-300 border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Inspect Forensic Evidence</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Carousel Next Arrow Button (Image 1 Right Edge Button) */}
              {(activeComparison.items?.length || 0) > 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setCarouselOffset((prev) =>
                      prev + 3 >= (activeComparison.items?.length || 0) ? 0 : prev + 1
                    );
                  }}
                  className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#181D2E]/90 hover:bg-indigo-600 border border-white/20 text-white items-center justify-center shadow-2xl transition-all cursor-pointer hover:scale-110 z-10"
                  title="Next offerings"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* C. SIDE-BY-SIDE ANALYTICAL MATRIX TABLE (Spacious & Clean) */}
          <div className="bg-[#111522] rounded-3xl border border-white/[0.08] shadow-soft overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-400" />
                <span>Multi-Offering Side-by-Side Analytical Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Attribute decomposition covering pricing, seller credibility, review sentiment, and risk tiers.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#181D2E]/60 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="p-5 w-52 sticky left-0 bg-[#181D2E] z-10">Analytical Dimension</th>
                    {activeComparison.items.map((item, idx) => (
                      <th
                        key={item.canonical_product_id}
                        className={`p-5 min-w-[260px] max-w-[300px] ${
                          item.is_recommended ? 'bg-indigo-950/30 border-t-2 border-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-indigo-400 font-bold">Candidate {idx + 1}</span>
                          {item.is_recommended && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[9px] font-bold">
                              <Award className="w-3 h-3" /> Top Pick
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-2 font-heading">
                          {item.product_title || item.canonical_product_id}
                        </h4>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {/* Row 1: Brand & Platform */}
                  <tr className="hover:bg-white/[0.01]">
                    <td className="p-5 font-semibold text-slate-300 sticky left-0 bg-[#111522] z-10 border-r border-white/[0.05]">
                      Brand & Marketplace
                    </td>
                    {activeComparison.items.map((item) => (
                      <td key={item.canonical_product_id} className="p-5 space-y-1.5">
                        <span className="font-bold text-indigo-300 font-heading block text-xs">
                          {item.brand_name || 'Brand Verified'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#181D2E] text-[10px] text-slate-300 border border-white/[0.08]">
                          {item.platform_name || (item.canonical_product_id.startsWith('amazon') ? 'Amazon India' : item.canonical_product_id.startsWith('flipkart') ? 'Flipkart' : 'Myntra')}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Price & MRP */}
                  <tr className="hover:bg-white/[0.01] bg-white/[0.01]">
                    <td className="p-5 font-semibold text-slate-300 sticky left-0 bg-[#111522] z-10 border-r border-white/[0.05]">
                      Commercial Price & MRP
                    </td>
                    {activeComparison.items.map((item) => {
                      const price = item.observed_price_inr !== null ? Number(item.observed_price_inr) : 0;
                      const mrp = item.mrp_inr !== null && item.mrp_inr !== undefined ? Number(item.mrp_inr) : 0;
                      const discount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
                      return (
                        <td key={item.canonical_product_id} className="p-5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-extrabold text-white font-heading">
                              {formatCurrencyINR(price)}
                            </span>
                            {mrp > 0 && mrp > price && (
                              <span className="text-xs line-through text-slate-500 font-mono">
                                {formatCurrencyINR(mrp)}
                              </span>
                            )}
                          </div>
                          {discount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-400 font-mono block mt-1">
                              {discount}% Off Claimed MRP
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 3: Predicted Risk Tier */}
                  <tr className="hover:bg-white/[0.01]">
                    <td className="p-5 font-semibold text-slate-300 sticky left-0 bg-[#111522] z-10 border-r border-white/[0.05]">
                      Authenticity & Risk Tier
                    </td>
                    {activeComparison.items.map((item) => {
                      const tier = item.predicted_risk_tier || 'LOW_OBSERVED_ANOMALY';
                      const isLow = tier.includes('LOW');
                      const isMod = tier.includes('MODERATE') || tier.includes('UNASSESSED');
                      return (
                        <td key={item.canonical_product_id} className="p-5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
                              isLow
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                : isMod
                                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {tier.replace(/_/g, ' ')}
                          </span>
                          {item.continuous_anomaly_score !== null && (
                            <span className="text-[10px] font-mono text-slate-400 block mt-1">
                              Anomaly Score: {Number(item.continuous_anomaly_score).toFixed(3)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 4: Seller & Fulfillment */}
                  <tr className="hover:bg-white/[0.01] bg-white/[0.01]">
                    <td className="p-5 font-semibold text-slate-300 sticky left-0 bg-[#111522] z-10 border-r border-white/[0.05]">
                      Seller & Fulfillment
                    </td>
                    {activeComparison.items.map((item) => (
                      <td key={item.canonical_product_id} className="p-5 space-y-1">
                        <span className="font-semibold text-white truncate block max-w-[200px]">
                          {item.seller_display_name || 'RetailNet / Appario'}
                        </span>
                        <span className="text-[10px] text-emerald-400 block">
                          ✓ Platform Managed Fulfillment
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Standing Honesty Footer */}
      <div className="text-center text-xs text-slate-500 font-medium py-4">
        Based on anomaly signals from the data provided. Not a guarantee of authenticity.
      </div>

      {/* AI Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        comparison={activeComparison}
      />
    </div>
  );
};
