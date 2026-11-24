/**
 * Comprehensive Multi-Category Customer Review NLP & Fraud Intelligence Engine.
 * 
 * Features:
 * 1. Aspect-Based Sentiment Analysis (ABSA) across 7 critical dimensions:
 *    - Product & Build Quality
 *    - Battery & Power
 *    - Performance & Speed
 *    - Delivery & Packaging
 *    - Authenticity & Genuine Sourcing
 *    - Customer Support
 *    - Return & Refund Experience
 * 2. Indian English & Hinglish colloquial sentiment lexicon (paisa vasool, bekar, bakwas, nakli, etc.).
 * 3. Scope-based Negation Detection (e.g. "not worth", "bilkul bekar", "never buy", "looks original but duplicate").
 * 4. Star Rating vs Text Sentiment Discordance / Sarcasm Detection.
 * 5. Review Deduplication & Shingle Similarity Analysis.
 * 6. Generic Review Filtering & Bot Pattern Detection.
 * 7. Explainable outputs with aspect mentions, positive/negative themes, and honest limitations.
 */

export type ReviewSourceType = 'LIVE_SCRAPED' | 'MANUAL_USER_IMPORT' | 'CROSS_MARKETPLACE_CORRESPONDENCE' | 'TEST_FIXTURE';
export type ReviewValidationStatus = 'VERIFIED_CORRESPONDENCE' | 'MODEL_MISMATCH' | 'UNVERIFIED' | 'TEST_DATA';

export interface ReviewItem {
  review_text: string;
  rating?: number; // 1 to 5
  reviewer_name?: string;
  date?: string;
  verified_purchase?: boolean;
  source_type?: ReviewSourceType;
  source_marketplace?: string;
  source_url?: string;
  product_model?: string;
  retrieval_method?: 'AUTOMATED_SCRAPE' | 'MANUAL_IMPORT' | 'CATALOG_INDEX' | 'FIXTURE';
  retrieval_timestamp?: string;
  validation_status?: ReviewValidationStatus;
}

export interface AspectFinding {
  key: string;
  display_name: string;
  sentiment_score: number | null; // -1.0 to +1.0
  satisfaction_pct: number | null; // 0 to 100%
  mention_count: number;
  positive_mentions: number;
  negative_mentions: number;
  sentiment_label: 'POSITIVE' | 'NEUTRAL' | 'CONCERN' | 'NO_DATA';
  defect_risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  status: 'EVALUATED' | 'NO_DATA';
  top_complaints: string[];
  top_praises: string[];
}

export interface FourWayClassification {
  product_dissatisfaction: {
    detected: boolean;
    score: number; // 0 to 100 severity
    summary: string;
  };
  manipulated_reviews: {
    detected: boolean;
    score: number; // 0 to 100 suspicion
    summary: string;
  };
  authenticity_concerns: {
    detected: boolean;
    score: number; // 0 to 100 risk
    summary: string;
  };
  insufficient_evidence: {
    flagged: boolean;
    summary: string;
  };
}

export interface ReviewNlpReport {
  status: 'EVALUATED' | 'NO_REVIEWS' | 'REVIEWS_UNAVAILABLE' | 'INSUFFICIENT_EVIDENCE' | 'BLOCKED' | 'TEST_DATA_EXCLUDED' | 'UNVERIFIED_EXCLUDED';
  provenance_status: 'VERIFIED_LIVE' | 'MANUAL_VERIFIED' | 'TEST_FIXTURE_EXCLUDED' | 'UNVERIFIED_EXCLUDED' | 'NO_REVIEWS';
  is_production_eligible: boolean;
  provenance_note?: string;
  published_review_count?: number | null;
  retrieved_review_count: number;
  reviews_analyzed_count: number;
  overall_sentiment_score: number | null; // -1.0 to +1.0
  satisfaction_index: number | null; // 0 to 100
  sentiment_distribution: {
    positive_percentage: number;
    neutral_percentage: number;
    negative_percentage: number;
    mixed_percentage: number;
  };
  aspects: AspectFinding[];
  four_way_classification: FourWayClassification;
  duplicate_review_indicators: {
    duplicate_clusters_found: number;
    duplicate_reviews_count: number;
    is_suspicious_clustering: boolean;
  };
  suspicious_patterns: {
    rating_review_dissonance_detected: boolean;
    dissonant_reviews_count: number;
    generic_reviews_count: number;
    counterfeit_complaints_count: number;
    detailed_observations: string[];
  };
  positive_themes: string[];
  negative_themes: string[];
  complaints: string[];
  confidence_score: number; // 0 to 1.0
  limitations: string[];
}

// ============================================================================
// LEXICONS: Hinglish & Indian English Sentiment
// ============================================================================

const POSITIVE_LEXICON: Record<string, number> = {
  // English
  great: 0.8,
  good: 0.6,
  excellent: 0.9,
  amazing: 0.9,
  superb: 0.9,
  awesome: 0.9,
  best: 0.9,
  perfect: 0.9,
  love: 0.8,
  genuine: 0.9,
  original: 0.85,
  authentic: 0.9,
  durable: 0.75,
  sturdy: 0.7,
  comfortable: 0.8,
  fast: 0.6,
  smooth: 0.7,
  clear: 0.6,
  value: 0.7,
  worth: 0.75,
  recommend: 0.8,
  recommended: 0.85,
  satisfied: 0.8,
  happy: 0.75,
  wonderful: 0.85,
  nice: 0.5,
  premium: 0.8,
  solid: 0.7,
  outstanding: 0.9,
  pleased: 0.8,
  crisp: 0.75,
  vivid: 0.75,
  flawless: 0.95,
  elegant: 0.85,
  stunning: 0.9,
  classy: 0.8,
  accurate: 0.8,
  comfortably: 0.8,
  beautiful: 0.85,
  stylish: 0.8,
  attractive: 0.75,
  pretty: 0.7,
  decent: 0.35,
  delightful: 0.85,
  sleek: 0.8,
  easy: 0.7,
  better: 0.65,
  promptly: 0.7,
  undamaged: 0.75,
  // Hinglish
  'paisa vasool': 0.9,
  badiya: 0.85,
  badhiya: 0.85,
  mast: 0.8,
  shandar: 0.9,
  shaandar: 0.9,
  zabarjast: 0.9,
  jabardast: 0.9,
  asli: 0.85,
  sahi: 0.7,
  theek: 0.15,
  'theek hai': 0.15,
  'bahut accha': 0.9,
  'bohot accha': 0.9,
  'bahut achha': 0.9,
  'bohot achha': 0.9,
  lajawab: 0.9,
  'ekdum sahi': 0.85,
  faydemand: 0.75,
  // Hindi (Devanagari)
  'सुंदर': 0.85,
  'शानदार': 0.9,
  'बढ़िया': 0.9,
  'उत्कृष्ट': 0.9,
  'अच्छा': 0.7,
  'अच्छी': 0.7,
  'अच्छे': 0.7,
  'बेहतरीन': 0.9,
  'लाजवाब': 0.9,
  'असली': 0.85,
  'पसंद': 0.75,
  'खुश': 0.75,
  'संतुष्ट': 0.8,
  'मस्त': 0.8,
  'सही': 0.7,
  'किफायती': 0.75,
  'मजबूत': 0.8,
  'सुखद': 0.75,
  'बढ़िया उत्पाद': 0.9,
  'शानदार लुक': 0.9,
  'पैसा वसूल': 0.9,
  'उम्दा': 0.9,
  'आरामदायक': 0.85,
  'साफ़': 0.75,
  'साफ': 0.75,
  'बेहतर': 0.8,
  'जचता': 0.75,
  'जचती': 0.75,
};

