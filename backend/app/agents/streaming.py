import json
from collections.abc import AsyncIterator


async def stream_response(response_iterator) -> AsyncIterator[str]:
    """Stream SSE events from LangChain response."""
    async for chunk in response_iterator:
        if hasattr(chunk, 'content') and chunk.content:
            yield f"event: message\ndata: {json.dumps({'content': chunk.content, 'is_complete': False})}\n\n"
        elif hasattr(chunk, 'tool_call_chunks') and chunk.tool_call_chunks:
            for tool_call in chunk.tool_call_chunks:
                yield f"event: tool_call\ndata: {json.dumps({'tool': tool_call.name, 'args': tool_call.args})}\n\n"

    yield f"event: done\ndata: {json.dumps({'message': 'completed'})}\n\n"
