import { reviewNlpEngine } from '../src/modules/investigate/review_nlp_engine';

interface LabelledReview {
  id: number;
  language: 'English' | 'Hindi' | 'Hinglish';
  text: string;
  expectedSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  expectedAspect?: string;
}

// Curated benchmark set spanning English, Hindi (Devanagari), and Hinglish (Romanized)
const BENCHMARK_DATASET: LabelledReview[] = [
  // --- ENGLISH ---
  { id: 1, language: 'English', text: 'Outstanding build quality and battery life lasts more than 30 hours!', expectedSentiment: 'POSITIVE' },
  { id: 2, language: 'English', text: 'Decent watch for the price, neither great nor bad, average experience.', expectedSentiment: 'NEUTRAL' },
  { id: 3, language: 'English', text: 'Worst purchase ever. Completely broken on arrival and totally fake.', expectedSentiment: 'NEGATIVE' },
  { id: 4, language: 'English', text: 'The display is crisp and vivid, very pleased with the purchase.', expectedSentiment: 'POSITIVE' },
  { id: 5, language: 'English', text: 'Sound is okay for daily calls, nothing special to write home about.', expectedSentiment: 'NEUTRAL' },
  { id: 6, language: 'English', text: 'Device stopped working after 3 days. Complete waste of money.', expectedSentiment: 'NEGATIVE' },
  { id: 7, language: 'English', text: 'Flawless performance, lightning fast charging and elegant finish.', expectedSentiment: 'POSITIVE' },
  { id: 8, language: 'English', text: 'Standard packaging, arrived on time as expected.', expectedSentiment: 'NEUTRAL' },

  // --- HINDI (Devanagari) ---
  { id: 9, language: 'Hindi', text: 'यह घड़ी बहुत सुंदर है, क्वालिटी और फिनिशिंग एकदम शानदार है।', expectedSentiment: 'POSITIVE' },
  { id: 10, language: 'Hindi', text: 'घड़ी ठीक ठाक है, काम चल जाता है। साधारण उत्पाद।', expectedSentiment: 'NEUTRAL' },
  { id: 11, language: 'Hindi', text: 'बिल्कुल घटिया और नकली सामान। 2 दिन में बंद हो गई। पैसे बर्बाद।', expectedSentiment: 'NEGATIVE' },
  { id: 12, language: 'Hindi', text: 'बहुत बढ़िया उत्पाद, समय पर डिलीवरी और बेहतरीन बैटरी।', expectedSentiment: 'POSITIVE' },
  { id: 13, language: 'Hindi', text: 'सामान्य पैकिंग, औसत काम करता है।', expectedSentiment: 'NEUTRAL' },
  { id: 14, language: 'Hindi', text: 'धोखा मिला, नकली और टूटा हुआ माल भेजा। बिल्कुल मत खरीदो।', expectedSentiment: 'NEGATIVE' },

  // --- HINGLISH (Romanized Hindi) ---
  { id: 15, language: 'Hinglish', text: 'Bohot zabardast quality hai! Battery backup bhi ekdum mast hai.', expectedSentiment: 'POSITIVE' },
  { id: 16, language: 'Hinglish', text: 'Theek thaak hai product, normal sa hai kuch khas nahi.', expectedSentiment: 'NEUTRAL' },
  { id: 17, language: 'Hinglish', text: 'Ekdum bekar product hai bhai, 1 din me toot gaya. Total paisa waste.', expectedSentiment: 'NEGATIVE' },
  { id: 18, language: 'Hinglish', text: 'Superb packaging aur bohot pyari watch hai, Titan official jaisa feel hai.', expectedSentiment: 'POSITIVE' },
  { id: 19, language: 'Hinglish', text: 'Normal sa watch hai, daily use ke liye theek hai.', expectedSentiment: 'NEUTRAL' },
  { id: 20, language: 'Hinglish', text: 'Nakli duplicate item deliver kiya, strap bhi chori ka lag raha hai farzi seller.', expectedSentiment: 'NEGATIVE' },
  { id: 21, language: 'Hinglish', text: 'Chala to theek hai par heating issue hai thoda sa.', expectedSentiment: 'NEUTRAL' },
  { id: 22, language: 'Hinglish', text: 'Asli brand product mila, shandar look aur premium feel!', expectedSentiment: 'POSITIVE' },
  { id: 23, language: 'Hinglish', text: 'Kharab product, display kharab nikla aur warranty claim nahi hua.', expectedSentiment: 'NEGATIVE' },
  { id: 24, language: 'Hinglish', text: 'Paisa vasool item, bahut achi packaging aur direct delivery.', expectedSentiment: 'POSITIVE' },
];