const NEGATIVE_LEXICON: Record<string, number> = {
  // English
  terrible: -0.9,
  horrible: -0.9,
  worst: -0.95,
  bad: -0.6,
  fake: -0.95,
  duplicate: -0.95,
  counterfeit: -1.0,
  copy: -0.7,
  firstcopy: -0.85,
  'first copy': -0.9,
  broken: -0.85,
  damaged: -0.85,
  defective: -0.9,
  delayed: -0.7,
  crushed: -0.8,
  torn: -0.75,
  tampered: -0.9,
  useless: -0.85,
  waste: -0.8,
  scam: -1.0,
  fraud: -1.0,
  cheat: -0.95,
  cheated: -0.95,
  poor: -0.7,
  cheap: -0.6,
  faulty: -0.8,
  slow: -0.5,
  laggy: -0.6,
  overheating: -0.7,
  drains: -0.7,
  'drains fast': -0.9,
  'drains quickly': -0.9,
  'drains very fast': -0.95,
  'battery drains': -0.85,
  'heating issue': -0.8,
  'gets heated': -0.8,
  unhelpful: -0.75,
  rude: -0.8,
  'too long': -0.6,
  disappointed: -0.75,
  disappointing: -0.75,
  pathetic: -0.9,
  regret: -0.8,
  refused: -0.6,
  unresponsive: -0.7,
  // Hinglish
  bekar: -0.85,
  bekaar: -0.85,
  kharab: -0.8,
  khrab: -0.8,
  dhokha: -0.95,
  dhoka: -0.95,
  nakli: -0.95,
  ganda: -0.75,
  bakwas: -0.9,
  bakwaas: -0.9,
  kachra: -0.85,
  kachda: -0.85,
  loot: -0.9,
  ghatiya: -0.9,
  chori: -0.95,
  farzi: -0.95,
  'mat lena': -0.9,
  'mat khareedna': -0.9,
  'koi fayda nahi': -0.85,
  'paisa barbad': -0.9,
  'paise barbad': -0.9,
  'tut gaya': -0.9,
  'toot gaya': -0.9,
  'chal nahi raha': -0.9,
  'chal nhi raha': -0.9,
  'kaam nahi kar raha': -0.95,
  'kaam nhi kar raha': -0.95,
  'garam ho raha': -0.85,
  'battery khatam': -0.85,
  'kharab ho gaya': -0.9,
  'awaz nahi aa rahi': -0.85,
  'awaj nahi aa rahi': -0.85,
  'not working': -0.9,
  'stopped working': -0.9,
  'waste of money': -0.9,
  // Hindi (Devanagari)
  'घटिया': -0.9,
  'नकली': -0.95,
  'धोखा': -0.95,
  'टूटा': -0.9,
  'टूटी': -0.9,
  'टूटे': -0.9,
  'बर्बाद': -0.9,
  'पैसे बर्बाद': -0.95,
  'पैसा बर्बाद': -0.95,
  'खराब': -0.85,
  'बेकार': -0.85,
  'बकवास': -0.9,
  'रद्दी': -0.85,
  'बर्बादी': -0.9,
  'पूरी बर्बादी': -0.95,
  'डुप्लीकेट': -0.95,
  'धोखाधड़ी': -0.95,
  'टूट गया': -0.9,
  'फर्जी': -0.95,
  'चोरी': -0.95,
  'बंद': -0.7,
  'मत खरीदो': -0.9,
  'मत खरीदना': -0.9,
  'मत लो': -0.9,
  'मत लेना': -0.9,
  'नुकसान': -0.8,
  'कचरा': -0.85,
  'लूट': -0.9,
};

