from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint, func

from app.core.database import Base


class PetBreed(Base):
    __tablename__ = "pet_breeds"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    species = Column(String(16), nullable=False)
    name = Column(String(64), nullable=False)
    description = Column(String(256), nullable=True)
    is_active = Column(Boolean, default=True, server_default=func.text("true"))
    sort_order = Column(Integer, default=0, server_default=func.text("0"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("species", "name", name="uq_pet_breeds_species_name"),
    )
