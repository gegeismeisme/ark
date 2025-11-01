# 通知 & 附件功能手动测试流程

本文档用于指导在本地或远程环境中验证任务通知（邮件 / Push）与附件签名上传接口的完整流程。执行前请先完成环境变量配置与最新代码部署。

---

## 1. 前提条件

1. Supabase 项目已设置以下 Secrets，并已重新部署 `task-notifier`：
   - `NOTIFY_SMTP_HOST` / `NOTIFY_SMTP_PORT`
   - `NOTIFY_SMTP_USER` / `NOTIFY_SMTP_PASS`
   - `NOTIFY_FROM_EMAIL`
   - `EXPO_ACCESS_TOKEN`（可选 `EXPO_PUSH_URL`）
2. Supabase Storage 存在私有桶 `attachments`，并执行了迁移 `0016_storage_attachment_policies.sql`。
3. 环境变量在本地 `.env.local` / `supabase/.env` 中同步，就绪后运行：
   ```bash
   pnpm --filter web dev
   pnpm --filter mobile start
   ```
4. 移动端（真机或模拟器）已登录账号，并允许通知权限，确保 `user_device_tokens` 表出现当前设备 token。

---

## 2. 通知渠道测试

### 2.1 准备任务数据
1. 使用 Web 仪表盘创建测试任务，指派给至少一个拥有有效邮箱的成员。
2. 记录任务 ID、指派成员 ID。

### 2.2 手动触发通知

**方法 A：Supabase Functions Invoke（推荐）**
```bash
pnpm exec supabase functions invoke task-notifier --body '{
  "event_type": "due_reminder",
  "task_id": "<TASK_ID>",
  "assignment_id": "<ASSIGNMENT_ID>",
  "payload": {
    "assignee_id": "<USER_ID>"
  }
}'
```

**方法 B：直接往队列插入测试数据（SQL Editor）**
```sql
insert into task_notification_queue (event_type, task_id, assignment_id, payload)
values (
  'due_reminder',
  '<TASK_ID>',
  '<ASSIGNMENT_ID>',
  jsonb_build_object('assignee_id', '<USER_ID>')
);
```
等待 Scheduler（5 分钟间隔）或手动执行函数：
```bash
pnpm exec supabase functions invoke task-notifier/scheduler
```

### 2.3 验证结果
1. **邮箱**：检查被指派成员是否收到来自 `NOTIFY_FROM_EMAIL` 的提醒邮件。
2. **Push**：确认 Expo Push 通知是否送达（真实设备通知中心）。
3. 如未成功，登录 Supabase 控制台 → `Functions → task-notifier → Logs`，查看错误信息；同时检查 SES 发送记录、Expo 响应状态。

---

## 3. 附件签名上传测试

### 3.1 获取访问令牌
1. 运行 Web Dev 后，使用浏览器登录。
2. 在浏览器 DevTools → Application → Local Storage → `supabase.auth.token` 获取 `access_token`。

### 3.2 生成上传签名
```bash
curl -X POST http://localhost:3000/api/storage/sign-upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "taskId": "<TASK_ID>",
    "fileName": "demo.pdf",
    "contentType": "application/pdf",
    "size": 12345
  }'
```
预期返回：
```json
{
  "url": "<SIGNED_UPLOAD_URL>",
  "path": "org/<orgId>/task/<taskId>/<uuid>-demo.pdf",
  "token": "...",
  "expiresIn": 60
}
```

### 3.3 上传文件
```bash
curl -X PUT "<SIGNED_UPLOAD_URL>" \
  -H "Content-Type: application/pdf" \
  --data-binary "@./demo.pdf"
```
HTTP 200/204 表示上传成功。

### 3.4 验证下载签名
```bash
curl -X POST http://localhost:3000/api/storage/sign-download \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{ "path": "org/<orgId>/task/<taskId>/<uuid>-demo.pdf" }'
```
返回的 `signedUrl` 应该可以在浏览器中访问。

### 3.5 写入业务数据
- 将 `path`、`contentType`、`size` 等信息写入任务附件表（如 `task_attachments`）。
- 刷新任务详情页，确认附件列表显示。

---

## 4. 常见问题 & 排查

| 问题 | 排查方向 |
| --- | --- |
| 邮件未送达 | 查看 SES 发送记录；确保邮箱已通过 SES 验证且未超配额；检查 `NOTIFY_FROM_EMAIL` 是否正确。 |
| Push 未送达 | 确认设备 token 已写入 `user_device_tokens`；检查 Expo Push API 响应是否报错（如 token 已失效）。 |
| 签名接口 401/403 | 确认请求带了有效的 `access_token`，用户属于该组织并是活跃成员。 |
| 上传返回 403 | 检查策略是否生效、路径命名是否符合 `org/<orgId>/task/...` 约定、文件大小/类型是否在允许范围内。 |
| 下载链接失效 | 重新调用 `sign-download` 获取最新签名；默认有效期 120 秒。 |

---

## 5. 完成后建议
1. 在 Web/移动端集成上述流程，提供友好的 UI 和错误提示。
2. 将本测试流程记录到团队文档或 QA Checklist，便于回归测试。
3. 在生产部署（Vercel、Expo EAS 等）同步环境变量和 Storage 策略，保证行为一致。

如在执行过程中遇到任何阻塞，可随时与我交流以获得协助。祝测试顺利！***
