"""Performance-oriented query shape checks for assistant memory.

These tests keep the Dream batch query paths index-friendly without requiring a
large local dataset in CI. They assert bounded message loading, incremental
message scans, and user-scoped filtering.
"""

import pytest
from sqlalchemy.dialects import postgresql

from app.services.dream_memory_service import DreamMemoryService


class _EmptyExecuteResult:
    def all(self):
        return []

    def scalars(self):
        return self


class _RecordingDb:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _EmptyExecuteResult()


def _compiled_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    ).lower()


@pytest.mark.asyncio
async def test_dream_candidate_query_is_incremental_and_grouped_by_user():
    db = _RecordingDb()
    service = DreamMemoryService(db=db)

    candidates = await service._load_candidates(user_id=88)

    assert candidates == []
    sql = _compiled_sql(db.statements[0])
    assert "chat_sessions.user_id is not null" in sql
    assert "chat_messages.id > coalesce(assistant_memories.last_extracted_message_id, 0)" in sql
    assert "chat_sessions.user_id = 88" in sql
    assert "group by chat_sessions.user_id" in sql


@pytest.mark.asyncio
async def test_dream_message_loading_is_user_scoped_incremental_and_bounded():
    db = _RecordingDb()
    service = DreamMemoryService(db=db)

    messages = await service._load_new_messages(user_id=88, after_message_id=120, limit=80)

    assert messages == []
    sql = _compiled_sql(db.statements[0])
    assert "chat_sessions.id = chat_messages.session_id" in sql
    assert "chat_sessions.user_id = 88" in sql
    assert "chat_messages.id > 120" in sql
    assert "order by chat_messages.id asc" in sql
    assert "limit 80" in sql
