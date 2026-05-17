# 003: 商品详情获取流程优化

**Feature Branch**: `003-data-collection-refinement`
**Created**: 2026-05-17
**Status**: Active

## Objectives

1. **移除 Playwright 爬虫**: `ConservativePDDCrawler` 不可靠（HTTP 302/403、cookie 过期、日限额），且与 PDD 官方 API 数据严重冗余
2. **重构商品采集流程 (enrichment pipeline)**: 去掉冗余的 Step 1 爬虫，改为直接从 PDD 详情 API 获取轮播图、详情图、店铺名等信息
3. **确保数据完整性**: 验证 `parse_goods` 中 gallery_urls 和 detail_img_urls 从搜索API和详情API的覆盖情况，补全丢失字段

## Key Changes

| 当前 | 目标 |
|------|------|
| Step 1: Playwright 爬虫 (8-15s/商品, 不稳定) | 移除 |
| Step 4: PDD 详情 API (仅获取价格/佣金) | 提升为 Step 1，同时获取完整数据 |
| `gallery_urls`/`detail_img_urls` 依赖爬虫填充 | 从 `parse_goods()` 结果中直接写入 Product 字段 |
| `service_tags` 唯一来源爬虫 | 暂时放弃或从 API 其他字段提取 |

## Related Specs

- Feature 002 data model: `specs/002-data-collection-module/data-model.md`
- Feature 002 collection service: `backend/app/services/collection_service.py`
- Feature 002 PDD crawler: `backend/app/services/pdd_crawler.py`
- Feature 002 PDD client: `backend/app/services/pdd_client.py`
