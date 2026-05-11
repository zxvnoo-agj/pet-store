from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Boolean, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rating = Column(Numeric(2, 1), nullable=False)
    content = Column(Text, nullable=False)
    images = Column(JSONB, default=list)
    tags = Column(JSONB, default=list)
    is_recommended = Column(Boolean, nullable=True)
    source = Column(String(32), default="user")
    source_url = Column(String(256), nullable=True)
    helpful_count = Column(Integer, default=0)
    status = Column(String(16), default="pending", index=True)
    llm_review_result = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product", backref="reviews")
    user = relationship("User", backref="reviews")
