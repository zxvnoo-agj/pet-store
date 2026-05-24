from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String(64), unique=True, nullable=False, index=True)
    unionid = Column(String(64), nullable=True)
    nickname = Column(String(64), nullable=True)
    avatar_url = Column(String(256), nullable=True)
    pet_types = Column(JSONB, default=list)
    profile = Column(JSONB, default=dict)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pets = relationship("Pet", backref="user", lazy="dynamic", cascade="all, delete-orphan")