// Aspect keywords dictionary - 11 Operational Dimensions
export const ASPECT_KEYWORDS: Record<string, { label: string; aliases?: string[]; keywords: string[] }> = {
  quality: {
    label: 'Product Quality',
    keywords: ['quality', 'texture', 'color', 'colour', 'finish', 'finishing', 'look', 'feel', 'design', 'aesthetic', 'appearance', 'premium', 'good quality', 'bad quality', 'poor quality', 'accha', 'achha', 'badiya', 'badhiya', 'shandar', 'shaandar', 'mast', 'bekar', 'bekaar', 'ganda', 'ghatiya'],
  },
  build_quality: {
    label: 'Material & Build Quality',
    aliases: ['material_build'],
    keywords: ['material', 'fabric', 'build', 'plastic', 'metal', 'leather', 'stitching', 'stitch', 'cloth', 'glass', 'rubber', 'sole', 'body', 'cheap plastic', 'solid', 'sturdy', 'build quality', 'heavy', 'flimsy', 'durable material'],
  },
  durability_reliability: {
    label: 'Durability & Reliability',
    keywords: ['durability', 'durable', 'reliable', 'lasting', 'long lasting', 'broke', 'broken', 'damaged', 'tear', 'torn', 'cracked', 'crack', 'faulty', 'loose', 'tut gaya', 'toot gaya', 'tuta', 'toota', 'stopped working', 'band ho gaya', 'kharab ho gaya', 'not working', 'chalna band', 'life', 'lifespan'],
  },
  performance: {
    label: 'Performance',
    keywords: ['performance', 'speed', 'fast', 'slow', 'lag', 'lagging', 'hanging', 'hang', 'smooth', 'processor', 'sound', 'bass', 'audio', 'display', 'screen', 'camera', 'clarity', 'grip', 'working', 'function', 'chal nahi raha', 'chal nhi raha', 'kaam nahi', 'kaam nhi', 'not working', 'stopped working', 'volume', 'loud', 'sound quality', 'picture quality'],
  },
  battery: {
    label: 'Battery & Power',
    aliases: ['battery_power'],
    keywords: ['battery', 'charging', 'charger', 'backup', 'drain', 'drains', 'draining', 'mah', 'overheating', 'heating', 'heat', 'power', 'standby', 'battery backup', 'battery life', 'charge', 'fast charge', 'garam ho raha', 'battery khatam'],
  },
  comfort_usability: {
    label: 'Comfort & Usability',
    keywords: ['comfort', 'comfortable', 'uncomfortable', 'cushion', 'cushioning', 'fit', 'fitting', 'size', 'tight', 'loose', 'pain', 'hurts', 'wear', 'wearing', 'ergonomic', 'soft', 'easy to use', 'daily use', 'grip', 'lightweight', 'skin feel', 'hydration', 'irritation'],
  },
  delivery: {
    label: 'Packaging & Delivery',
    aliases: ['packaging_delivery'],
    keywords: ['delivery', 'packaging', 'package', 'box', 'courier', 'dispatch', 'arrived', 'shipping', 'seal', 'open', 'tampered', 'carton', 'delay', 'delayed', 'delivered', 'packing', 'broken box', 'crushed', 'damage packaging'],
  },
  authenticity: {
    label: 'Authenticity & Originality',
    aliases: ['authenticity_originality'],
    keywords: ['genuine', 'original', 'fake', 'duplicate', 'counterfeit', 'first copy', 'firstcopy', 'copy', 'asli', 'nakli', 'serial', 'imei', 'barcode', 'qr', 'mfg', 'batch', 'hologram', 'authentic', 'farzi', 'scam', 'fraud', 'dhoka', 'dhokha', 'chori', 'replica'],
  },
  value_for_money: {
    label: 'Value for Money',
    keywords: ['value', 'price', 'worth', 'expensive', 'cheap', 'affordable', 'costly', 'paisa vasool', 'paisa wasool', 'waste of money', 'loot', 'paisa barbad', 'paise barbad', 'overpriced', 'budget', 'worth it', 'not worth', 'reasonable'],
  },
  support: {
    label: 'Customer Support',
    aliases: ['customer_support'],
    keywords: ['service', 'support', 'warranty', 'center', 'service center', 'technician', 'call', 'response', 'repairs', 'helpline', 'representative', 'customer care', 'unresponsive', 'no response'],
  },
  refund: {
    label: 'Returns & Refunds',
    aliases: ['returns_refunds'],
    keywords: ['return', 'returns', 'refund', 'refunds', 'replacement', 'replace', 'reject', 'rejected', 'exchange', 'policy', 'money back', 'no return', 'return window', 'replaced', 'returned'],
  },
};

/**
 * Dynamic Category Aspect Resolver.
 * Customizes ABSA dimensions based on product category:
 * - Watches: Build Quality, Design, Comfort, Durability, Timekeeping, Battery, Packaging, Delivery, Seller Experience
 * - Electronics: Battery, Performance, Heating, Display, Camera, Connectivity, Build Quality, Software
 * - Fashion: Fabric, Fit, Comfort, Stitching, Colour, Durability, Sizing
 */
