# Dataset v1.5 Image Integrity & Verification Report

Total Indexed Image Records: **5,554**.

## Integrity Status Breakdown
- Usable Physical Images (`is_usable == True`): **5,228**
- Documented Scrape Download Failures (`is_usable == False`): **326**
- Physical Existence on Disk: **5,228 / 5,228 (100.0%)**
- PIL Image Decode Verification: **5,228 / 5,228 (100.0%)**

## Usable Image Distribution
| Marketplace | Usable Images | Unique Products with Images |
| :--- | :--- | :--- |
| Flipkart | 3,208 | 932 |
| Amazon India | 1,500 | 1,500 |
| Amazon US | 520 | 520 |
| Myntra | 0 | 0 |
| BestBuy | 0 | 0 |
| Walmart | 0 | 0 |
| **Total** | **5,228** | **2,952** |

## Resolution of the 396-Image Difference
The claimed 4,832 image count in earlier narrative reports resulted from erroneously assuming 1 image per product for Myntra (1,000), BestBuy (249), Walmart (1,131), and Amazon US (1,020), and 0 for Flipkart ($1,432 + 1,000 + 1,020 + 249 + 1,131 = 4,832$).
In reality, Flipkart has 3,208 usable images, Amazon India has 1,500, and Amazon US has 520, totaling 5,228 usable physical images ($5,228 - 4,832 = 396$).
