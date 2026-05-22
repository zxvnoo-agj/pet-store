from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, func, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class SpuListing(Base):
    __tablename__ = "spu_listings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    spu_id = Column(Integer, ForeignKey("spus.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(32), nullable=False, index=True)
    shop_name = Column(String(128), nullable=False)
    goods_id = Column(String(64), nullable=True, index=True)
    title = Column(String(512), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    original_price = Column(Numeric(10, 2), nullable=True)
    url = Column(String(2048), nullable=False)
    image_url = Column(String(2048), nullable=True)
    sales_count = Column(Integer, nullable=True)
    goods_sign = Column(String(128), nullable=True)
    sku_specs = Column(JSONB, nullable=True)
    service_tags = Column(JSONB, nullable=True)
    match_confidence = Column(Numeric(5, 4), nullable=True)
    match_status = Column(String(16), default="linked", index=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("platform", "goods_id", name="uq_spu_listings_platform_goods_id"),
        CheckConstraint("price >= 0", name="ck_spu_listings_price"),
        CheckConstraint("match_confidence >= 0 AND match_confidence <= 1", name="ck_spu_listings_confidence"),
    )

    spu = relationship("Spu", back_populates="listings")
