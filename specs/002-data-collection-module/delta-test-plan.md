# Delta 测试计划：Data Collection Module v3

**基于**: v2 测试计划 [test-plan.md](test-plan.md)
**测试范围**: HTTP 爬虫 (httpx + Cookie) + Vision LLM 成分识别 + 推广链接 + promotion_rate

---

## 前置条件

### 环境要求
- PDD 登录 cookie 已保存到 `backend/pdd_cookies.json`（运行 `cd backend && ./venv/bin/python scripts/login_pdd.py` 登录导出）
- DASHSCOPE_API_KEY 已配置（已有）
- PDD API 凭证已配置（已有）

### 数据库迁移
```bash
cd backend
./venv/bin/alembic upgrade head
# 预期: 新增 products 表列 (goods_name, pet_type, promotion_rate, gallery_urls, detail_img_urls 等)
#       新增 promotion_url_cache 表
```

### 启动服务
```bash
cd backend
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

cd admin
VITE_API_URL=http://localhost:8001/v1 npm run dev
# 前端: http://localhost:3001
```

### 管理员登录
- 用户名: `admin`, 密码: `admin123`

---

## 第一步：手动录入商品（含 pet_type）

| # | 操作 | 预期结果 |
|---|------|----------|
| 1.1 | 登录管理后台 → 侧边栏"商品采集" | 页面标题"商品采集"，有"手动添加商品"按钮 |
| 1.2 | 点击"手动添加商品" | 展开表单：商品名称、拼多多链接、**宠物类型(猫/狗)**、提交/取消 |
| 1.3 | 确认新增 pet_type 下拉框 | 默认选中"猫"，可选"猫"/"狗" |
| 1.4 | 填写：名称="皇家幼猫粮K36"，链接=`https://mobile.yangkeduo.com/goods.html?goods_id=1772698116`，宠物类型="猫" | 表单输入正常 |
| 1.5 | 点击"提交" | 表单关闭，列表新增 pending 商品 |
| 1.6 | 从后端验证 pet_type 存储 | `curl http://localhost:8001/v1/admin/products/{product_id} -H "Authorization: Bearer $TOKEN"` → `pet_type: "cat"` |

---

## 第二步：Cookie 导出

| # | 操作 | 预期结果 |
|---|------|----------|
| 2.1 | 运行登录脚本 | `cd backend && ./venv/bin/python scripts/login_pdd.py` |
| 2.2 | 浏览器打开拼多多登录页 | 手动输入手机号+验证码登录 |
| 2.3 | 登录成功后脚本自动导出 Cookie | 终端显示 "Cookie 已导出: backend/pdd_cookies.json (N cookies)" |
| 2.4 | 验证 Cookie 文件 | `cat backend/pdd_cookies.json` → 包含 `cookies` 字典和 `user_agent` |

## 第三步：五步采集管线验证（核心）

验证新 enrichment pipeline：httpx → LLM → Vision LLM → PDD API 价格/佣金 → 保存

| # | 操作 | 预期结果 |
|---|------|----------|
| 3.1 | 提交商品后等待 1-3 分钟 | 状态流转：pending → enriching → active |
| 3.2 | 查看后端日志 | 应看到五步日志：`[enrich] Step 1 (httpx)` → `[enrich] Step 2 (LLM)` → `[enrich] Step 3 (Vision)` → `[enrich] Step 4 (PDD API)` → `[enrich] Step 5 complete` |
| 3.3 | 验证爬虫数据 | 商品 `gallery_urls`, `detail_img_urls`, `mall_name` 已填充 |
| 3.4 | 验证 Vision LLM 数据 | 商品 `ingredients`, `nutrition` 字段已填充（如有成分表图片） |
| 3.5 | 验证 PDD 价格+佣金 | 商品 `price_min`, `promotion_rate`, `min_group_price` 已填充 |
| 3.6 | 验证 goods_name | 商品 `goods_name` 不为空 |

### 管线降级测试

| # | 操作 | 预期结果 |
|---|------|----------|
| 3.7 | 删除 `pdd_cookies.json`（模拟 Cookie 过期）| Step 1 检测到 `needLogin` 并跳过，继续 Step 2-4，商品仍能 → active |
| 3.8 | 禁用 DASHSCOPE_API_KEY 后提交商品 | Step 3 (Vision) 失败并记录 warning，Step 4 继续执行，商品仍 → active |

