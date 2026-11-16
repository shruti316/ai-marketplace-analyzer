import { apiClient } from './apiClient';
import { Product, Platform, Brand, Listing, Seller, PaginatedData, ApiResponse } from '../types/catalog';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  brand_id?: string;
  category?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const catalogService = {
  async getProducts(params?: ProductQueryParams): Promise<PaginatedData<Product>> {
    const response = await apiClient.get<ApiResponse<PaginatedData<Product>>>('/api/v1/products', {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        search: params?.search,
        brand_id: params?.brand_id,
        category: params?.category,
        sort_by: params?.sort_by,
        sort_order: params?.sort_order,
      },
    });
    return response.data.data;
  },

  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(`/api/v1/products/${id}`);
    return response.data.data.product;
  },

  async getPlatforms(): Promise<Platform[]> {
    const response = await apiClient.get<ApiResponse<{ items: Platform[] }>>('/api/v1/platforms');
    return response.data.data.items;
  },

  async getBrands(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedData<Brand>> {
    const response = await apiClient.get<ApiResponse<PaginatedData<Brand>>>('/api/v1/brands', {
      params,
    });
    return response.data.data;
  },

  async getListings(params?: { page?: number; limit?: number; canonical_product_id?: string; platform_id?: string }): Promise<PaginatedData<Listing>> {
    const response = await apiClient.get<ApiResponse<PaginatedData<Listing>>>('/api/v1/listings', {
      params,
    });
    return response.data.data;
  },

  async getSellerById(id: string): Promise<Seller> {
    const response = await apiClient.get<ApiResponse<{ seller: Seller }>>(`/api/v1/sellers/${id}`);
    return response.data.data.seller;
  },
};
