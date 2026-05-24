from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    species = Column(String(16), nullable=False)
    breed_id = Column(Integer, ForeignKey("pet_breeds.id", ondelete="SET NULL"), nullable=True)
    nickname = Column(String(32), nullable=False)
    age_months = Column(Integer, nullable=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    breed = relationship("PetBreed", lazy="joined")

    __table_args__ = (
        UniqueConstraint("user_id", "species", "nickname", name="uq_user_species_nickname"),
        CheckConstraint(
            "species IN ('cat','dog','bird','fish','reptile','small_pet','other')",
            name="ck_pet_species",
        ),
    )
