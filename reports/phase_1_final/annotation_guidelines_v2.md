# Human Annotation Guidelines v2.0 — Marketplace Review Authenticity & Aspect Polarity

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Document:** `annotation_guidelines_v2.md`  
**Governing Standard:** Double-Blind Human Annotation Protocol v2.0  
**Effective Date:** November 10, 2026  
**Status:** **MANDATORY PRODUCTION SPECIFICATION**  

---

## 1. Core Principles: The Separation of Sentiment, Rating, and Authenticity

The primary scientific failure identified in the v1.4 annotation batch was the systematic conflation of **customer dissatisfaction** (1-star rating, negative sentiment) with **review deception** (fraud, manipulation). 

In v2.0, all annotators and lead adjudicators must adhere strictly to the following foundational separations:

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     CUSTOMER RATING     │   ≠   │   SENTIMENT POLARITY    │   ≠   │   AUTHENTICITY STATUS   │
│  (1 to 5 Stars Scale)   │       │  (Positive / Negative)  │       │  (Genuine / Deceptive)  │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

### The Cardinal Rules:
1. **Critical Feedback is NOT Deception:** A customer leaving a 1-star or 2-star review complaining about broken packaging, slow delivery, poor material quality, or sizing issues is exercising normal consumer rights. This is **`VERIFIED_GENUINE`**, provided there is evidence of actual product acquisition or organic customer voice.
2. **Glowing Praise is NOT Automatically Genuine:** A 5-star review repeating generic marketing bullet points, copied verbatim across multiple listings, or submitted in high-velocity bursts is a prime candidate for **`SUSPICIOUS`** or **`VERIFIED_DECEPTIVE`**, regardless of its positive sentiment.
3. **Rating Independence:** The customer star rating must be treated as contextual metadata only. An authenticity label must NEVER be chosen based on the star rating alone.

---

## 2. Review Authenticity Classification Ontology

Each review must be assigned exactly one authenticity classification:

### 2.1 `VERIFIED_GENUINE`
- **Definition:** The feedback reflects an organic consumer experience following bona fide product acquisition, delivery, and personal evaluation.
- **Positive Indicators:**
  - Mentions specific, nuanced details of daily usage (e.g., battery life duration, fit on specific body dimensions, packaging state upon unboxing).
  - Contains balanced observations (e.g., "Good display but average battery").
  - Organic linguistic syntax, including natural grammatical idiosyncrasies, vernacular Indian English phrasing, or colloquial expressions.
  - Emotionally consistent dissatisfaction with verified purchase (e.g., "Received wrong shade, requested replacement").
- **Exclusion:** Do NOT classify as suspicious merely because the review is harsh, angry, ungrammatical, or negative.

### 2.2 `SUSPICIOUS`
- **Definition:** The review displays substantial behavioral or textual anomalies indicative of coordinated manipulation, automated syndication, or non-buyer incentives, but lacks absolute forensic confirmation.
- **Positive Indicators:**
  - **Duplicate/Near-Duplicate Clusters:** Text identical or near-identical (Levenshtein ratio $\ge 0.85$) to reviews on different products or submitted by different accounts.
  - **Rating-Text Discordance:** Severe unexplainable contradictions where positive textual praise accompanies a 1-star rating without sarcastic tone (or vice-versa).
  - **Formulaic Bot Patterns:** Generic 1-to-3 word reviews repeated across catalog entities ("nice product", "good quality", "superb item").
  - **Promotional Keyword Stuffing:** Unnatural repetition of search keywords, URLs, external phone numbers, or affiliate links.
- **Requirement:** Annotator must document the exact behavioral anomaly in the `label_rationale` field.

### 2.3 `VERIFIED_DECEPTIVE`
- **Definition:** Forensic confirmation of deliberate review manipulation, fraudulent seller coordination, or syndicated review spam.
- **Positive Indicators:**
  - Verified membership in known review-farming networks or compensated review schemes.
  - Review text explicitly references seller compensation ("Seller asked to review for refund", "Free product received for 5-star review").
  - Identical long-form review text submitted across multiple unrelated categories within minutes.
- **Evidence Standard:** Requires verifiable forensic evidence beyond subjective textual tone.

### 2.4 `UNCERTAIN`
- **Definition:** Ambiguous feedback where available text (e.g., single emoji or indecipherable string) is insufficient to support a defensible conclusion.

---

## 3. Aspect-Based Sentiment Analysis (ABSA) Guidelines

For each review, the annotator must evaluate polarity independently across six standardized operational domains:

| Aspect Domain | Definition | Polarity Values |
| :--- | :--- | :---: |
| **Authenticity** | Direct claims regarding whether the physical item is genuine or counterfeit. | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| **Product Quality** | Build quality, durability, materials, scent, taste, or performance. | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| **Packaging** | Retail packaging condition, tamper-evident seals, protective wrapping. | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| **Delivery & Logistics** | Courier speed, transit delays, package damage during delivery. | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| **Customer Service** | Interactions with seller or marketplace support, return/refund handling. | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| **Value for Money** | Price-to-quality perception and affordability. | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |

**Crucial ABSA Rule:**  
If a customer complains that "The courier damaged the box but the phone works great", the annotator must code `Delivery: NEGATIVE`, `Packaging: NEGATIVE`, and `Product Quality: POSITIVE`.

---

## 4. Double-Blind Workflow Protocol

1. **Independent Evaluation:** Two annotators (`Annotator A` and `Annotator B`) evaluate the exact same review independently without access to each other's submissions or historical labels.
2. **Blinded Presentation:** The annotation interface hides any historical `authenticity_label` or `annotator_id`.
3. **Disagreement Trigger:** If `Annotator A != Annotator B`, the task is automatically flagged as `DISAGREEMENT_TRIGGERED` and routed to the `Lead Adjudicator Queue`.
4. **Adjudication Standard:** The Lead Adjudicator reviews both arguments, examines cross-catalog duplicate evidence, and assigns the `adjudicated_final_label` with detailed rationale.
5. **Quality Metric:** Inter-annotator agreement is monitored continuously using Cohen's Kappa:
   $$\kappa = \frac{p_o - p_e}{1 - p_e}$$
   Target operational threshold is $\kappa \ge 0.70$.
