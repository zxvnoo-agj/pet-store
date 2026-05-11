from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    brand = Column(String(64), nullable=True, index=True)
    price_min = Column(Numeric(10, 2), nullable=True)
    price_max = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(8), default="CNY")
    image_urls = Column(JSONB, default=list)
    pros = Column(JSONB, default=list)
    cons = Column(JSONB, default=list)
    ratings = Column(JSONB, default=dict)
    description = Column(Text, nullable=True)
    ingredients = Column(JSONB, default=list)
    specifications = Column(JSONB, default=dict)
    source_url = Column(String(256), nullable=True)
    source_platform = Column(String(32), nullable=True)
    status = Column(String(16), default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", backref="products")
