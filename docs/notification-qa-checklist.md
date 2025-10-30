# Notification & Reminder QA Checklist

This checklist ensures the email + Expo push notification pipeline is functioning across task lifecycle events and reminder jobs.

## Prerequisites
- Latest migrations applied (`pnpm exec supabase db push`) and edge functions deployed (`task-notifier`, `task-reminder`).
- SMTP credentials (`NOTIFY_SMTP_*`, `NOTIFY_FROM_EMAIL`, `TASK_PORTAL_URL`) configured via Supabase secrets or local `.env`.
- Expo project ID (`EXPO_PUBLIC_EAS_PROJECT_ID`) present in `apps/mobile/.env`.
- Mobile app installed on a physical device (push tokens are required).
- Scheduler jobs created (recommendation):
  - `task-notifier` every 5 minutes.
  - `task-reminder` hourly (adjust cadence as needed).

## Smoke Tests
1. **Push token registration**
   - Sign in on the mobile app.
   - Approve push notification permission.
   - Verify `user_device_tokens` has a row for the user (`select * from user_device_tokens where user_id = '<uid>'`).

2. **Assignment created**
   - From web dashboard，创建带有指派的任务。
   - Confirm:
     - Email sent to assignee (check inbox or Supabase Inbucket when in local mode).
     - Expo push arrives on device（或通过 Expo push inspector）。
     - `task_notification_queue` entry marked with `processed_at`.

3. **Status change to completed**
   - 在移动端将任务标记为“已完成”并填写说明。
   - 管理端审核前应收到“成员已完成”通知：
     - Email + push 内容提及“完成”说明。
     - Analytics 页面指派/完成数字同步。

4. **Review updated**
   - 管理端在“执行明细”中验收任务（通过或需调整）。
   - 验证：
     - 对应邮件/push 文案提到新的验收状态。
     - Task detail 中 `review_status` 更新。

5. **Due soon reminder**
   - 创建一个 1 小时后截止的任务，指派给自己。
   - 手动触发提醒函数：
     ```bash
     pnpm exec supabase functions invoke task-reminder --no-verify-jwt
     ```
   - 确认：
     - 队列插入 `due_reminder` 事件并被 `task-notifier` 处理。
     - Email/push 文案强调“即将到期”。
     - Analytics 卡片 “已发送到期提醒” 计数 +1。

6. **Overdue reminder**
   - 修改任务截止时间至过去，或等待超时。
   - 再次调用 `task-reminder`。
   - 检查：
     - 生成 `overdue_reminder`，邮件/push 显示逾期信息。
     - `overdue_reminder_sent_at` 更新。
     - Analytics 中“已发送逾期提醒”计数增加。

## Edge Cases
- **缺少邮箱**：在 Supabase 控制台编辑 `profiles` 取消 `email`，触发任务事件，应仅发送 push 并在日志中看到 “skip email dispatch”。
- **缺少 push token**：在未安装移动端或拒绝授权的账户下触发任务事件，队列应仍处理完成且日志提示无可用 token。
- **多设备**：同一账户在两台设备登录，检查两台设备都收到 push。
- **重试机制**：故意让 SMTP 凭据错误，验证函数记录错误日志并不会阻塞 `processed_at` 更新（重试流程需人工干预）。

## Analytics Verification
- 访问 `/dashboard/analytics`：
  - 确认「已发送/待发送」提醒指标与数据库 (`task_assignment_summary`) 对齐。
  - 按任务/小组查看提醒计数是否正确。
- 导出 `task_assignment_summary` 视图，与 Analytics UI 数据比较。

## Cleanup
- 还原测试任务的截止时间或将数据归档。
- 移除临时 SMTP/Expo 配置（若使用测试邮箱或临时 Expo 账户）。
- 记录测试结果到项目 QA 文档/Issue Tracker。
