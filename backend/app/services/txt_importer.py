import json
import os
import time
from typing import Any

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crawled_product import CrawledProduct
from app.schemas.crawled_product import FailedDetail, ImportResult
from app.utils.encoding_detector import read_with_encoding

PDP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "pet-store", "pdd")
PDP_DIR = os.path.abspath(PDP_DIR)


def _parse_jsonl_line(line: str, line_num: int) -> dict[str, Any] | None:
    stripped = line.strip()
    if not stripped:
        return None
    try:
        data = json.loads(stripped)
    except json.JSONDecodeError:
        logger.warning(f"JSON parse error at line {line_num}: {stripped[:100]}")
        return None

    if not data.get("goods_id"):
        logger.warning(f"Missing goods_id at line {line_num}")
        return None

    return data


def parse_txt_file(file_path: str) -> tuple[list[dict[str, Any]], list[FailedDetail]]:
    failed: list[FailedDetail] = []
    records: list[dict[str, Any]] = []

    try:
        content = read_with_encoding(file_path)
    except Exception as e:
        failed.append(FailedDetail(file=os.path.basename(file_path), reason=f"编码检测失败: {e}"))
        return records, failed

    lines = content.split("\n")
    for i, line in enumerate(lines, start=1):
        parsed = _parse_jsonl_line(line, i)
        if parsed is None:
            if line.strip():
                failed.append(FailedDetail(
                    file=os.path.basename(file_path),
                    reason="JSON解析错误或goods_id缺失",
                    line=i,
                ))
            continue
        records.append(parsed)

    if not records and not failed:
        failed.append(FailedDetail(
            file=os.path.basename(file_path),
            reason="文件为空或无有效记录",
        ))

    return records, failed


async def import_from_directory(
    db: AsyncSession,
    max_files: int = 200,
) -> ImportResult:
    start_time = time.monotonic()

    if not os.path.isdir(PDP_DIR):
        return ImportResult(
            total_files=0,
            new_records=0,
            updated_records=0,
            failed_files=0,
            failed_details=[],
            duration_seconds=0.0,
        )

    all_files = sorted([
        f for f in os.listdir(PDP_DIR)
        if f.endswith(".txt") and os.path.isfile(os.path.join(PDP_DIR, f))
    ])

    if not all_files:
        return ImportResult(
            total_files=0,
            new_records=0,
            updated_records=0,
            failed_files=0,
            failed_details=[],
            duration_seconds=0.0,
        )

    total_files = 0
    new_records = 0
    updated_records = 0
    failed_files = 0
    all_failed_details: list[FailedDetail] = []

    for filename in all_files[:max_files]:
        total_files += 1
        file_path = os.path.join(PDP_DIR, filename)

        records, failures = parse_txt_file(file_path)
        if failures:
            failed_files += 1
            all_failed_details.extend(failures)

        if not records:
            continue

        for record in records:
            goods_id = record.get("goods_id")
            if not goods_id:
                continue

            existing = await db.execute(
                select(CrawledProduct.id).where(CrawledProduct.goods_id == goods_id)
            )
            is_update = existing.scalar_one_or_none() is not None

            stmt = pg_insert(CrawledProduct).values(
                goods_id=goods_id,
                title=record.get("title"),
                raw_content=json.dumps(record, ensure_ascii=False),
                raw_text=record.get("raw_text"),
                raw_html=record.get("raw_html"),
                images=record.get("images", []),
                crawl_timestamp=record.get("crawled_at"),
                file_source=filename,
            ).on_conflict_do_update(
                index_elements=["goods_id"],
                set_={
                    "title": record.get("title"),
                    "raw_content": json.dumps(record, ensure_ascii=False),
                    "raw_text": record.get("raw_text"),
                    "raw_html": record.get("raw_html"),
                    "images": record.get("images", []),
                    "crawl_timestamp": record.get("crawled_at"),
                    "file_source": filename,
                    "import_error": None,
                    "import_status": "active",
                    "updated_at": func.now(),
                },
            )

            await db.execute(stmt)
            if is_update:
                updated_records += 1
            else:
                new_records += 1

    await db.commit()

    elapsed = time.monotonic() - start_time
    logger.info(
        f"Import complete: {total_files} files, {new_records} new, "
        f"{updated_records} updated, {failed_files} failed, {elapsed:.1f}s"
    )

    return ImportResult(
        total_files=total_files,
        new_records=new_records,
        updated_records=updated_records,
        failed_files=failed_files,
        failed_details=all_failed_details,
        duration_seconds=round(elapsed, 1),
    )