---

## 第四步：两阶段 SSE 进度

| # | 操作 | 预期结果 |
|---|------|----------|
| 4.1 | 创建搜索策略（如"猫粮测试"，关键词=["猫粮"]，上限=5） | 策略创建成功 |
| 4.2 | 点击"执行" | 返回 202 + job_id |
| 4.3 | 订阅 SSE: `curl -N "http://localhost:8001/v1/admin/collect/products/discovery-progress?job_id={job_id}" -H "Authorization: Bearer $TOKEN"` | 看到两阶段事件： |
| | - 阶段一 (discovery) | `{"phase": "discovery", "found": N, "new": M, ...}` |
| | - 阶段二 (enrichment) | `{"phase": "enrichment", "total": M, "completed": K, ...}` |
| | - 完成事件 | `{"phase": "complete", "enriched": K, "failed": F, ...}` |

## 第五步：推广链接测试

| # | 操作 | 预期结果 |
|---|------|----------|
| 5.1 | 找已上架的商品（状态=active，有 pdd_goods_sign） | 记录 product_id |
| 5.2 | 调用推广链接接口 | `curl http://localhost:8001/v1/products/{product_id}/promotion-url` |
| 5.3 | 验证返回结构 | `{"data": {"short_url": "https://p.pinduoduo.com/...", "mobile_url": "https://...", "we_app_url": "https://...", "cached": false}}` |
| 5.4 | 重复调用同商品接口 | `cached: true`（缓存命中） |
| 5.5 | 验证 short_url 可访问（可选） | 浏览器打开 short_url → 跳转到拼多多商品页 |

### 错误场景

| # | 操作 | 预期结果 |
|---|------|----------|
| 5.6 | 调用不存在商品的接口 | `curl http://localhost:8001/v1/products/99999/promotion-url` → 404 |
| 5.7 | 调用无 goods_sign 的商品 | 返回 400 "No goods_sign available" |

## 第六步：promotion_rate 定时刷新

| # | 操作 | 预期结果 |
|---|------|----------|
| 6.1 | 确认商品有 promotion_rate | 字段 >= 0 |
| 6.2 | 手动触发价格刷新 | `curl -X POST http://localhost:8001/v1/admin/collect/scheduler/trigger/hourly_price_update -H "Authorization: Bearer $TOKEN"` |
| 6.3 | 成功后查商品数据 | `promotion_rate` 字段更新（如有变化） |

---

## 第七步：自动化测试

```bash
cd backend

# 单元测试
./venv/bin/pytest tests/unit/test_pdd_crawler.py -v
./venv/bin/pytest tests/unit/test_vision_service.py -v
./venv/bin/pytest tests/unit/test_promotion_url.py -v

# 集成测试
./venv/bin/pytest tests/integration/test_enrichment_pipeline.py -v
```

---

## 快速验证脚本

```bash
TOKEN=$(curl -s -X POST http://localhost:8001/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

echo "=== 推广链接（替换 product_id） ==="
curl -s http://localhost:8001/v1/products/1/promotion-url | python3 -m json.tool

echo "=== SSE 事件流 ==="
curl -N "http://localhost:8001/v1/admin/collect/products/discovery-progress?job_id=1" \
  -H "Authorization: Bearer $TOKEN"

echo "=== 手动触发价格刷新 ==="
curl -X POST http://localhost:8001/v1/admin/collect/scheduler/trigger/hourly_price_update \
  -H "Authorization: Bearer $TOKEN"
```

---

## 验收清单

- [ ] Cookie 已通过 `login_pdd.py` 导出到 `pdd_cookies.json`
- [ ] 商品提交后状态流转 pending → enriching → active
- [ ] httpx Step 1 成功执行（gallery, detail 图片填充）
- [ ] Vision LLM Step 3 成功执行（ingredients/nutrition 填充）
- [ ] 管线降级：某步失败不影响后续步骤
- [ ] SSE 分两阶段推送（discovery + enrichment）
- [ ] 推广链接返回 short_url/mobile_url/we_app_url
- [ ] 推广链接缓存 12h 生效（重复请求 cached=true）
- [ ] promotion_rate 定时刷新（手动触发验证）
- [ ] 单元测试全部通过
