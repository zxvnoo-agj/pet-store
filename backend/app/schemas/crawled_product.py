from datetime import datetime

from pydantic import BaseModel, Field


class CrawledProductResponse(BaseModel):
    id: int
    goods_id: str
    title: str | None = None
    raw_content: str
    raw_text: str | None = None
    raw_html: str | None = None
    images: list[str] = []
    crawl_timestamp: datetime | None = None
    file_source: str | None = None
    import_status: str = "active"
    import_error: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class CrawledProductListResponse(BaseModel):
    items: list[CrawledProductResponse]
    total: int
    page: int
    page_size: int


class ImportRequest(BaseModel):
    max_files: int = Field(default=200, ge=1, le=1000)


class FailedDetail(BaseModel):
    file: str
    reason: str
    line: int | None = None


class ImportResult(BaseModel):
    total_files: int
    new_records: int
    updated_records: int
    failed_files: int
    failed_details: list[FailedDetail] = []
    duration_seconds: float
