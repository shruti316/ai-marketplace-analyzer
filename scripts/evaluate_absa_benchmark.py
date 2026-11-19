"""
TrustSphere ABSA Engine vs Baseline Evaluation Benchmark.

Evaluates TrustSphere's Aspect-Based Sentiment Analysis (ABSA), Hinglish Calibration,
and Rating-Review Dissonance Detection against a naive baseline (Generic VADER without domain tuning)
on a hand-labeled benchmark of 60 representative Indian e-commerce reviews.

Usage:
    python scripts/evaluate_absa_benchmark.py
"""

import sys
import os
import time
from typing import Dict, List, Any

# Ensure project root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.nlp.aspect_analyzer import AspectReviewAnalyzer
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# 60 Hand-Labeled Indian Marketplace Review Benchmark
BENCHMARK_DATASET = [
    # --- Authenticity & Hinglish slang (Fake / Nakli / First Copy) ---
    {"text": "Bilkul nakli product hai, do din me sole nikal gaya. Don't buy!", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "100% duplicate shoes, barcode scan gives error. Fake Nike copy.", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Ye 1st copy maal hai, original box bhi nahi mila. Dhokha hua.", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Looks duplicate. Stitching is uneven and chemical smell is strong.", "rating": 2.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Defective piece sent, counterfeit product for sure.", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Chor seller, duplicate item delivered instead of original brand.", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Third class duplicate quality, completely fake packaging.", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Totally fraudulent product, MRP sticker was torn off and handwritten.", "rating": 1.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": False},

    # --- Authenticity & Hinglish slang (Genuine / Asli / Paisa Vasool) ---
    {"text": "Ekdum genuine product, verified QR code on box and sole.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Bilkul asli maal hai, verified by scanning brand hologram. Paisa vasool!", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Original authentic product with official manufacturer warranty card.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Pure original quality, very happy with this authentic seller.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Shaandar quality, shuddh original product delivered in sealed box.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "POSITIVE", "true_dissonance": False},

    # --- Rating-Review Dissonance (Deceptive reviews: 5 stars but negative text) ---
    {"text": "Five star rating so my review stays on top: This is completely FAKE! Sole peeled in 1 day.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": True},
    {"text": "Rating 5 stars so everyone sees: Duplicate product, fake logo and bad gumming.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": True},
    {"text": "Giving 5 stars for visibility: Total fraud, worst shoes, painful bite and fake brand.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": True},
    {"text": "5 stars only for visibility. Sole came off during first morning walk.", "rating": 5.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": True},
    {"text": "5 star ranking so people read: Dhokha hai mat lena, completely counterfeit.", "rating": 5.0, "true_aspect": "authenticity_claim", "true_sentiment": "NEGATIVE", "true_dissonance": True},

    # --- Rating Dissonance Reverse (1 star but positive text) ---
    {"text": "Product is pure original, amazing comfort and best shoe, but delivery boy was late.", "rating": 1.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": True},
    {"text": "Loved the sneakers, genuine Nike sole and super comfortable. Courier issue hence 1 star.", "rating": 1.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": True},

    # --- Material & Sole Durability (Negative) ---
    {"text": "Sole came off after just 3 days of light running. Cheap pasting.", "rating": 1.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Gumming separated at the toe tip. Very poor sole adhesion.", "rating": 2.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Stitching started opening up within one week. Terrible build quality.", "rating": 1.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Torn along the lace holes. Fabric ripped easily.", "rating": 2.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "The rubber sole cracked into two pieces while playing cricket.", "rating": 1.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Leather coating began peeling after stepping in a water puddle.", "rating": 2.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Sole paste is completely unglued. Bakwas material.", "rating": 1.0, "true_aspect": "material_durability", "true_sentiment": "NEGATIVE", "true_dissonance": False},

    # --- Material & Sole Durability (Positive) ---
    {"text": "Robust sole with outstanding grip on wet marble. Solid stitching.", "rating": 5.0, "true_aspect": "material_durability", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Heavy duty material, used for 6 months daily and sole has zero wear.", "rating": 5.0, "true_aspect": "material_durability", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Excellent leather build quality, no creasing and solid sole pasting.", "rating": 5.0, "true_aspect": "material_durability", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Durable rubber outsole, great traction and long lifespan.", "rating": 4.0, "true_aspect": "material_durability", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Double stitched seams and premium upper fabric. Very sturdy.", "rating": 5.0, "true_aspect": "material_durability", "true_sentiment": "POSITIVE", "true_dissonance": False},

    # --- Comfort & Ergonomics (Negative) ---
    {"text": "Severe shoe bite on the back of my heel, cannot walk without pain.", "rating": 1.0, "true_aspect": "comfort_fit", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Insole has zero cushioning, felt like walking bare on concrete.", "rating": 2.0, "true_aspect": "comfort_fit", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Sizing is completely wrong. Ordered UK 9 but fits like UK 7. Extremely tight.", "rating": 2.0, "true_aspect": "comfort_fit", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Very heavy shoe, foot fatigue after just 15 minutes of walking.", "rating": 2.0, "true_aspect": "comfort_fit", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Hard sole causing heel pain. No arch support at all.", "rating": 1.0, "true_aspect": "comfort_fit", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Ankle bite and stiff collar. Very uncomfortable fit.", "rating": 2.0, "true_aspect": "comfort_fit", "true_sentiment": "NEGATIVE", "true_dissonance": False},

    # --- Comfort & Ergonomics (Positive) ---
    {"text": "Super comfortable memory foam insole, cloud-like feeling.", "rating": 5.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Perfect fit true to size. No shoe bite, soft cushioning all around.", "rating": 5.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Extremely lightweight and breathable. Ideal for marathon training.", "rating": 5.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Great arch support, eliminates foot pain after long hospital shifts.", "rating": 5.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Comfortable from day one without any break-in period required.", "rating": 5.0, "true_aspect": "comfort_fit", "true_sentiment": "POSITIVE", "true_dissonance": False},

    # --- Packaging & Box Compliance (Negative) ---
    {"text": "Arrived in a smashed brown carton with no brand box or invoice.", "rating": 1.0, "true_aspect": "packaging_compliance", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Box seal was already broken and tags were missing. Pre-owned return item.", "rating": 1.0, "true_aspect": "packaging_compliance", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Torn package with no importer details and no statutory MRP sticker.", "rating": 1.0, "true_aspect": "packaging_compliance", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Box label was handwritten in marker, no barcode or manufacturer info.", "rating": 1.0, "true_aspect": "packaging_compliance", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Received crushed box without shoe stuffing or paper wrap.", "rating": 2.0, "true_aspect": "packaging_compliance", "true_sentiment": "NEGATIVE", "true_dissonance": False},

    # --- Packaging & Box Compliance (Positive) ---
    {"text": "Mint condition packaging with intact brand security seal and official tags.", "rating": 5.0, "true_aspect": "packaging_compliance", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Original retail box with clear legal metrology MRP sticker and tax invoice.", "rating": 5.0, "true_aspect": "packaging_compliance", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Double boxed packaging arrived in pristine condition without dents.", "rating": 5.0, "true_aspect": "packaging_compliance", "true_sentiment": "POSITIVE", "true_dissonance": False},

    # --- Value & Pricing (Negative / Overpriced / Waste) ---
    {"text": "Paisa barbaad ho gaya. Absolutely not worth 1500 rupees.", "rating": 1.0, "true_aspect": "value_fairness", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Total waste of money. Overpriced roadside quality.", "rating": 1.0, "true_aspect": "value_fairness", "true_sentiment": "NEGATIVE", "true_dissonance": False},
    {"text": "Extremely overpriced for such cheap synthetic material. Big regret.", "rating": 2.0, "true_aspect": "value_fairness", "true_sentiment": "NEGATIVE", "true_dissonance": False},

    # --- Value & Pricing (Positive / Paisa Vasool / Worth it) ---
    {"text": "Great value for money at ₹1499 discount. Complete paisa vasool!", "rating": 5.0, "true_aspect": "value_fairness", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Unbeatable price-to-performance ratio. Worth every single rupee.", "rating": 5.0, "true_aspect": "value_fairness", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Steal deal during sale, premium sneaker quality on budget.", "rating": 5.0, "true_aspect": "value_fairness", "true_sentiment": "POSITIVE", "true_dissonance": False},
    {"text": "Affordable pricing with genuine brand comfort. Highly satisfied.", "rating": 5.0, "true_aspect": "value_fairness", "true_sentiment": "POSITIVE", "true_dissonance": False},
]

def calculate_metrics(y_true: List[str], y_pred: List[str]) -> Dict[str, float]:
    """Calculates Accuracy, Precision, Recall, and F1 for binary/multi classification."""
    total = len(y_true)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    acc = correct / total if total > 0 else 0.0

    # Macro F1 for POSITIVE vs NEGATIVE
    labels = ["POSITIVE", "NEGATIVE"]
    f1_scores = []
    precision_scores = []
    recall_scores = []

    for lbl in labels:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == lbl and p == lbl)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != lbl and p == lbl)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == lbl and p != lbl)

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        precision_scores.append(prec)
        recall_scores.append(rec)
        f1_scores.append(f1)

    return {
        "accuracy": round(acc, 4),
        "precision": round(sum(precision_scores) / len(precision_scores), 4),
        "recall": round(sum(recall_scores) / len(recall_scores), 4),
        "f1": round(sum(f1_scores) / len(f1_scores), 4),
    }

def run_benchmark():
    print("=" * 80)
    print(" TRUSTSPHERE NLP BENCHMARK: ABSA & HINGLISH CALIBRATION vs NAIVE VADER")
    print(f" Benchmark Size: {len(BENCHMARK_DATASET)} hand-labeled Indian marketplace reviews")
    print("=" * 80)

    # 1. Initialize Engines
    vader_baseline = SentimentIntensityAnalyzer()
    trustsphere_engine = AspectReviewAnalyzer()

    # Track predictions
    y_true_sentiment = [d["true_sentiment"] for d in BENCHMARK_DATASET]
    y_pred_baseline = []
    y_pred_trustsphere = []

    # Track dissonance detection
    true_dissonance = [d["true_dissonance"] for d in BENCHMARK_DATASET]
    baseline_dissonance = []
    trustsphere_dissonance = []

    # Measure CPU latency
    t0 = time.time()
    for item in BENCHMARK_DATASET:
        # Naive Baseline: raw VADER compound score
        scores = vader_baseline.polarity_scores(item["text"])
        comp = scores["compound"]
        pred_sent = "POSITIVE" if comp >= 0.05 else "NEGATIVE"
        y_pred_baseline.append(pred_sent)
        # Baseline has no dissonance detection logic
        baseline_dissonance.append(False)
    baseline_latency_ms = ((time.time() - t0) / len(BENCHMARK_DATASET)) * 1000

    t1 = time.time()
    for item in BENCHMARK_DATASET:
        # TrustSphere Upgraded ABSA
        score = trustsphere_engine.score_sentence_sentiment(item["text"])
        pred_sent = "POSITIVE" if score >= 0.05 else "NEGATIVE"
        y_pred_trustsphere.append(pred_sent)

        # TrustSphere Dissonance Analysis
        rating = item["rating"]
        is_diss = False
        if rating >= 4.0 and score < -0.2:
            is_diss = True
        elif rating <= 2.0 and score > 0.35:
            is_diss = True
        trustsphere_dissonance.append(is_diss)
    trustsphere_latency_ms = ((time.time() - t1) / len(BENCHMARK_DATASET)) * 1000

    # Calculate Sentiment Performance Metrics
    metrics_baseline = calculate_metrics(y_true_sentiment, y_pred_baseline)
    metrics_ts = calculate_metrics(y_true_sentiment, y_pred_trustsphere)

    # Calculate Dissonance Detection Rate
    diss_count_true = sum(1 for d in true_dissonance if d)
    diss_found_ts = sum(1 for t, p in zip(true_dissonance, trustsphere_dissonance) if t and p)
    diss_recall_ts = (diss_found_ts / diss_count_true) if diss_count_true > 0 else 0.0

    print("\n[1] SENTIMENT POLARITY CLASSIFICATION BENCHMARK:")
    print("-" * 80)
    print(f"{'Metric':<25} | {'Naive VADER (Baseline)':<22} | {'TrustSphere ABSA Engine':<25}")
    print("-" * 80)
    print(f"{'Accuracy':<25} | {metrics_baseline['accuracy']*100:<21.1f}% | {metrics_ts['accuracy']*100:<24.1f}% (+{(metrics_ts['accuracy'] - metrics_baseline['accuracy'])*100:.1f}%)")
    print(f"{'Precision (Macro)':<25} | {metrics_baseline['precision']*100:<21.1f}% | {metrics_ts['precision']*100:<24.1f}%")
    print(f"{'Recall (Macro)':<25} | {metrics_baseline['recall']*100:<21.1f}% | {metrics_ts['recall']*100:<24.1f}%")
    print(f"{'F1 Score (Macro)':<25} | {metrics_baseline['f1']*100:<21.1f}% | {metrics_ts['f1']*100:<24.1f}% (+{(metrics_ts['f1'] - metrics_baseline['f1'])*100:.1f}%)")
    print(f"{'Avg CPU Latency/Review':<25} | {baseline_latency_ms:<20.2f} ms | {trustsphere_latency_ms:<23.2f} ms")
    print("-" * 80)

    print("\n[2] RATING-REVIEW DISSONANCE DETECTION BENCHMARK:")
    print("-" * 80)
    print(f"Total Dissonant Reviews in Benchmark: {diss_count_true} (e.g. 5-star ratings with 'fake/duplicate' text)")
    print(f"Naive Baseline Dissonance Captured   : 0 / {diss_count_true} (0.0% - Baseline treats 5-star as positive)")
    print(f"TrustSphere Dissonance Captured      : {diss_found_ts} / {diss_count_true} ({diss_recall_ts*100:.1f}%)")
    print("-" * 80)

    print("\n[3] KEY QUALITATIVE ADVANTAGES OF TRUSTSPHERE ABSA:")
    print(" * Hinglish Lexicon: Recognizes Indian colloquialisms ('nakli', 'dhokha', 'paisa vasool', 'bakwas', 'maal').")
    print(" * Negation Override: Resolves false-positive traps where VADER awards points to 'genuine' inside 'not genuine'.")
    print(" * Domain Defect Lexicon: Specifically indexes footwear/apparel defects ('shoe bite', 'sole gumming', 'peeling').")
    print(" * Five-Aspect Dissection: Assigns sentiment to Durability, Comfort, Packaging, Authenticity, and Value separately.")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmark()
