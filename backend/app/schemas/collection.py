from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SearchStrategyCreate(BaseModel):
    data_source_id: int
    name: str = Field(..., max_length=64)
    keywords: list[str] = Field(default_factory=list)
    opt_id: int | None = None
    price_min: int | None = None
    price_max: int | None = None
    sort_type: int = 0
    max_items: int = 100
    brand_filter: list[str] = Field(default_factory=list)


class SearchStrategyResponse(BaseModel):
    id: int
    data_source_id: int
    name: str
    keywords: list[Any]
    opt_id: int | None = None
    price_min: int | None = None
    price_max: int | None = None
    sort_type: int
    max_items: int
    brand_filter: list[Any] = Field(default_factory=list)
    last_run_at: datetime | None = None
    last_result: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchStrategyList(BaseModel):
    items: list[SearchStrategyResponse]
    total: int
    page: int
    page_size: int


class ProductSeed(BaseModel):
    category_id: int
    product_name: str = Field(..., max_length=128)
    pdd_url: str = Field(..., max_length=2048)
    pet_type: str = Field(default="cat", pattern=r"^(cat|dog)$")


class ProductSeedResponse(BaseModel):
    product_id: int
    status: str = "pending"
    message: str


class ProductCollectionStatus(BaseModel):
    product_id: int
    name: str
    status: str
    brand: str | None = None
    source_platform: str | None = None
    created_at: datetime


class ProductCollectionList(BaseModel):
    items: list[ProductCollectionStatus]
    total: int
    page: int
    page_size: int


class RetryResponse(BaseModel):
    product_id: int
    status: str
    message: str


class DiscoveryProgress(BaseModel):
    found: int = 0
    new: int = 0
    skipped: int = 0
    failed: int = 0
    stage: str = "pending"
    phase: str = "discovery"
    total: int = 0
    completed: int = 0
    enriched: int = 0
    total_time_seconds: float | None = None


class PromotionUrlResponse(BaseModel):
    short_url: str
    mobile_url: str | None = None
    we_app_url: str | None = None
    cached: bool = False


class StrategyExecuteResponse(BaseModel):
    job_id: int
    status: str
    message: str


class CollectionJobResponse(BaseModel):
    id: int
    data_source_id: int
    data_source_name: str | None = None
    job_type: str
    collection_type: str = "full"
    status: str
    product_id: int | None = None
    params: dict | None = None
    result: dict | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CollectionJobList(BaseModel):
    items: list[CollectionJobResponse]
    total: int
    page: int
    page_size: int
    failed_count: int = 0


class JobRetryResponse(BaseModel):
    new_job_id: int
    status: str
    message: str


class XHSCollectResponse(BaseModel):
    job_id: int
    status: str
    message: str


class DataSourceResponse(BaseModel):
    id: int
    name: str
    platform: str
    is_active: bool
    last_sync_at: datetime | None = None
    sync_interval_minutes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DataSourceList(BaseModel):
    items: list[DataSourceResponse]


class DataSourceUpdate(BaseModel):
    is_active: bool | None = None
    config: dict | None = None


class SchedulerStatus(BaseModel):
    running: bool
    jobs: list[dict] = []


class AggregationTriggerResponse(BaseModel):
    product_id: int
    message: str
