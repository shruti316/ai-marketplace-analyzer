# Flipkart 127 Review Products — Image Acquisition & Integrity Audit
## Marketplace Trust Intelligence Platform — v1.7

**Audit Date:** 2026-11-04  
**Audit Verdict:** TIER C PRESERVED (Zero Data Fabrication Compliant)  
**Target Entities:** 127 Products from `flipkart` marketplace  

---

### 1. Executive Summary

The v1.6 certification and previous audit cycles identified a critical modality gap: **127 Flipkart products** possess valid prices and linked customer reviews, but **zero physical images exist on disk**.

If images were legitimately available, these 127 products would graduate from **Tier C (Textual/Price)** to **Tier A (Complete Multimodal)**, increasing Tier A Indian product representation from 5 to 132 products.

---

### 2. Forensic Investigation & Technical Root Cause

1. **Origin of the 127 Products:**
   - Ingested from `data/raw/flipkart/flipkart_reviews_raw.csv` during the Phase 3 Flipkart review linkage phase.
   - Products belong to electronics, appliances, and home utilities (e.g. Airtel DTH remotes, Adonai rice cookers, safety gloves).
2. **Origin of the Existing 3,208 Flipkart Images:**
   - Scraped from `data/raw/flipkart/flipkart_products_raw.csv` (1,000 lifestyle and apparel products).
   - In that scrape, 932 products have 3,208 downloaded images, but **zero reviews**.
3. **Cross-Catalog Overlap:**
   - Textual and brand cross-matching between `flipkart_reviews_raw.csv` and `flipkart_products_raw.csv` yielded **zero matches**. The two raw data sources represent completely disjoint product domains (Appliances/Electronics vs Fashion/Lifestyle).
4. **Acquisition Adapter Readiness:**
   - An offline acquisition adapter (`src/data/acquisition/flipkart_image_adapter_v1_6.py`) has been fully engineered.
   - It contains target URLs, image download logic, validation schemas, and fallback scrapers.
5. **Non-Negotiable Execution Policy:**
   - In strict adherence to **Rule 1 (Zero Data Fabrication)** and **Rule 4 (Sandboxed Execution without Unauthorized Network Egress)**, synthetic images, generic placeholder images, or scraping without explicit user permission were strictly disallowed.
   - Therefore, all 127 products are faithfully preserved in **Tier C (TIER_C_TEXTUAL)**.

---

### 3. Inventory of the 127 Tier C Products (Sample of First 20 Targets)

| Canonical Product ID | Product Title | Category | Price Status | Modality Status |
|---|---|---|---|---|
| `flipkart_rec_2B94E83403CF` | 7SEVEN Airtel DTH Remote Airtel Xstream Remote Compatible wi... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_50E2243CA366` | Adonai POT1.5LPINK Rice Cooker, Food Steamer, Travel Cooker,... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_8851D804CEEB` | AdroitZ SUPERIOR QUALITY ANTI CUT SAFETY HAND GLOVE-13 Nylon... | Industrial & Scientific | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_599C08CD792D` | Airtel Airtel Universal Setup box Remote Digital Setup box U... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_2C5BAA5E90ED` | Airtel Dth Settop Box Airtel TV, Airtel set up box, Airtel H... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_82628F2899F1` | Airtel Regular Digital TV DTH Remote Compatible with SD and ... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_643D9A198E72` | Airtel Regular Digital TV SD/HD DTH Compatible Remote UNIVER... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_D940C19765F9` | Aroma NB119 Titanium - 48 Hours Playtime Bluetooth Neckband ... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_B405BCD202A7` | ArrowMax Professional Anti-slip Fitness (Black , pack of 2 )... | Sports & Outdoors | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_8AB7F89520AE` | Atomberg Renesa 1200 mm BLDC Motor with Remote 3 Blade Ceili... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_9BAC8551B3C8` | BAJAJ 410053 600 W Food Processor (Multicolor)... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_7189C4915BA3` | BAJAJ Crest Neo 1200 mm 3 Blade Ceiling Fan (Brown, Pack of ... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_428FDE3B2E0C` | BAJAJ Crest Neo 1200 mm 3 Blade Ceiling Fan (White, Pack of ... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_73E419F65646` | BAJAJ FX 11 Food Factory 600 W Food Processor (White)... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_95F7D9BDA7F7` | BAJAJ Fx11 Food Factory 600 W Food Processor (White)... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_701052A268AB` | BLUECHIP 100% Copper BL72SmartTV3.2Amp TV Voltage Stabilizer... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_2D97CC89F31A` | BLUECHIP BL43SmartTV TV Voltage Stabilizer for LED TV/Smart ... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_08AC751AB670` | BLUECHIP BL55SmartTV2.1Amp TV Voltage Stabilizer for LED TV/... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_D62BC7CF82D5` | BLUECHIP BL60SmartTV3.1Amp TV Voltage Stabilizer for LED TV/... | Electronics | INR VALID | Text + Price Linked, Zero Disk Image |
| `flipkart_rec_AD0AECE9F633` | BOSCH SMS66GW01I Free Standing 13 Place Settings Intensive K... | Home & Kitchen | INR VALID | Text + Price Linked, Zero Disk Image |

*(Complete inventory of all 127 product IDs recorded in `data/processed_v1_7/canonical_product_registry_v1_7.parquet`)*

---

### 4. Resolution & Engineering Status

- **Status:** `READY_FOR_EXTERNAL_DATA`
- **Missing Resource:** 127 high-resolution product images for Flipkart appliance/electronics products.
- **Remediation Plan:** When the user explicitly authorizes network image downloading or supplies local image files, `flipkart_image_adapter_v1_6.py` can be triggered to populate `data/raw/flipkart/images/` and elevate these entities to Tier A.
