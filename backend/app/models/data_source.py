from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False)
    platform = Column(String(32), nullable=False)  # jd, taobao, tmall
    config = Column(JSONB, default=dict)  # API keys, endpoints
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_interval_minutes = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DataFetchJob(Base):
    __tablename__ = "data_fetch_jobs"

    id = Column(Integer, primary_key=True, index=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    job_type = Column(String(32), nullable=False)  # price, review, discovery
    collection_type = Column(String(16), default="full")  # full, incremental
    status = Column(String(16), default="pending")  # pending, running, completed, failed
    params = Column(JSONB, default=dict)  # spu_id, keywords, etc.
    result = Column(JSONB, nullable=True)  # fetched data summary
    error_message = Column(Text, nullable=True)
    spu_id = Column(Integer, ForeignKey("spus.id"), nullable=True)
    cursor_value = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
