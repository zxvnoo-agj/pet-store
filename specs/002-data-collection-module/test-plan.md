# 测试计划：数据采集与丰富模块

## 环境配置

### 后端
```bash
cd backend
./venv/bin/alembic upgrade head
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 前端
```bash
cd admin
VITE_API_URL=http://localhost:8001/v1 npm run dev
```

> 前端运行在 `http://localhost:3001`，CORS 已配置允许。

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`

---

## 第一步：登录验证

| # | 操作 | 预期结果 |
|---|------|----------|
| 1.1 | 浏览器打开 `http://localhost:3001` | 看到 peach 主题登录页 |
| 1.2 | 输入 admin / admin123 点击登录 | 跳转到运营总览页 |
| 1.3 | 观察侧边栏 | 共 7 个菜单项：运营总览、商品管理、分类管理、评价审核、**商品采集**、**搜索策略**、**采集日志** |

---

## 第二步：搜索策略（CRUD + 执行）

| # | 操作 | 预期结果 |
|---|------|----------|
| 2.1 | 点击侧边栏"搜索策略" | 进入策略列表，含列：名称、关键词、价格区间、排序、上次执行、上次结果、操作 |
| 2.2 | 点击右上角"新建策略" | 展开表单：名称、关键词、价格区间、排序方式、单次上限 |
| 2.3 | 填写名称="猫粮销量排序"，关键词="猫粮 幼猫"，排序="销量排序"，上限=10 | 表单输入正常 |
| 2.4 | 点击"创建" | 策略出现在列表，表单收起 |
| 2.5 | 再建一条：名称="狗粮综合"，关键词="狗粮"，上限=5 | 两条策略均在列表 |
| 2.6 | 点击第一条策略的"执行" | 按钮显示加载动画，后端返回 202 |
| 2.7 | 刷新列表 | 上次执行时间、上次结果（新增/跳过/失败）更新 |
| 2.8 | 点击"删除" | 确认弹窗，确认后策略消失 |

---

## 第三步：商品采集（核心流程）

| # | 操作 | 预期结果 |
|---|------|----------|
| 3.1 | 点击"商品采集" | 含状态筛选按钮（全部/待采集/采集中/已上架/采集失败） |
| 3.2 | 查看全部商品 | 如果执行过策略，显示自动发现的商品 |
| 3.3 | 点击各状态筛选按钮 | 列表正确过滤对应状态的商品 |
| 3.4 | 点击"手动添加商品" | 展开表单：商品名称、拼多多链接、提交/取消 |
| 3.5 | 填写名称="皇家幼猫粮K36"，链接=`https://mobile.yangkeduo.com/goods.html?goods_id=1772698116` | 表单正常 |
| 3.6 | 点击"提交" | 表单关闭，列表新增 pending 商品 |
| 3.7 | 等待 30-60 秒刷新页面 | 状态流转：pending → enriching → active |
| 3.8 | 若状态为 failed，点击该行"重试" | 回到 pending，重新采集 |

---

## 第四步：评价审核

| # | 操作 | 预期结果 |
|---|------|----------|
| 4.1 | 确保有 active 且 brand 非空的商品 | 在商品管理确认 |
| 4.2 | 触发 XHS 采集 | `curl -X POST http://localhost:8001/v1/admin/collect/products/{id}/xhs-collect -H "Authorization: Bearer $TOKEN"` |
| 4.3 | 等待 2-5 分钟 | 采集完成后评价审核页出现 source="crawled" 的评价 |
| 4.4 | 点击侧边栏"评价审核" | 看到 XHS 评价，含 author、tags、LLM 分析 |
| 4.5 | 查看评价详情 | pros/cons 标签、推荐态度、置信度、猫咪反应 |
| 4.6 | 调公共评价接口验证隐私 | `curl http://localhost:8001/v1/products/{id}/reviews` → author 字段被剥离 |

---

## 第五步：采集日志 + 调度器

| # | 操作 | 预期结果 |
|---|------|----------|
| 5.1 | 点击"采集日志" | 所有采集任务记录，按时间倒序 |
| 5.2 | 日志头部显示失败数量 | 红色角标显示失败任务数 |
| 5.3 | 按状态、任务类型筛选 | 筛选正确 |
| 5.4 | 点"详情" | 弹出模态框：ID、数据源、类型、状态、参数、结果、错误信息 |
| 5.5 | 点"重试"（失败任务） | 新建任务重启 |
| 5.6 | 查询调度器状态 | `curl http://localhost:8001/v1/admin/collect/scheduler/status -H "Authorization: Bearer $TOKEN"` |
| 5.7 | 手动触发调度任务 | `curl -X POST http://localhost:8001/v1/admin/collect/scheduler/trigger/hourly_price_update -H "Authorization: Bearer $TOKEN"` |

---

## 第六步：数据源配置

| # | 操作 | 预期结果 |
|---|------|----------|
| 6.1 | 更新 XHS cookie | `curl -X PATCH http://localhost:8001/v1/admin/collect/sources/2 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"config":{"cookie":"new_cookie"}}'` |
| 6.2 | 验证结果 | cookie 被更新 |

---

## 第七步：标签聚合

| # | 操作 | 预期结果 |
|---|------|----------|
| 7.1 | 对含 LLM 分析评价的商品触发聚合 | `curl -X POST http://localhost:8001/v1/admin/collect/products/{id}/aggregate-tags -H "Authorization: Bearer $TOKEN"` |
| 7.2 | 查看商品 pros/cons | 更新为置信度加权后的 Top-8 优 / Top-6 缺 |
| 7.3 | 查看 recommend_rate | 正确计算推荐百分比 |

---

## 快速验证脚本

```bash
TOKEN=$(curl -s -X POST http://localhost:8001/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

echo "1. 数据源    : $(curl -s http://localhost:8001/v1/admin/collect/sources -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['data']['items']),'个')")"
echo "2. 搜索策略  : $(curl -s http://localhost:8001/v1/admin/collect/strategies -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['total'],'个')")"
echo "3. 采集商品  : $(curl -s "http://localhost:8001/v1/admin/collect/products" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['total'],'个')")"
echo "4. 采集日志  : $(curl -s "http://localhost:8001/v1/admin/collect/jobs" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['total'],'条')")"
echo "5. 评价数    : $(curl -s "http://localhost:8001/v1/admin/reviews" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['data']['reviews']),'条')")"
```

---

## 验收清单

- [ ] 侧边栏 7 个菜单均正常显示
- [ ] 搜索策略 CRUD 完整可用
- [ ] 执行策略后商品出现在采集列表
- [ ] 手动录入商品后状态正常流转
- [ ] 采集失败可重试
- [ ] XHS 评价采集正常入库
- [ ] 公共 API 不返回 author（隐私合规）
- [ ] 标签聚合后 pros/cons/recommend_rate 更新
- [ ] 调度器可查询状态、可手动触发
- [ ] 数据源配置可更新
- [ ] SSE 进度推送正常响应
