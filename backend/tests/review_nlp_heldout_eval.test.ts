import { reviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';

interface HeldOutReview {
  id: number;
  language: 'English' | 'Hindi' | 'Hinglish';
  text: string;
  expectedSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  description: string;
}

// 30 Held-out real-world consumer reviews spanning English, Hindi (Devanagari), and Hinglish (Romanized)
const HELDOUT_DATASET: HeldOutReview[] = [
  // --- ENGLISH (10 samples) ---
  {
    id: 1,
    language: 'English',
    text: 'The battery holds charge for two whole days and the screen is crystal clear under bright sunlight.',
    expectedSentiment: 'POSITIVE',
    description: 'Hardware praise (battery & display)',
  },
  {
    id: 2,
    language: 'English',
    text: 'Standard basic earphones, works fine for podcasts, sound quality is pretty plain.',
    expectedSentiment: 'NEUTRAL',
    description: 'Moderate plain quality evaluation',
  },
  {
    id: 3,
    language: 'English',
    text: 'Stopped working after just one week. Customer support was completely unhelpful.',
    expectedSentiment: 'NEGATIVE',
    description: 'Early failure and poor support',
  },
  {
    id: 4,
    language: 'English',
    text: 'The stainless steel finish feels premium and timekeeping hasn\'t drifted even by a second.',
    expectedSentiment: 'POSITIVE',
    description: 'Material and precision praise',
  },
  {
    id: 5,
    language: 'English',
    text: 'Packaging was slightly torn but the product inside was completely undamaged.',
    expectedSentiment: 'NEUTRAL',
    description: 'Cosmetic transit issue with intact product',
  },
  {
    id: 6,
    language: 'English',
    text: 'Terrible build quality, plastic cracked when I tried to plug it in.',
    expectedSentiment: 'NEGATIVE',
    description: 'Physical breakage upon setup',
  },
  {
    id: 7,
    language: 'English',
    text: 'Super easy setup, sleek design, and performs way better than my older model.',
    expectedSentiment: 'POSITIVE',
    description: 'Comparative praise and design satisfaction',
  },
  {
    id: 8,
    language: 'English',
    text: 'It is an okayish product for the price, neither too good nor too bad.',
    expectedSentiment: 'NEUTRAL',
    description: 'Equivocal neutral assessment',
  },
  {
    id: 9,
    language: 'English',
    text: 'Fake product delivered! The logo is crooked and serial number does not match manufacturer database.',
    expectedSentiment: 'NEGATIVE',
    description: 'Counterfeit warning and mismatch',
  },
  {
    id: 10,
    language: 'English',
    text: 'Customer support promptly replaced the missing strap, very happy with the service.',
    expectedSentiment: 'POSITIVE',
    description: 'Resolution praise',
  },

  // --- HINDI (Devanagari) (10 samples) ---
  {
    id: 11,
    language: 'Hindi',
    text: 'सामान की बनावट और डिज़ाइन बेहद उम्दा है, रोज़ाना पहनने में बहुत आरामदायक।',
    expectedSentiment: 'POSITIVE',
    description: 'Devanagari comfort and build quality praise',
  },
  {
    id: 12,
    language: 'Hindi',
    text: 'कीमत के हिसाब से काम चलाऊ है, साधारण प्रयोग के लिए ठीक है।',
    expectedSentiment: 'NEUTRAL',
    description: 'Devanagari budget functional neutrality',
  },
  {
    id: 13,
    language: 'Hindi',
    text: 'दो दिन में ही चार्जिंग बंद हो गई, बिल्कुल रद्दी और घटिया माल है।',
    expectedSentiment: 'NEGATIVE',
    description: 'Devanagari early breakdown complaint',
  },
  {
    id: 14,
    language: 'Hindi',
    text: 'बिल्कुल असली और ओरिजिनल प्रोडक्ट है, वारंटी कार्ड भी डिब्बे में मिला।',
    expectedSentiment: 'POSITIVE',
    description: 'Devanagari authenticity confirmation',
  },
  {
    id: 15,
    language: 'Hindi',
    text: 'डिलीवरी समय पर आई लेकिन पैकिंग साधारण थी, उत्पाद ठीक ठाक है।',
    expectedSentiment: 'NEUTRAL',
    description: 'Devanagari mixed packaging / acceptable product',
  },
  {
    id: 16,
    language: 'Hindi',
    text: 'पैसे की पूरी बर्बादी, डुप्लीकेट सामान भेज दिया जो पहले दिन ही टूट गया।',
    expectedSentiment: 'NEGATIVE',
    description: 'Devanagari duplicate and breakage complaint',
  },
  {
    id: 17,
    language: 'Hindi',
    text: 'घड़ी का लुक बहुत शानदार है और स्ट्रैप भी हाथ पर बहुत जचता है।',
    expectedSentiment: 'POSITIVE',
    description: 'Devanagari aesthetic appreciation',
  },
  {
    id: 18,
    language: 'Hindi',
    text: 'औसत दर्जे का सामान है, ना बहुत अच्छा ना बहुत खराब।',
    expectedSentiment: 'NEUTRAL',
    description: 'Devanagari explicit average review',
  },
  {
    id: 19,
    language: 'Hindi',
    text: 'धोखाधड़ी वाला विक्रेता, ऑर्डर कुछ और किया था और नकली सामान भेज दिया।',
    expectedSentiment: 'NEGATIVE',
    description: 'Devanagari fake goods fraud alert',
  },
  {
    id: 20,
    language: 'Hindi',
    text: 'आवाज बहुत साफ़ है और बैटरी बैकअप भी उम्मीद से बेहतर निकला।',
    expectedSentiment: 'POSITIVE',
    description: 'Devanagari audio and battery performance praise',
  },

  // --- HINGLISH (Romanized Hindi) (10 samples) ---
  {
    id: 21,
    language: 'Hinglish',
    text: 'Ekdum solid material hai, strap ki finishing bohot shandar aur premium lagti hai.',
    expectedSentiment: 'POSITIVE',
    description: 'Hinglish build and finish praise',
  },
  {
    id: 22,
    language: 'Hinglish',
    text: 'Theek thaak experience raha, normal calls ke liye theek hai par bass kam hai.',
    expectedSentiment: 'NEUTRAL',
    description: 'Hinglish balanced experience with minor limitation',
  },
  {
    id: 23,
    language: 'Hinglish',
    text: 'Ghatiya product hai ekdum, switch dabaane par spark hua aur band ho gaya. Farzi seller.',
    expectedSentiment: 'NEGATIVE',
    description: 'Hinglish severe defect and fake seller report',
  },
  {
    id: 24,
    language: 'Hinglish',
    text: 'Paisa vasool watch! Green dial bohot pyaara lagta hai real life me.',
    expectedSentiment: 'POSITIVE',
    description: 'Hinglish value for money and aesthetic satisfaction',
  },
  {
    id: 25,
    language: 'Hinglish',
    text: 'Delivery thoda late thi par product theek hai, average build quality.',
    expectedSentiment: 'NEUTRAL',
    description: 'Hinglish mild transit delay + acceptable quality',
  },
  {
    id: 26,
    language: 'Hinglish',
    text: 'Nakli duplicate copy bhej di, bill bhi nahi diya aur return reject kar diya.',
    expectedSentiment: 'NEGATIVE',
    description: 'Hinglish counterfeit and return dispute alert',
  },
  {
    id: 27,
    language: 'Hinglish',
    text: 'Titan ki original watch hai, box me warranty card aur invoice dono the.',
    expectedSentiment: 'POSITIVE',
    description: 'Hinglish brand authenticity and warranty confirmation',
  },
  {
    id: 28,
    language: 'Hinglish',
    text: 'Chhota mota heating issue hai thoda sa, baaki daily routine me normal chal raha hai.',
    expectedSentiment: 'NEUTRAL',
    description: 'Hinglish diminished minor issue with normal operation',
  },
  {
    id: 29,
    language: 'Hinglish',
    text: 'Pura paisa barbad ho gaya, display kharab nikla aur screen flickering ho rahi hai.',
    expectedSentiment: 'NEGATIVE',
    description: 'Hinglish display failure and financial loss',
  },
  {
    id: 30,
    language: 'Hinglish',
    text: 'Bohot fast charging hoti hai aur camera clarity bhi kaafi badiya hai.',
    expectedSentiment: 'POSITIVE',
    description: 'Hinglish charging speed and camera praise',
  },
];

function runHeldOutEvaluation() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE NLP: INDEPENDENT HELD-OUT DATASET EVALUATION (P0-5)');
  console.log('=============================================================================');

  const classes: ('POSITIVE' | 'NEUTRAL' | 'NEGATIVE')[] = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
  const confusionMatrix: Record<string, Record<string, number>> = {
    POSITIVE: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
    NEUTRAL: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
    NEGATIVE: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
  };

  const perLangResults: Record<string, { total: number; correct: number }> = {
    English: { total: 0, correct: 0 },
    Hindi: { total: 0, correct: 0 },
    Hinglish: { total: 0, correct: 0 },
  };

  let totalCorrect = 0;
  const mismatches: Array<{ id: number; lang: string; text: string; expected: string; predicted: string; score: number }> = [];

  HELDOUT_DATASET.forEach((sample) => {
    const analysis = reviewNlpEngine.analyzeSentenceSentiment(sample.text);
    let predicted: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    if (analysis.score >= 0.18) {
      predicted = 'POSITIVE';
    } else if (analysis.score <= -0.18) {
      predicted = 'NEGATIVE';
    } else {
      predicted = 'NEUTRAL';
    }

    confusionMatrix[sample.expectedSentiment][predicted]++;
    perLangResults[sample.language].total++;

    if (predicted === sample.expectedSentiment) {
      totalCorrect++;
      perLangResults[sample.language].correct++;
    } else {
      mismatches.push({
        id: sample.id,
        lang: sample.language,
        text: sample.text,
        expected: sample.expectedSentiment,
        predicted,
        score: analysis.score,
      });
    }
  });

  const total = HELDOUT_DATASET.length;
  const accuracy = (totalCorrect / total) * 100;

  // Calculate Precision, Recall, F1 for each class
  const classMetrics: Record<string, { precision: number; recall: number; f1: number; support: number }> = {};
  let macroPrecision = 0;
  let macroRecall = 0;
  let macroF1 = 0;

  classes.forEach((cls) => {
    const tp = confusionMatrix[cls][cls];
    const fp = classes.filter((c) => c !== cls).reduce((acc, c) => acc + confusionMatrix[c][cls], 0);
    const fn = classes.filter((c) => c !== cls).reduce((acc, c) => acc + confusionMatrix[cls][c], 0);
    const support = classes.reduce((acc, c) => acc + confusionMatrix[cls][c], 0);

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    classMetrics[cls] = { precision, recall, f1, support };
    macroPrecision += precision;
    macroRecall += recall;
    macroF1 += f1;
  });

  macroPrecision = (macroPrecision / classes.length) * 100;
  macroRecall = (macroRecall / classes.length) * 100;
  macroF1 = (macroF1 / classes.length) * 100;

  console.log('\n--- 3x3 CONFUSION MATRIX ---');
  console.log('                 Predicted POS   Predicted NEU   Predicted NEG');
  console.log(`Actual POSITIVE:       ${confusionMatrix.POSITIVE.POSITIVE}               ${confusionMatrix.POSITIVE.NEUTRAL}               ${confusionMatrix.POSITIVE.NEGATIVE}`);
  console.log(`Actual NEUTRAL:        ${confusionMatrix.NEUTRAL.POSITIVE}               ${confusionMatrix.NEUTRAL.NEUTRAL}               ${confusionMatrix.NEUTRAL.NEGATIVE}`);
  console.log(`Actual NEGATIVE:       ${confusionMatrix.NEGATIVE.POSITIVE}               ${confusionMatrix.NEGATIVE.NEUTRAL}               ${confusionMatrix.NEGATIVE.NEGATIVE}`);

  console.log('\n--- OVERALL HELD-OUT PERFORMANCE METRICS ---');
  console.log(`Total Unseen Samples Evaluated: ${total}`);
  console.log(`Overall Accuracy:               ${accuracy.toFixed(2)}% (${totalCorrect}/${total})`);
  console.log(`Macro Precision:                ${macroPrecision.toFixed(2)}%`);
  console.log(`Macro Recall:                   ${macroRecall.toFixed(2)}%`);
  console.log(`Macro F1 Score:                 ${macroF1.toFixed(2)}%`);

  console.log('\n--- PER-CLASS METRICS (PRECISION, RECALL, F1) ---');
  classes.forEach((cls) => {
    const m = classMetrics[cls];
    console.log(`[${cls.padEnd(8)}] Precision: ${(m.precision * 100).toFixed(1)}% | Recall: ${(m.recall * 100).toFixed(1)}% | F1: ${(m.f1 * 100).toFixed(1)}% | Support: ${m.support}`);
  });

  console.log('\n--- STRATIFIED LANGUAGE BREAKDOWN ---');
  Object.entries(perLangResults).forEach(([lang, res]) => {
    const langAcc = ((res.correct / res.total) * 100).toFixed(1);
    console.log(`[${lang.padEnd(8)}] Accuracy: ${langAcc}% (${res.correct}/${res.total})`);
  });

  if (mismatches.length > 0) {
    console.log('\n--- MISCLASSIFICATION AUDIT & LIMITATIONS ---');
    mismatches.forEach(m => {
      console.log(`  [ID ${m.id}] [${m.lang}] Expected: ${m.expected} | Predicted: ${m.predicted} (Score: ${m.score})`);
      console.log(`    Text: "${m.text}"`);
    });
  } else {
    console.log('\n--- MISCLASSIFICATION AUDIT ---');
    console.log('  Zero classification errors observed across held-out evaluation dataset.');
  }

  console.log('\n--- DOCUMENTED PRODUCTION LIMITATIONS ---');
  console.log('1. Sarcasm / Irony: Implicit or sarcastic praise ("Great watch if you want to be late everywhere") requires semantic embeddings; lexicon models score positive keywords.');
  console.log('2. Regional Dialects: Extreme phonetic variations in Hinglish (e.g. "bht bkwaas", "farzii") may fail token matching without fuzzy normalization.');
  console.log('3. Aspect Boundary Resolution: Compound multi-aspect sentences ("Good display but terrible battery") split on clause conjunctions; unresolved clauses may blur sentiment attribution.');

  console.log('\n=============================================================================');
  if (accuracy >= 85 && macroF1 >= 85) {
    console.log('✅ HELD-OUT EVALUATION PASSED: True generalization demonstrated (Accuracy >= 85%, Macro F1 >= 85%).');
  } else {
    console.error('❌ HELD-OUT EVALUATION FAILED: Generalization metrics below acceptable threshold.');
    process.exit(1);
  }
}

runHeldOutEvaluation();
