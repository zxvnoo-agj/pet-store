from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint, func

from app.core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    spu_id = Column(Integer, ForeignKey("spus.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "spu_id", name="uq_user_spu_favorite"),
    )