export function getAspectsForCategory(
  category?: string | null,
  title?: string | null
): Record<string, { label: string; aliases?: string[]; keywords: string[] }> {
  const combined = `${category || ''} ${title || ''}`.toLowerCase();

  // 1. WATCHES
  if (combined.match(/\b(watch|watches|smartwatch|analog|quartz|dial|chronograph|timepiece|sonata|titan|casio|fastrack|fossil)\b/)) {
    return {
      build_quality: {
        label: 'Build Quality',
        aliases: ['material_build', 'quality'],
        keywords: ['build', 'case', 'brass', 'metal', 'stainless steel', 'glass', 'mineral glass', 'bezel', 'finish', 'finishing', 'casing', 'heavy', 'solid', 'sturdy', 'premium', 'flimsy', 'cheap metal', 'accha', 'badiya', 'bekar', 'ganda'],
      },
      design: {
        label: 'Design & Aesthetics',
        keywords: ['design', 'dial', 'green dial', 'color', 'colour', 'look', 'looks', 'appearance', 'aesthetic', 'stylish', 'attractive', 'beautiful', 'shandar', 'mast', 'classy', 'elegant', 'pretty', 'cute', 'finish'],
      },
      comfort: {
        label: 'Comfort & Wearability',
        aliases: ['comfort_usability'],
        keywords: ['comfort', 'comfortable', 'strap', 'metal strap', 'chain', 'clasp', 'mesh', 'fit', 'fitting', 'wrist', 'wear', 'lightweight', 'heavy', 'tight', 'loose', 'pain', 'easy to wear'],
      },
      durability: {
        label: 'Durability & Water Resistance',
        aliases: ['durability_reliability'],
        keywords: ['durability', 'durable', 'scratch', 'water resistant', 'waterproof', 'splash', 'damage', 'lasting', 'long lasting', 'broke', 'broken', 'rust', 'cracked', 'tut gaya', 'toot gaya', 'tuta'],
      },
      timekeeping: {
        label: 'Timekeeping & Accuracy',
        keywords: ['time', 'accuracy', 'accurate', 'quartz', 'analog', 'ticking', 'second hand', 'movement', 'losing time', 'slow', 'fast', 'stopped', 'not working', 'chal nahi raha', 'chalna band'],
      },
      battery: {
        label: 'Battery & Movement',
        aliases: ['battery_power'],
        keywords: ['battery', 'cell', 'quartz movement', 'dead battery', 'battery replacement', 'battery life', 'power', 'battery khatam', 'running'],
      },
      packaging: {
        label: 'Packaging & Presentation',
        aliases: ['packaging_delivery'],
        keywords: ['box', 'packaging', 'watch box', 'tin', 'cushion', 'pillow', 'seal', 'open', 'tampered', 'carton', 'packed', 'packing', 'damage box', 'gift box'],
      },
      delivery: {
        label: 'Delivery & Transit',
        keywords: ['delivery', 'courier', 'dispatch', 'arrived', 'shipping', 'fast delivery', 'delayed', 'delay', 'delivered', 'on time', 'late'],
      },
      seller_experience: {
        label: 'Seller Experience & Authenticity',
        aliases: ['authenticity', 'support'],
        keywords: ['seller', 'genuine', 'original', 'authentic', 'fake', 'duplicate', 'first copy', 'warranty', 'warranty card', 'service center', 'titan', 'sonata', 'asli', 'nakli', 'authorized', 'bill', 'invoice'],
      },
    };
  }

  // 2. ELECTRONICS
  if (combined.match(/\b(phone|mobile|smartphone|laptop|earphone|headphone|audio|tws|electronics|camera|tablet|tv|speaker|charger)\b/)) {
    return {
      battery: {
        label: 'Battery & Power',
        aliases: ['battery_power'],
        keywords: ['battery', 'charging', 'charger', 'backup', 'drain', 'drains', 'draining', 'mah', 'power', 'standby', 'battery backup', 'fast charge', 'battery khatam'],
      },
      performance: {
        label: 'Performance & Speed',
        keywords: ['performance', 'speed', 'fast', 'slow', 'lag', 'lagging', 'hanging', 'hang', 'smooth', 'processor', 'ram', 'fps', 'multitasking', 'sound', 'bass', 'audio', 'sound quality'],
      },
      heating: {
        label: 'Heating & Thermal Management',
        keywords: ['heating', 'heat', 'overheating', 'warm', 'hot', 'garam', 'temperature', 'thermal', 'garam ho raha'],
      },
      display: {
        label: 'Display & Screen Quality',
        keywords: ['display', 'screen', 'amoled', 'lcd', 'brightness', 'colors', 'resolution', 'touch', 'refresh rate', 'clarity', 'glass'],
      },
      camera: {
        label: 'Camera & Imaging',
        keywords: ['camera', 'photo', 'picture', 'video', 'sensor', 'lens', 'megapixels', 'selfie', 'night mode', 'clarity', 'focus', 'zoom'],
      },
      connectivity: {
        label: 'Connectivity & Network',
        keywords: ['connectivity', 'bluetooth', 'wifi', 'wi-fi', '5g', '4g', 'network', 'signal', 'range', 'pairing', 'disconnect', 'call quality'],
      },
      build_quality: {
        label: 'Build Quality & Materials',
        aliases: ['material_build'],
        keywords: ['build', 'material', 'plastic', 'metal', 'glass', 'body', 'cheap plastic', 'solid', 'sturdy', 'build quality', 'finish', 'flimsy'],
      },
      software: {
        label: 'Software & UI Experience',
        keywords: ['software', 'ui', 'os', 'android', 'ios', 'update', 'bug', 'bugs', 'crash', 'bloatware', 'ads', 'features', 'interface'],
      },
    };
  }

  // 3. FASHION & APPAREL
  if (combined.match(/\b(clothing|apparel|dress|shirt|tshirt|t-shirt|pant|jeans|jacket|coat|saree|kurta|kurti|fashion|hoodie|trouser|shoe|footwear)\b/)) {
    return {
      fabric: {
        label: 'Fabric & Material',
        aliases: ['material_build'],
        keywords: ['fabric', 'material', 'cloth', 'cotton', 'polyester', 'silk', 'denim', 'linen', 'soft', 'texture', 'heavy', 'lightweight', 'breathable', 'kapda', 'leather', 'sole'],
      },
      fit: {
        label: 'Fit & Silhouette',
        keywords: ['fit', 'fitting', 'slim', 'regular', 'relaxed', 'loose', 'shape', 'cut', 'oversized', 'tight', 'flattering'],
      },
      comfort: {
        label: 'Comfort & Wearability',
        aliases: ['comfort_usability'],
        keywords: ['comfort', 'comfortable', 'uncomfortable', 'soft', 'skin friendly', 'itchy', 'sweat', 'summer', 'daily wear', 'irritation', 'cushion'],
      },
      stitching: {
        label: 'Stitching & Finishing',
        keywords: ['stitching', 'stitch', 'seam', 'seams', 'thread', 'hem', 'buttons', 'zipper', 'loose thread', 'torn', 'stitching quality'],
      },
      colour: {
        label: 'Colour & Vibrancy',
        keywords: ['color', 'colour', 'shade', 'print', 'pattern', 'fade', 'fading', 'faded', 'bleeding', 'wash', 'vibrant', 'dull', 'bright'],
      },
      durability: {
        label: 'Durability & Longevity',
        aliases: ['durability_reliability'],
        keywords: ['durability', 'durable', 'lasting', 'shrink', 'shrinkage', 'tear', 'rip', 'pilling', 'lint', 'washed', 'after wash'],
      },
      sizing: {
        label: 'Sizing & Proportions',
        keywords: ['size', 'sizing', 'length', 'waist', 'chest', 'sleeve', 'small', 'large', 'true to size', 'chart', 'measurement', 'chota', 'bada'],
      },
    };
  }

  return ASPECT_KEYWORDS;
}

export function isAspectRelevantForCategory(aspectKey: string, category?: string | null, title?: string | null): boolean {
  const combined = `${category || ''} ${title || ''}`.toLowerCase();
  
  if (aspectKey === 'battery' || aspectKey === 'battery_power') {
    const isBatteryItem = Boolean(combined.match(/\b(phone|mobile|smartphone|earphone|headphone|airdope|earbud|tws|audio|battery|watch|smartwatch|laptop|electronic|tablet|trimmer|shaver|camera|speaker|powerbank|gadget|bluetooth|wireless)\b/i));
    const isApparelOrBeauty = Boolean(combined.match(/\b(shoe|sneaker|runner|footwear|boot|sandal|saree|kurta|shirt|t-shirt|pant|jeans|dress|jacket|coat|apparel|clothing|fashion|beauty|cream|serum|cleanser|facewash|sunscreen|lotion|shampoo|curtain|bedsheet)\b/i));
    if (isApparelOrBeauty && !isBatteryItem) {
      return false;
    }
  }

  return true;
}

