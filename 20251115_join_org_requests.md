# 2025-11-15 加入组织 / 处理申请 任务拆解

## 0. 目标与基线
- 让移动端复用网页端现有的“加入组织”“审批加入申请”流程，保持权限/文案一致，避免用户必须回到 web。
- 信息架构：`My profile` 固定展示，`Organization management`（含 Org Hub、默认群组、成员/加入管理），`Security` 为占位。
- UI 沿用浅色卡片风格；加入/审批入口需归属于组织上下文。

## 1. 参考资源
- Web 端：`apps/web/app/(dashboard)/organizations/[id]/members/*`、`join-requests/*` 等组件查看交互。
- Supabase：
  - `organization_join_requests`、视图 `join_request_details`。
  - RPC：`redeem_invitation_code` / `join_organization_via_code`、`review_org_join_request`。
  - 相关表：`organization_members`、`member_tags`（供后续展示）。

## 2. 功能拆解
### 2.1 加入新组织（成员）
1. 入口：组织中心（Org Hub）“成员与加入管理”卡片中的按钮。
2. 表单：沿用 `JoinOrganizationDrawer`，字段包含邀请码、备注。
3. 提交：调用现有 RPC，成功后刷新 active org、成员列表、申请历史。

### 2.2 审批加入（管理员）
1. 入口：同一张卡片内的“Manage join requests”按钮，仅 admin/owner 可点。
2. 列表：`ManageJoinRequestsSheet`，展示 pending 请求，提供 Accept / Reject。
3. 结果：操作后刷新 approvals、members、join history，并提示成功/失败。

### 2.3 申请历史
- 在 Org Hub 卡片内用 `JoinRequestHistory` 展示最近申请，便于成员查看状态。

## 3. 组件 & 状态
| 组件 | 说明 |
| --- | --- |
| `JoinOrganizationDrawer` | 邀请码提交抽屉，复用 invite state |
| `ManageJoinRequestsSheet` | 管理员审批 modal |
| `JoinRequestHistory` | 展示历史记录 |
| Hooks | `useOrgJoinApprovals`、`useInvites`、`useOrganizationMembers` |

## 4. 交互 & 提示
- Modal 全部使用 `orgCreateOverlay`；错误使用 `Alert.alert`。
- 成功执行后 Toast/Alert 提示，如 `t('account.join.approvedSuccess')`。
- 禁用态：非管理员点击审批按钮时提示 “仅管理员可操作”。

## 5. Org Hub 集成
- 在 `OrgHub` modal（`AccountScreen` 中的 Org Hub）新增「成员与加入管理」子面板，包含：
  - CTA：加入组织 / 审批申请。
  - 申请历史列表。
  - 待审批列表和成员列表摘要（可折叠或短列表）。
- 账户页 `account.sections.join` 折叠块保留一条提示，引导用户打开 Org Hub 操作，避免重复 UI。

## 6. 后续扩展
- 在 Org Settings Sheet 中增加审批入口快捷链接。
- 任务页顶部增加待审批徽章，提醒管理员处理。
