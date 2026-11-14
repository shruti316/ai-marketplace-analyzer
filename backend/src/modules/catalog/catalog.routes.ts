import { Router } from 'express';
import { catalogController } from './catalog.controller';
import { validateRequest } from '../../middleware/validator';
import {
  productQuerySchema,
  listingQuerySchema,
  brandQuerySchema,
  entityIdParamSchema
} from './catalog.schemas';

const router = Router();

// Products
// GET /api/v1/products
router.get(
  '/products',
  validateRequest({ query: productQuerySchema }),
  (req, res, next) => {
    catalogController.getProducts(req, res, next);
  }
);

// GET /api/v1/products/:id
router.get(
  '/products/:id',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    catalogController.getProductById(req, res, next);
  }
);

// Listings
// GET /api/v1/listings
router.get(
  '/listings',
  validateRequest({ query: listingQuerySchema }),
  (req, res, next) => {
    catalogController.getListings(req, res, next);
  }
);

// GET /api/v1/listings/:id
router.get(
  '/listings/:id',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    catalogController.getListingById(req, res, next);
  }
);

// Brands
// GET /api/v1/brands
router.get(
  '/brands',
  validateRequest({ query: brandQuerySchema }),
  (req, res, next) => {
    catalogController.getBrands(req, res, next);
  }
);

// Platforms
// GET /api/v1/platforms
router.get('/platforms', (req, res, next) => {
  catalogController.getPlatforms(req, res, next);
});

// Sellers
// GET /api/v1/sellers/:id
router.get(
  '/sellers/:id',
  validateRequest({ params: entityIdParamSchema }),
  (req, res, next) => {
    catalogController.getSellerById(req, res, next);
  }
);

export const catalogRoutes = router;