function runBenchmark() {
  console.log('=============================================================================');
  console.log('TRUSTSPHERE NLP ABSA & MULTILINGUAL BENCHMARK EVALUATION');
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

  BENCHMARK_DATASET.forEach((sample) => {
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
      console.log(`[MISMATCH] [${sample.language}] ID ${sample.id}`);
      console.log(`  Text: "${sample.text}"`);
      console.log(`  Expected: ${sample.expectedSentiment} | Predicted: ${predicted} (Score: ${analysis.score})`);
    }
  });

  const total = BENCHMARK_DATASET.length;
  const accuracy = (totalCorrect / total) * 100;

  // Calculate Precision, Recall, F1 for each class
  const classMetrics: Record<string, { precision: number; recall: number; f1: number }> = {};
  let macroPrecision = 0;
  let macroRecall = 0;
  let macroF1 = 0;

  classes.forEach((cls) => {
    const tp = confusionMatrix[cls][cls];
    const fp = classes.filter((c) => c !== cls).reduce((acc, c) => acc + confusionMatrix[c][cls], 0);
    const fn = classes.filter((c) => c !== cls).reduce((acc, c) => acc + confusionMatrix[cls][c], 0);

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    classMetrics[cls] = { precision, recall, f1 };
    macroPrecision += precision;
    macroRecall += recall;
    macroF1 += f1;
  });

  macroPrecision = (macroPrecision / classes.length) * 100;
  macroRecall = (macroRecall / classes.length) * 100;
  macroF1 = (macroF1 / classes.length) * 100;

  console.log('\n--- CONFUSION MATRIX ---');
  console.log('                 Predicted POS   Predicted NEU   Predicted NEG');
  console.log(`Actual POSITIVE:       ${confusionMatrix.POSITIVE.POSITIVE}               ${confusionMatrix.POSITIVE.NEUTRAL}               ${confusionMatrix.POSITIVE.NEGATIVE}`);
  console.log(`Actual NEUTRAL:        ${confusionMatrix.NEUTRAL.POSITIVE}               ${confusionMatrix.NEUTRAL.NEUTRAL}               ${confusionMatrix.NEUTRAL.NEGATIVE}`);
  console.log(`Actual NEGATIVE:       ${confusionMatrix.NEGATIVE.POSITIVE}               ${confusionMatrix.NEGATIVE.NEUTRAL}               ${confusionMatrix.NEGATIVE.NEGATIVE}`);

  console.log('\n--- OVERALL METRICS ---');
  console.log(`Total Samples: ${total}`);
  console.log(`Overall Accuracy: ${accuracy.toFixed(2)}% (${totalCorrect}/${total})`);
  console.log(`Macro Precision:  ${macroPrecision.toFixed(2)}%`);
  console.log(`Macro Recall:     ${macroRecall.toFixed(2)}%`);
  console.log(`Macro F1 Score:   ${macroF1.toFixed(2)}%`);

  console.log('\n--- PER-CLASS METRICS ---');
  classes.forEach((cls) => {
    const m = classMetrics[cls];
    console.log(`[${cls.padEnd(8)}] Precision: ${(m.precision * 100).toFixed(1)}% | Recall: ${(m.recall * 100).toFixed(1)}% | F1: ${(m.f1 * 100).toFixed(1)}%`);
  });

  console.log('\n--- LANGUAGE BREAKDOWN ---');
  Object.entries(perLangResults).forEach(([lang, res]) => {
    const langAcc = ((res.correct / res.total) * 100).toFixed(1);
    console.log(`[${lang.padEnd(8)}] Accuracy: ${langAcc}% (${res.correct}/${res.total})`);
  });

  console.log('\n=============================================================================');
  if (accuracy >= 85) {
    console.log('✅ BENCHMARK PASSED: Multilingual ABSA meets high-accuracy requirement (>= 85%).');
  } else {
    console.error('❌ BENCHMARK FAILED: Accuracy below 85%.');
    process.exit(1);
  }
}

runBenchmark();
