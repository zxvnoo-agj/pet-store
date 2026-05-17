import asyncio
from datetime import UTC, datetime
from typing import Optional

from loguru import logger

from app.core.config import settings
from app.utils.http_client import HttpClient


class XHSCollector:
    def __init__(self):
        self.http = HttpClient(
            base_url="https://edith.xiaohongshu.com",
            timeout=30,
            max_retries=3,
            base_delay=2.0,
            rate_limit=2.0,
        )
        self.cookie = settings.XHS_COOKIE or ""
        self.backup_cookie = settings.XHS_BACKUP_COOKIE or ""
        self._current_cookie = self.cookie

    async def _request(self, path: str, **kwargs) -> dict:
        headers = kwargs.pop("headers", {})
        headers["Cookie"] = self._current_cookie
        headers["User-Agent"] = "Mozilla/5.0 (Linux; Android 13; SM-S9010) AppleWebKit/537.36"
        headers["Referer"] = "https://www.xiaohongshu.com/"

        resp = await self.http.get(path, headers=headers, **kwargs)
        return await resp.json()

    async def search_notes(self, keyword: str, page: int = 1, page_size: int = 20) -> list[dict]:
        path = f"/api/sns/web/v1/search/notes?keyword={keyword}&page={page}&page_size={page_size}&sort=general"
        try:
            data = await self._request(path)
            items = data.get("data", {}).get("items", [])
            logger.debug(f"XHS search keyword='{keyword}' page={page}: found {len(items)} notes")
            return items
        except Exception as e:
            logger.error(f"XHS search failed for '{keyword}': {e}")
            return []

    async def get_note_detail(self, note_id: str) -> Optional[dict]:
        path = f"/api/sns/web/v1/feed?note_id={note_id}"
        try:
            data = await self._request(path)
            note = data.get("data", {}).get("items", [None])[0]
            if note:
                logger.debug(f"XHS detail note_id={note_id}: fetched")
                return note
            return None
        except Exception as e:
            logger.error(f"XHS detail failed for note_id={note_id}: {e}")
            return None

    async def get_note_comments(self, note_id: str, page: int = 1) -> list[dict]:
        path = f"/api/sns/web/v2/comment/page?note_id={note_id}&cursor={page}&top_comment_id="
        try:
            data = await self._request(path)
            comments = data.get("data", {}).get("comments", [])
            logger.debug(f"XHS comments note_id={note_id} page={page}: {len(comments)} comments")
            return comments
        except Exception as e:
            logger.error(f"XHS comments failed for note_id={note_id}: {e}")
            return []

    def parse_note(self, note: dict) -> dict:
        note_card = note.get("note_card", {})
        return {
            "external_note_id": note.get("id", "") or note.get("note_id", ""),
            "title": note_card.get("title", ""),
            "content": note_card.get("desc", ""),
            "images": [i.get("url", "") for i in (note_card.get("image_list", []) or [])],
            "author": note.get("author", {}).get("nickname", "") or note_card.get("user", {}).get("nickname", ""),
            "likes": note.get("interact_info", {}).get("liked_count", 0) or note_card.get("liked_count", 0),
            "note_published_at": datetime.fromtimestamp(
                note.get("time", 0) or note_card.get("time", 0), tz=UTC
            ) if note.get("time") or note_card.get("time") else None,
        }

    async def collect_product_reviews(self, product_name: str, brand: Optional[str] = None, max_notes: int = 30) -> list[dict]:
        keywords = [f"{brand} {product_name}" if brand else product_name]
        all_notes = []
        page = 1

        for keyword in keywords:
            while len(all_notes) < max_notes:
                notes = await self.search_notes(keyword, page=page)
                if not notes:
                    break

                for note_data in notes:
                    if len(all_notes) >= max_notes:
                        break

                    note_id = note_data.get("id", "")
                    if not note_id:
                        continue

                    detail = await self.get_note_detail(note_id)
                    if not detail:
                        continue

                    parsed = self.parse_note(detail)
                    comments = await self.get_note_comments(note_id)
                    parsed["comments"] = [c.get("content", "") for c in comments]
                    all_notes.append(parsed)

                    await asyncio.sleep(2)

                page += 1

            page = 1

        logger.debug(f"XHS collected {len(all_notes)} notes for product '{product_name}'")
        return all_notes

    async def close(self):
        await self.http.close()
