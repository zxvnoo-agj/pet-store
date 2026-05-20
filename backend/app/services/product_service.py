
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.models.product import Product
from app.schemas.product import ProductDetailResponse, ProductFilter, ProductListResponse
from app.utils.cache import cache


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_products(self, filters: ProductFilter) -> tuple[list[ProductListResponse], int]:
        cache_key = f"products:list:{filters.model_dump_json()}"
        cached = await cache.get(cache_key)
        if cached:
            return [ProductListResponse(**item) for item in cached["items"]], cached["total"]

        query = select(Product).where(Product.status == "active")
        count_query = select(func.count(Product.id)).where(Product.status == "active")

        if filters.category_id:
            # Check if this is a parent category and include all child categories
            category_ids = [filters.category_id]
            child_result = await self.db.execute(
                select(Category.id).where(Category.parent_id == filters.category_id)
            )
            child_ids = [row[0] for row in child_result.all()]
            if child_ids:
                category_ids.extend(child_ids)

            query = query.where(Product.category_id.in_(category_ids))
            count_query = count_query.where(Product.category_id.in_(category_ids))

        if filters.pet_type:
            query = query.join(Category).where(Category.pet_type == filters.pet_type)
            count_query = count_query.join(Category).where(Category.pet_type == filters.pet_type)

        if filters.brand:
            query = query.where(Product.brand == filters.brand)
            count_query = count_query.where(Product.brand == filters.brand)

        if filters.min_price is not None:
            query = query.where(Product.price_min >= filters.min_price)
            count_query = count_query.where(Product.price_min >= filters.min_price)

        if filters.max_price is not None:
            query = query.where(Product.price_max <= filters.max_price)
            count_query = count_query.where(Product.price_max <= filters.max_price)

        # Sorting
        if filters.sort == "rating_desc":
            query = query.order_by(desc(Product.ratings["overall"]))
        elif filters.sort == "price_asc":
            query = query.order_by(asc(Product.price_min))
        elif filters.sort == "price_desc":
            query = query.order_by(desc(Product.price_min))
        elif filters.sort == "newest":
            query = query.order_by(desc(Product.created_at))
        else:
            query = query.order_by(desc(Product.created_at))

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        products = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        product_list = [ProductListResponse.model_validate(p) for p in products]
        await cache.set(
            cache_key,
            {"items": [item.model_dump() for item in product_list], "total": total},
            expire=300,
        )
        return product_list, total

    async def get_product_by_id(self, product_id: int) -> ProductDetailResponse | None:
        cache_key = f"products:detail:{product_id}"
        cached = await cache.get(cache_key)
        if cached:
            return ProductDetailResponse(**cached)

        result = await self.db.execute(
            select(Product)
            .where(Product.id == product_id, Product.status == "active")
            .options(selectinload(Product.category))
        )
        product = result.scalar_one_or_none()
        if product:
            product_dict = {
                "id": product.id,
                "category_id": product.category_id,
                "name": product.name,
                "brand": product.brand,
                "price_min": float(product.price_min) if product.price_min is not None else None,
                "price_max": float(product.price_max) if product.price_max is not None else None,
                "currency": product.currency,
                "image_urls": product.image_urls or [],
                "pros": product.pros or [],
                "cons": product.cons or [],
                "ratings": product.ratings or {},
                "description": product.description,
                "ingredients": product.ingredients or [],
                "specifications": product.specifications or {},
                "source_url": product.source_url,
                "source_platform": product.source_platform,
                "status": product.status,
                "category": {
                    "id": product.category.id,
                    "name": product.category.name,
                    "pet_type": product.category.pet_type,
                } if product.category else None,
            }
            await cache.set(cache_key, product_dict, expire=600)
            return ProductDetailResponse(**product_dict)
        return None

    async def compare_products(self, product_ids: list[int]) -> list[Product]:
        result = await self.db.execute(
            select(Product).where(
                Product.id.in_(product_ids),
                Product.status == "active"
            )
        )
        return list(result.scalars().all())
