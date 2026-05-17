from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    goods_name = Column(String(255), nullable=True, index=True)
    brand = Column(String(64), nullable=True, index=True)
    spec_form = Column(String(16), nullable=True, index=True)
    age_range = Column(String(32), nullable=True, index=True)
    mall_name = Column(String(128), nullable=True, index=True)
    pet_type = Column(String(16), nullable=False, default="cat", index=True)
    promotion_rate = Column(Integer, default=0)
    price_min = Column(Numeric(10, 2), nullable=True)
    price_max = Column(Numeric(10, 2), nullable=True)
    min_group_price = Column(Integer, default=0)
    min_normal_price = Column(Integer, default=0)
    currency = Column(String(8), default="CNY")
    image_urls = Column(JSONB, default=list)
    gallery_urls = Column(JSONB, default=list)
    detail_img_urls = Column(JSONB, default=list)
    service_tags = Column(JSONB, default=list)
    pros = Column(JSONB, default=list)
    cons = Column(JSONB, default=list)
    ratings = Column(JSONB, default=dict)
    description = Column(Text, nullable=True)
    ingredients = Column(JSONB, default=list)
    nutrition = Column(JSONB, default=dict)
    specifications = Column(JSONB, default=dict)
    source_url = Column(String(2048), nullable=True)
    source_platform = Column(String(32), nullable=True)
    status = Column(String(16), default="pending", index=True)
    search_vector = Column(TSVECTOR, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", backref="products")
