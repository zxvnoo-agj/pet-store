from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import backref, relationship

from app.core.database import Base


class AssistantMemory(Base):
    __tablename__ = "assistant_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    enabled = Column(Boolean, nullable=False, default=True, server_default="true")
    pet_status = Column(Text, nullable=True)
    preferences_budget = Column(Text, nullable=True)
    common_questions = Column(Text, nullable=True)
    cautions = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    last_extracted_message_id = Column(Integer, nullable=True)
    last_extracted_at = Column(DateTime(timezone=True), nullable=True)
    last_user_edited_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref=backref("assistant_memory", uselist=False))

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_assistant_memories_user_id"),
        CheckConstraint("char_length(coalesce(summary, '')) <= 500", name="ck_assistant_memories_summary_len"),
    )
