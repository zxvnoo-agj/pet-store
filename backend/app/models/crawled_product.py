from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class CrawledProduct(Base):
    __tablename__ = "crawled_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    goods_id = Column(String(64), nullable=False, unique=True, index=True)
    title = Column(String(512), nullable=True)
    raw_content = Column(Text, nullable=False)
    raw_text = Column(Text, nullable=True)
    raw_html = Column(Text, nullable=True)
    images = Column(JSONB, default=list, server_default="[]")
    crawl_timestamp = Column(DateTime(timezone=True), nullable=True)
    file_source = Column(String(512), nullable=True)
    import_status = Column(String(16), default="active", server_default="active", index=True)
    import_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
