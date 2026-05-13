export interface Product {
  id: number;
  name: string;
  brand: string;
  categoryId: number;
  petType: string;
  price_min: number;
  price_max: number;
  image_urls: string[];
  ratings: {
    overall: number;
    costPerformance: number;
    quality: number;
    taste: number;
    packaging: number;
  };
  pros: string[];
  cons: string[];
  description: string;
  ingredients: string[];
  reviewCount: number;
  favoriteCount: number;
}

export interface Review {
  id: number;
  productId: number;
  user: {
    nickname: string;
    avatar: string;
  };
  rating: number;
  content: string;
  tags: string[];
  isRecommended: boolean;
  helpfulCount: number;
  createdAt: string;
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
  petType: string;
}
