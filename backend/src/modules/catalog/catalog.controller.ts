import { Request, Response, NextFunction } from 'express';
import { catalogService } from './catalog.service';
import { ProductQueryParams, ListingQueryParams, BrandQueryParams } from './catalog.schemas';

export class CatalogController {
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = (req.parsedQuery || req.query) as unknown as ProductQueryParams;
      const result = await catalogService.getProducts(params);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const product = await catalogService.getProductById(id);
      res.json({
        status: 'success',
        data: { product }
      });
    } catch (err) {
      next(err);
    }
  }

  async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = (req.parsedQuery || req.query) as unknown as ListingQueryParams;
      const result = await catalogService.getListings(params);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const listing = await catalogService.getListingById(id);
      res.json({
        status: 'success',
        data: { listing }
      });
    } catch (err) {
      next(err);
    }
  }

  async getBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = (req.parsedQuery || req.query) as unknown as BrandQueryParams;
      const result = await catalogService.getBrands(params);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getPlatforms(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = await catalogService.getPlatforms();
      res.json({
        status: 'success',
        data: { items: platforms }
      });
    } catch (err) {
      next(err);
    }
  }

  async getSellerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const seller = await catalogService.getSellerById(id);
      res.json({
        status: 'success',
        data: { seller }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const catalogController = new CatalogController();
