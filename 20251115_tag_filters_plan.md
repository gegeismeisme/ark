# 2025-11-15 标签过滤（移动端）执行计划

## 0. 目标与背景
- Web 端已在任务面板提供丰富的标签分类 / 必填规则 / 成员标签申请流程。移动端希望至少具备“任务列表顶部的标签筛选”能力，方便在手机上快速切换组织的标签视图。
- 现阶段优先支持“任务列表（Home/Tasks Tab）基于标签过滤”，后续再扩展到完整的标签管理。
- 同时沿用浅色卡片风格，避免过度堆叠；过滤入口应可折叠，保持任务页高度稳定。

## 1. 参考实现（Web）
- `apps/web/app/dashboard/tasks/hooks/use-task-dashboard/tag-filters.ts`：从 `organization_tag_categories` + `organization_tags` 拉取类别与标签，提供 normalized filters。
- `apps/web/app/dashboard/tags/use-tag-management.ts`：更完整的标签 CRUD/申请逻辑，可用于后续管理功能。
- Supabase 表：
  - `organization_tag_categories`、`organization_tags`、`organization_tag_members`。
  - 相关 RPC：`list_tag_categories`（若存在）、或需要直接 `.from` 查询（左连接 categories/tags）。

## 2. 数据/接口规划
- 新建 hook `useTagFilters`：
  - 输入：`organizationId`.
  - 输出：类别列表（包含 `id`, `name`, `selection_type`, `is_required`, `tags[]`）。
  - 行为：先尝试 `supabase.from('organization_tag_categories')...select('..., organization_tags(...))'`；按照 `is_required` 和 `sort_order` 排序。
  - 状态：`loading`, `error`, `refresh`.
- 新建 hook `useTaskAssignments(filters)`：
  - 目前任务列表可能已有 assignments prop；需要研究 `AppContent` 如何获取 assignments，再在客户端基于 tag filters 做筛选。
  - 若 assignments 数据包含 `task.tags`，即可前端过滤；否则要扩展 API 让 `assignments` 查询返回标签字段（`task_tags` join）。

## 3. UI 方案
1. **顶部过滤条**：
   - 放在 `HomeTaskList` 上方、或 `TasksTab` 主列表顶部，使用 pill + “更多”按钮。
   - 默认展示 2-3 个常用类别；点击“全部过滤”打开抽屉。
2. **标签抽屉 `TagFilterSheet`**：
   - Modal + `orgCreateOverlay` 风格，显示类别（accordion）+ 标签 pill（单/多选）。
   - 底部“清除”“应用”按钮；应用后关闭抽屉并触发过滤 state。
3. **空态提示**：
   - 当过滤导致无任务时，显示“无匹配任务 + 清除筛选”按钮。

## 4. 状态与交互
- `selectedTags`：记录每个 category 的所选 tag ids；`selection_type` 控制单选/多选。
- 过滤逻辑：
  - `task` 必须匹配所有被选类别（AND），每个类别中只要包含选中标签之一（OR）。
  - 无选项时显示全部任务。
- 需要 `clearFilters`、`applyFilters`、`temporarySelection`（sheet 内编辑、点击应用后提交）。

## 5. 分阶段执行
1. **阶段一（本迭代）**
   - Hook `useTagFilters`（含 supabase 查询） + `TagFilterSheet` 骨架。
   - 在 `HomeTaskList` 上方添加过滤入口（pill + 清空按钮）并将 assignments 过滤逻辑内联。
2. **阶段二**
   - 引入“常用标签快捷入口”（最近使用/必填）；
   - 处理标签必填提示（task 卡显示 missing required info）。
3. **阶段三**（后续）
   - 移动端标签管理（创建/编辑）、成员标签申请入口。

## 6. 风险与依赖
- 若任务数据缺少标签字段，需要补足 `assignments` 查询（web 端 `useTaskDashboard` 里已有 `task_tags` join 可复用）。
- 多语言文案需覆盖类别/标签/筛选操作；
- 性能：移动端 assignments 量大时，前端过滤需 memo 化，或在 supabase 查询时提供 `in` 条件（下一步再优化）。
