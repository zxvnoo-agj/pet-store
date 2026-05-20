from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Spu(Base):
    __tablename__ = "spus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    brand = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    model = Column(String(128), nullable=False)
    pet_type = Column(String(16), nullable=False, default="cat", index=True)
    description = Column(Text, nullable=True)
    ingredients = Column(JSONB, default=list)
    nutrition = Column(JSONB, default=dict)
    pros = Column(JSONB, default=list)
    cons = Column(JSONB, default=list)
    extra_attrs = Column(JSONB, default=dict)
    price_min = Column(Numeric(10, 2), nullable=True)
    price_max = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(8), default="CNY")
    image_urls = Column(JSONB, default=list)
    status = Column(String(16), default="active", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("brand", "category_id", "name", "model", name="uq_spus_brand_category_name_model"),
        CheckConstraint("pet_type IN ('cat', 'dog')", name="ck_spus_pet_type"),
    )

    category = relationship("Category", backref="spus")
    listings = relationship("SpuListing", back_populates="spu", cascade="all, delete-orphan")
