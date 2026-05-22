export interface Spu {
  id: number;
  name: string;
  brand: string;
  model: string;
  category_id: number;
  pet_type: string;
  price_min: number;
  price_max: number;
  image_urls: string[];
  rating: number;
  review_count: number;
  pros: string[];
  cons: string[];
  description: string;
  ingredients: string[];
  nutrition: Record<string, string>;
  extra_attrs: Record<string, string>;
  currency: string;
  status: string;
  is_favorited?: boolean;
  listing_count?: number;
}

export interface SpuListing {
  id: number;
  platform: string;
  shop_name: string;
  title: string;
  price: number;
  original_price: number | null;
  url: string;
  image_url: string | null;
  sales_count: number | null;
  promotion_url: string | null;
  goods_sign: string | null;
  sku_specs: Array<{ spec: string; price: number | null; stock: number }>;
  service_tags: string[];
}

export interface Review {
  id: number;
  spu_id: number;
  user: {
    nickname: string;
    avatar: string;
  };
  rating: number;
  content: string;
  tags: string[];
  is_recommended: boolean;
  helpful_count: number;
  created_at: string;
}

export interface PetType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  pet_type: string;
}

// Backward-compatible alias for gradual migration
export type Product = Spu;
