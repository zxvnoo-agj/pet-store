from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class SearchStrategy(Base):
    __tablename__ = "search_strategies"

    id = Column(Integer, primary_key=True, index=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    keywords = Column(JSONB, default=list)
    opt_id = Column(Integer, nullable=True)
    price_min = Column(Integer, nullable=True)
    price_max = Column(Integer, nullable=True)
    sort_type = Column(Integer, default=0)
    max_items = Column(Integer, default=100)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_result = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    data_source = relationship("DataSource", backref="search_strategies")


class ExternalProduct(Base):
    __tablename__ = "external_products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    platform = Column(String(32), nullable=False, default="pdd")
    external_id = Column(String(64), nullable=False)
    external_url = Column(String(2048), nullable=True)
    pid = Column(String(64), nullable=True)
    is_primary = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", backref="external_products")
    data_source = relationship("DataSource", backref="external_products")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    group_price = Column(Numeric(10, 2), nullable=True)
    single_price = Column(Numeric(10, 2), nullable=True)
    coupon_discount = Column(Numeric(10, 2), nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", backref="price_history")
    data_source = relationship("DataSource", backref="price_history")


class PromotionUrlCache(Base):
    __tablename__ = "promotion_url_cache"

    id = Column(Integer, primary_key=True, index=True)
    goods_sign = Column(String(64), nullable=False)
    pid = Column(String(64), nullable=False)
    short_url = Column(String(256), nullable=False)
    mobile_url = Column(String(512), nullable=True)
    we_app_url = Column(String(512), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("goods_sign", "pid", name="uq_promotion_cache_goods_pid"),
    )
