import {
  catalogRepository,
  ProductRow,
  ListingRow,
  BrandRow,
  PlatformRow,
  SellerRow
} from './catalog.repository';
import { ProductQueryParams, ListingQueryParams, BrandQueryParams } from './catalog.schemas';
import { NotFoundError } from '../../middleware/errorHandler';

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class CatalogService {
  async getProducts(params: ProductQueryParams): Promise<PaginatedResult<ProductRow>> {
    const { items, total } = await catalogRepository.findProducts(params);
    const totalPages = Math.ceil(total / params.limit) || 1;

    return {
      items,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages
      }
    };
  }

  async getProductById(id: string): Promise<ProductRow> {
    const product = await catalogRepository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product not found with ID "${id}"`, 'PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async getListings(params: ListingQueryParams): Promise<PaginatedResult<ListingRow>> {
    const { items, total } = await catalogRepository.findListings(params);
    const totalPages = Math.ceil(total / params.limit) || 1;

    return {
      items,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages
      }
    };
  }

  async getListingById(id: string): Promise<ListingRow> {
    const listing = await catalogRepository.findListingById(id);
    if (!listing) {
      throw new NotFoundError(`Marketplace listing not found with ID "${id}"`, 'LISTING_NOT_FOUND');
    }
    return listing;
  }

  async getBrands(params: BrandQueryParams): Promise<PaginatedResult<BrandRow>> {
    const { items, total } = await catalogRepository.findBrands(params);
    const totalPages = Math.ceil(total / params.limit) || 1;

    return {
      items,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages
      }
    };
  }

  async getPlatforms(): Promise<PlatformRow[]> {
    return catalogRepository.findAllPlatforms();
  }

  async getSellerById(id: string): Promise<SellerRow> {
    const seller = await catalogRepository.findSellerById(id);
    if (!seller) {
      throw new NotFoundError(`Seller not found with ID "${id}"`, 'SELLER_NOT_FOUND');
    }
    return seller;
  }
}

export const catalogService = new CatalogService();