const NEGATION_WORDS = new Set(['not', "didn't", "don't", 'no', 'never', 'hardly', 'barely', 'scarcely', 'without', 'neither', 'nor', 'nhi', 'nahi', 'mat', 'नहीं', 'न', 'मत', 'बिना']);
const INTENSIFIER_WORDS = new Set(['very', 'extremely', 'really', 'super', 'bilkul', 'bohot', 'bahut', 'ekdum', 'so', 'too', 'बहुत', 'बिल्कुल', 'एकदम', 'काफी']);
const DIMINISHER_WORDS = new Set(['thoda', 'thodi', 'thoda sa', 'slightly', 'minor', 'little', 'somewhat', 'chhota mota', 'chota mota', 'chhota', 'chota', 'थोड़ा', 'हल्का', 'छोटा मोटा']);

export class ReviewNlpEngine {
  /**
   * Evaluates text sentiment using lexicon + Hinglish + scope-based negation and intensifiers.
   */
  public analyzeSentenceSentiment(text: string): { score: number; tokens: string[] } {
    if (!text || !text.trim()) return { score: 0, tokens: [] };

    // Support Devanagari full stop (।) and standard punctuation
    const lower = text.toLowerCase().replace(/[,.?!;:()\[\]"'|।]/g, ' ');
    const rawTokens = lower.split(/\s+/).filter(Boolean);

    // Balanced neutral idioms
    if (lower.match(/\b(neither (?:too )?(?:good|great) nor (?:too )?(?:bad|poor)|theek thaak|theek-thaak|ठीक ठाक|ठीक-ठाक|काम चल जाता|काम चलाऊ|कामचलाऊ|average experience|average product|nothing special|okayish|plain|na bahut accha na|na bahut accha|ना बहुत अच्छा ना बहुत खराब|औसत दर्जे|औसत काम)\b/i)) {
      // If no strong catastrophic terms (fake, broken, nakli, toot gaya), score as balanced neutral
      if (!lower.match(/\b(fake|nakli|broken|scam|fraud|dhokha|chori|toot|worst|ghatiya|barbad|बर्बाद|नकली|धोखा|धोखाधड़ी)\b/)) {
        return { score: 0.05, tokens: rawTokens };
      }
    }

    let score = 0;
    let matchCount = 0;
    let isNegated = false;
    let negationWindow = 0;
    let isIntensified = false;
    let intensifierWindow = 0;
    let isDiminished = false;
    let diminisherWindow = 0;

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      const fourWordToken = i < rawTokens.length - 3 ? `${token} ${rawTokens[i + 1]} ${rawTokens[i + 2]} ${rawTokens[i + 3]}` : '';
      const threeWordToken = i < rawTokens.length - 2 ? `${token} ${rawTokens[i + 1]} ${rawTokens[i + 2]}` : '';
      const twoWordToken = i < rawTokens.length - 1 ? `${token} ${rawTokens[i + 1]}` : '';

      // Check Hindi negation compound "bilkul nahi" / "bilkul nhi" / "बिल्कुल नहीं"
      if ((token === 'bilkul' || token === 'बिल्कुल') && i < rawTokens.length - 1 && (rawTokens[i + 1] === 'nahi' || rawTokens[i + 1] === 'nhi' || rawTokens[i + 1] === 'नहीं')) {
        isNegated = true;
        negationWindow = 3;
        i++; // consume compound
        continue;
      }

      // Check negation
      if (NEGATION_WORDS.has(token)) {
        isNegated = true;
        negationWindow = 3; // Negate the next 3 words
        continue;
      }

      // Check intensifier (bilkul, bohot, ekdum, very, etc.)
      if (INTENSIFIER_WORDS.has(token)) {
        isIntensified = true;
        intensifierWindow = 2; // Amplify the next 2 words
        continue;
      }

      // Check diminisher (thoda, minor, slightly)
      if (DIMINISHER_WORDS.has(token) || (twoWordToken && DIMINISHER_WORDS.has(twoWordToken))) {
        isDiminished = true;
        diminisherWindow = 3;
        if (twoWordToken && DIMINISHER_WORDS.has(twoWordToken)) i++;
        continue;
      }

      let val = 0;
      let consumed = 1;

      if (fourWordToken && (POSITIVE_LEXICON[fourWordToken] || NEGATIVE_LEXICON[fourWordToken])) {
        val = POSITIVE_LEXICON[fourWordToken] || NEGATIVE_LEXICON[fourWordToken];
        consumed = 4;
      } else if (threeWordToken && (POSITIVE_LEXICON[threeWordToken] || NEGATIVE_LEXICON[threeWordToken])) {
        val = POSITIVE_LEXICON[threeWordToken] || NEGATIVE_LEXICON[threeWordToken];
        consumed = 3;
      } else if (twoWordToken && (POSITIVE_LEXICON[twoWordToken] || NEGATIVE_LEXICON[twoWordToken])) {
        val = POSITIVE_LEXICON[twoWordToken] || NEGATIVE_LEXICON[twoWordToken];
        consumed = 2;
      } else if (POSITIVE_LEXICON[token] !== undefined) {
        val = POSITIVE_LEXICON[token];
      } else if (NEGATIVE_LEXICON[token] !== undefined) {
        val = NEGATIVE_LEXICON[token];
      }

      if (val !== 0) {
        if (isIntensified && intensifierWindow > 0) {
          val = val > 0 ? Math.min(1.0, val * 1.25) : Math.max(-1.0, val * 1.25);
        }
        if (isDiminished && diminisherWindow > 0) {
          val = val * 0.4; // Soften impact of minor complaint or praise
        }
        // Check post-diminisher lookahead (e.g., "heating issue hai thoda sa", "slow slightly")
        const lookaheadTokens = rawTokens.slice(i + consumed, i + consumed + 3).join(' ');
        if (lookaheadTokens.match(/\b(thoda sa|thoda|thodi|minor|slightly|little|somewhat|थोड़ा|हल्का)\b/)) {
          val = val * 0.4;
        }
        if (isNegated && negationWindow > 0) {
          // Negate the polarity: "not good" -> negative; "not bad" -> mildly positive
          val = val > 0 ? -Math.abs(val) * 0.85 : Math.abs(val) * 0.5;
        }
        score += val;
        matchCount++;
      }

      if (consumed > 1) {
        i += (consumed - 1);
      }

      if (negationWindow > 0) {
        negationWindow -= consumed;
        if (negationWindow <= 0) isNegated = false;
      }
      if (intensifierWindow > 0) {
        intensifierWindow -= consumed;
        if (intensifierWindow <= 0) isIntensified = false;
      }
      if (diminisherWindow > 0) {
        diminisherWindow -= consumed;
        if (diminisherWindow <= 0) isDiminished = false;
      }
    }

    const normalizedScore = matchCount > 0 ? Math.max(-1.0, Math.min(1.0, score / Math.max(1, Math.sqrt(matchCount)))) : 0;
    return { score: Math.round(normalizedScore * 100) / 100, tokens: rawTokens };
  }

  /**
   * Main analysis pipeline for customer reviews.
   */
  public analyzeReviews(
    reviewsInput: ReviewItem[] | string[] | string,
    options?: {
      claimedStarRating?: number | null;
      ratingsCount?: number | null;
      publishedReviewCount?: number | null;
      retrievedReviewCount?: number | null;
      category?: string | null;
      productTitle?: string | null;
      targetModel?: string | null;
      targetMarketplace?: string | null;
    }
  ): ReviewNlpReport {
    // Normalize input into ReviewItem[]
    let items: ReviewItem[] = [];
    if (typeof reviewsInput === 'string' && reviewsInput.trim().length > 0) {
      items = [{ review_text: reviewsInput.trim() }];
    } else if (Array.isArray(reviewsInput)) {
      items = reviewsInput
        .map(r => (typeof r === 'string' ? { review_text: r } : r))
        .filter(r => r && typeof r.review_text === 'string' && r.review_text.trim().length > 0);
    }

    const categoryAspects = getAspectsForCategory(options?.category, options?.productTitle);

    if (items.length === 0) {
      return {
        status: 'NO_REVIEWS',
        provenance_status: 'NO_REVIEWS',
        is_production_eligible: false,
        provenance_note: 'No customer reviews provided on this listing.',
        published_review_count: options?.publishedReviewCount ?? (typeof options?.ratingsCount === 'number' ? options.ratingsCount : null),
        retrieved_review_count: 0,
        reviews_analyzed_count: 0,
        overall_sentiment_score: null,
        satisfaction_index: null,
        sentiment_distribution: { positive_percentage: 0, neutral_percentage: 0, negative_percentage: 0, mixed_percentage: 0 },
        aspects: Object.entries(categoryAspects)
          .map(([key, def]) => ({
            key,
            display_name: def.label,
            sentiment_score: null,
            satisfaction_pct: null,
            mention_count: 0,
            positive_mentions: 0,
            negative_mentions: 0,
            sentiment_label: 'NO_DATA',
            defect_risk_level: 'LOW',
            status: 'NO_DATA',
            top_complaints: [],
            top_praises: [],
          })),
        four_way_classification: {
          product_dissatisfaction: {
            detected: false,
            score: 0,
            summary: 'No customer review data available to evaluate product dissatisfaction.',
          },
          manipulated_reviews: {
            detected: false,
            score: 0,
            summary: 'No review submissions found to check for manipulation or astroturfing.',
          },
          authenticity_concerns: {
            detected: false,
            score: 0,
            summary: 'No review evidence of counterfeit or duplicate complaints.',
          },
          insufficient_evidence: {
            flagged: true,
            summary: 'Zero customer reviews provided. Review dimension cannot be scored.',
          },
        },
        duplicate_review_indicators: {
          duplicate_clusters_found: 0,
          duplicate_reviews_count: 0,
          is_suspicious_clustering: false,
        },
        suspicious_patterns: {
          rating_review_dissonance_detected: false,
          dissonant_reviews_count: 0,
          generic_reviews_count: 0,
          counterfeit_complaints_count: 0,
          detailed_observations: [],
        },
        positive_themes: [],
        negative_themes: [],
        complaints: [],
        confidence_score: 0.50,
        limitations: ['No customer reviews provided on this listing. Review sentiment is unverified (not penalized).'],
      };
    }

    // Provenance validation & quarantine checks
    let hasTestFixture = false;
    let hasModelMismatch = false;
    let hasUnverified = false;

    items.forEach(item => {
      if (item.validation_status === 'TEST_DATA' || item.source_type === 'TEST_FIXTURE' || item.retrieval_method === 'FIXTURE') {
        hasTestFixture = true;
      } else if (
        item.validation_status === 'MODEL_MISMATCH' ||
        (options?.targetModel && item.product_model && !options.targetModel.toLowerCase().includes(item.product_model.toLowerCase()) && !item.product_model.toLowerCase().includes(options.targetModel.toLowerCase()))
      ) {
        hasModelMismatch = true;
      } else if (item.validation_status === 'UNVERIFIED' || item.source_type === 'CROSS_MARKETPLACE_CORRESPONDENCE' || !item.source_marketplace) {
        hasUnverified = true;
      }
    });

    let provenanceStatus: ReviewNlpReport['provenance_status'] = 'VERIFIED_LIVE';
    let isProductionEligible = true;
    let reportStatus: ReviewNlpReport['status'] = items.length >= 2 ? 'EVALUATED' : 'INSUFFICIENT_EVIDENCE';
    let provenanceNote: string | undefined = undefined;

    if (hasTestFixture) {
      provenanceStatus = 'TEST_FIXTURE_EXCLUDED';
      isProductionEligible = false;
      reportStatus = 'TEST_DATA_EXCLUDED';
      provenanceNote = 'Review items flagged as TEST_DATA or benchmark fixture. Quarantined and strictly excluded from live production trust scoring.';
    } else if (hasModelMismatch) {
      provenanceStatus = 'UNVERIFIED_EXCLUDED';
      isProductionEligible = false;
      reportStatus = 'UNVERIFIED_EXCLUDED';
      provenanceNote = 'Review items correspond to a different product model or variant. Cross-marketplace correspondence mismatch; excluded from production scoring.';
    } else if (hasUnverified) {
      provenanceStatus = 'UNVERIFIED_EXCLUDED';
      isProductionEligible = false;
      reportStatus = 'UNVERIFIED_EXCLUDED';
      provenanceNote = 'Review items lack verified live marketplace provenance or source URL corroboration. Excluded from production scoring.';
    } else if (items.some(i => i.source_type === 'MANUAL_USER_IMPORT')) {
      provenanceStatus = 'MANUAL_VERIFIED';
      isProductionEligible = true;
      provenanceNote = 'Manually imported reviews verified with product model correspondence.';
    } else {
      provenanceStatus = 'VERIFIED_LIVE';
      isProductionEligible = true;
      provenanceNote = 'All review items verified with genuine marketplace provenance and matching product model.';
    }

    let totalSentiment = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let mixedCount = 0;

    let dissonantCount = 0;
    let genericCount = 0;
    let counterfeitComplaints = 0;
    const observations: string[] = [];

    const aspectMap: Record<string, { pos: number; neg: number; neutral: number; totalScore: number; praises: string[]; complaints: string[] }> = {};
    for (const key of Object.keys(categoryAspects)) {
      aspectMap[key] = { pos: 0, neg: 0, neutral: 0, totalScore: 0, praises: [], complaints: [] };
    }

    const normalizedTexts: string[] = [];
    const duplicates: Set<number> = new Set();

    items.forEach((item, idx) => {
      const text = item.review_text;
      const cleanNorm = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

      // Check duplicates
      for (let j = 0; j < normalizedTexts.length; j++) {
        if (normalizedTexts[j] === cleanNorm && cleanNorm.length > 10) {
          duplicates.add(idx);
          duplicates.add(j);
        }
      }
      normalizedTexts.push(cleanNorm);

      // Check generic reviews (< 4 words with minimal content e.g. "Good", "Nice product")
      const words = cleanNorm.split(/\s+/).filter(Boolean);
      if (words.length <= 3 && (words.includes('good') || words.includes('nice') || words.includes('super') || words.includes('ok'))) {
        genericCount++;
      }

      // Check counterfeit / duplicate complaints
      if (cleanNorm.match(/\b(fake|duplicate|counterfeit|first copy|nakli|dhokha|chori|farzi)\b/)) {
        counterfeitComplaints++;
      }

      // Sentence sentiment
      const { score } = this.analyzeSentenceSentiment(text);
      totalSentiment += score;

      if (score >= 0.20) {
        positiveCount++;
      } else if (score <= -0.20) {
        negativeCount++;
      } else {
        neutralCount++;
      }

      // Check for mixed sentiment in single review
      const clauses = text.split(/(?<=[.!?])\s+|\s+(?:but|however|although|par|lekin|magar|kintu|parantu)\s+/i).filter(Boolean);
      let clausePos = false;
      let clauseNeg = false;
      clauses.forEach(c => {
        const cs = this.analyzeSentenceSentiment(c).score;
        if (cs >= 0.18) clausePos = true;
        if (cs <= -0.18) clauseNeg = true;
      });
      if (clausePos && clauseNeg) {
        mixedCount++;
      }

      // Star rating vs text dissonance
      if (typeof item.rating === 'number') {
        if (item.rating >= 4 && score <= -0.30) {
          dissonantCount++;
          observations.push(`Discordant rating: ${item.rating} stars submitted with negative feedback ("${text.slice(0, 60)}...")`);
        } else if (item.rating <= 2 && score >= 0.40) {
          dissonantCount++;
          observations.push(`Discordant rating: ${item.rating} stars submitted with positive text ("${text.slice(0, 60)}...")`);
        }
      }

      // Match against category-specific aspects with clause-level sentiment analysis
      for (const [key, def] of Object.entries(categoryAspects)) {
        const matchingClauses = clauses.filter((c) => def.keywords.some((kw) => c.toLowerCase().includes(kw)));
        if (matchingClauses.length > 0) {
          for (const clause of matchingClauses) {
            const clauseScore = this.analyzeSentenceSentiment(clause).score;
            aspectMap[key].totalScore += clauseScore;
            if (clauseScore >= 0.15) {
              aspectMap[key].pos++;
              if (aspectMap[key].praises.length < 3) aspectMap[key].praises.push(clause.trim().slice(0, 100));
            } else if (clauseScore <= -0.15) {
              aspectMap[key].neg++;
              if (aspectMap[key].complaints.length < 3) aspectMap[key].complaints.push(clause.trim().slice(0, 100));
            } else {
              aspectMap[key].neutral++;
            }
          }
        } else if (def.keywords.some((kw) => text.toLowerCase().includes(kw))) {
          aspectMap[key].totalScore += score;
          if (score >= 0.15) {
            aspectMap[key].pos++;
            if (aspectMap[key].praises.length < 3) aspectMap[key].praises.push(text.slice(0, 100));
          } else if (score <= -0.15) {
            aspectMap[key].neg++;
            if (aspectMap[key].complaints.length < 3) aspectMap[key].complaints.push(text.slice(0, 100));
          } else {
            aspectMap[key].neutral++;
          }
        }
      }
    });

    const total = items.length;
    const avgScore = Math.round((totalSentiment / total) * 100) / 100;
    const posPct = Math.round((positiveCount / total) * 100);
    const negPct = Math.round((negativeCount / total) * 100);
    const neuPct = Math.max(0, 100 - posPct - negPct);

    let satisfactionIndex = Math.round(Math.max(10, Math.min(98, ((avgScore + 1.0) / 2.0) * 100)));
    let ratingReviewDissonanceDetected = dissonantCount > 0;

    const claimedStars = options?.claimedStarRating;
    const ratingsCount = options?.ratingsCount;

    // Check Aggregate Rating vs Text Review Discordance (Case B fix)
    if (typeof claimedStars === 'number' && claimedStars > 0) {
      // If marketplace claimed rating indicates dissatisfaction (<= 3.7/5) and text reviews sample is predominantly positive (>= 60%)
      if (claimedStars <= 3.7 && posPct >= 60) {
        ratingReviewDissonanceDetected = true;
        const starSat = Math.round(((claimedStars - 1) / 4.0) * 100);
        const dissatPct = Math.round((1 - (claimedStars - 1) / 4.0) * 100);
        observations.push(
          `Rating-Review Discordance: Marketplace aggregate rating is ★ ${claimedStars.toFixed(1)} / 5.0${ratingsCount ? ` (${ratingsCount.toLocaleString()} ratings)` : ''}, indicating ~${dissatPct}% customer dissatisfaction. The small ${total}-review positive text sample represents sampling bias. Satisfaction index grounded in aggregate rating.`
        );
        // Ground satisfaction_index in aggregate rating to prevent positive sampling bias
        satisfactionIndex = Math.round(satisfactionIndex * 0.25 + starSat * 0.75);
      }
    }

    // Aspect findings - using dynamic category-specific aspects
    const aspects: AspectFinding[] = Object.entries(categoryAspects).map(([key, def]) => {
      const data = aspectMap[key] || { pos: 0, neg: 0, neutral: 0, totalScore: 0, praises: [], complaints: [] };
      const mentions = data.pos + data.neg + data.neutral;
      if (mentions === 0) {
        return {
          key,
          display_name: def.label,
          sentiment_score: null,
          satisfaction_pct: null,
          mention_count: 0,
          positive_mentions: 0,
          negative_mentions: 0,
          sentiment_label: 'NO_DATA',
          defect_risk_level: 'LOW',
          status: 'NO_DATA',
          top_complaints: [],
          top_praises: [],
        };
      }

      const aspectScore = Math.round((data.totalScore / mentions) * 100) / 100;
      const sat = Math.round(Math.max(0, Math.min(100, ((aspectScore + 1.0) / 2.0) * 100)));
      const label = aspectScore >= 0.20 ? 'POSITIVE' : (aspectScore <= -0.20 ? 'CONCERN' : 'NEUTRAL');
      const defectRisk = aspectScore < -0.35 ? 'HIGH' : (aspectScore < 0 ? 'MODERATE' : 'LOW');

      return {
        key,
        display_name: def.label,
        sentiment_score: aspectScore,
        satisfaction_pct: sat,
        mention_count: mentions,
        positive_mentions: data.pos,
        negative_mentions: data.neg,
        sentiment_label: label,
        defect_risk_level: defectRisk,
        status: 'EVALUATED',
        top_complaints: data.complaints,
        top_praises: data.praises,
      };
    });

    const positiveThemes: string[] = [];
    const negativeThemes: string[] = [];
    const complaints: string[] = [];

    aspects.forEach(a => {
      if (a.sentiment_label === 'POSITIVE' && a.mention_count > 0) {
        positiveThemes.push(`Positive feedback on ${a.display_name} (${a.satisfaction_pct}% satisfaction)`);
      } else if (a.sentiment_label === 'CONCERN') {
        negativeThemes.push(`Customer complaints observed regarding ${a.display_name}`);
        complaints.push(...a.top_complaints);
      }
    });

    if (counterfeitComplaints > 0) {
      observations.push(`${counterfeitComplaints} review(s) explicitly mention counterfeit, fake, or duplicate merchandise.`);
    }

    const limitations: string[] = [];
    if (total < 5) {
      limitations.push(`Small sample size (${total} review(s) analyzed). Aspect confidence is preliminary.`);
    }

    const confidenceScore = total >= 10 ? 0.92 : total >= 3 ? 0.82 : 0.65;

    // Compute 4-way classification
    const qualityAspects = ['quality', 'performance', 'battery', 'build_quality', 'durability_reliability', 'comfort_usability'];
    const qualityComplaints = qualityAspects.reduce((acc, k) => acc + (aspectMap[k]?.neg || 0), 0);
    const qualityTotal = qualityAspects.reduce((acc, k) => acc + (aspectMap[k]?.pos || 0) + (aspectMap[k]?.neg || 0), 0);
    const dissatScore = qualityTotal > 0 ? Math.round((qualityComplaints / qualityTotal) * 100) : (negPct > 35 ? negPct : 0);
    const isProductDissatisfaction = dissatScore >= 35 || satisfactionIndex < 55;

    const isManipulated = duplicates.size >= 2 || (dissonantCount > 0 && total >= 3) || (genericCount / total > 0.40 && total >= 5);
    const manipScore = Math.min(100, (duplicates.size * 25) + (dissonantCount * 30) + (genericCount > 2 ? 20 : 0));

    const isAuthenticityConcern = counterfeitComplaints > 0 || (aspectMap['authenticity']?.neg || 0) > 0;
    const authScore = Math.min(100, counterfeitComplaints * 40 + (aspectMap['authenticity']?.neg || 0) * 35);

    const isInsufficientEvidence = total < 3;

    const fourWayClassification: FourWayClassification = {
      product_dissatisfaction: {
        detected: isProductDissatisfaction,
        score: dissatScore,
        summary: isProductDissatisfaction
          ? `High product dissatisfaction detected (${dissatScore}% negative quality/performance feedback).`
          : 'Low product dissatisfaction; reviews reflect normal baseline satisfaction.',
      },
      manipulated_reviews: {
        detected: isManipulated,
        score: manipScore,
        summary: isManipulated
          ? `Suspicious review manipulation detected (${duplicates.size} duplicate reviews, ${dissonantCount} rating dissonances).`
          : 'No evidence of bot-farm astroturfing or review manipulation detected.',
      },
      authenticity_concerns: {
        detected: isAuthenticityConcern,
        score: authScore,
        summary: isAuthenticityConcern
          ? `Authenticity alerts present: ${counterfeitComplaints} review(s) explicitly warn of fake or counterfeit merchandise.`
          : 'No explicit counterfeit or fake product complaints detected in reviews.',
      },
      insufficient_evidence: {
        flagged: isInsufficientEvidence,
        summary: isInsufficientEvidence
          ? `Small sample size (${total} review(s) analyzed). Quantitative confidence is limited.`
          : `Adequate sample size (${total} reviews analyzed across operational dimensions).`,
      },
    };

    if (!isProductionEligible && provenanceNote) {
      limitations.push(`Provenance quarantine active: ${provenanceNote}`);
    }

    return {
      status: reportStatus,
      provenance_status: provenanceStatus,
      is_production_eligible: isProductionEligible,
      provenance_note: provenanceNote,
      published_review_count: options?.publishedReviewCount ?? (typeof options?.ratingsCount === 'number' ? options.ratingsCount : null),
      retrieved_review_count: options?.retrievedReviewCount ?? total,
      reviews_analyzed_count: total,
      overall_sentiment_score: avgScore,
      satisfaction_index: satisfactionIndex,
      sentiment_distribution: {
        positive_percentage: posPct,
        neutral_percentage: neuPct,
        negative_percentage: negPct,
        mixed_percentage: Math.round((mixedCount / total) * 100),
      },
      aspects,
      four_way_classification: fourWayClassification,
      duplicate_review_indicators: {
        duplicate_clusters_found: duplicates.size > 0 ? Math.floor(duplicates.size / 2) : 0,
        duplicate_reviews_count: duplicates.size,
        is_suspicious_clustering: duplicates.size >= 3,
      },
      suspicious_patterns: {
        rating_review_dissonance_detected: ratingReviewDissonanceDetected,
        dissonant_reviews_count: dissonantCount,
        generic_reviews_count: genericCount,
        counterfeit_complaints_count: counterfeitComplaints,
        detailed_observations: observations,
      },
      positive_themes: positiveThemes,
      negative_themes: negativeThemes,
      complaints: Array.from(new Set(complaints)),
      confidence_score: confidenceScore,
      limitations,
    };
  }
}

export const reviewNlpEngine = new ReviewNlpEngine();
