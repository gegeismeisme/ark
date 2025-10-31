# 通知 & 存储集成操作手册

本文档涵盖以下三项集成的准备步骤、所需参数及常见检查点，便于在开发与测试阶段同步推进。

- Amazon SES 事务邮件发送（供 Edge Function `task-notifier` 调用）
- Expo Push 通知（移动端设备 token 采集 + Edge 推送）
- Supabase Storage 附件上传（统一直传与访问控制）

---

## 1. Amazon SES（事务邮件）

### 1.1 账号 & 区域
1. 登录 AWS 控制台（https://aws.amazon.com/）。
2. 建议选择与 Supabase 项目相同的区域（官方项目位于 `us-east-1`）。
3. 首次启用 SES 会进入 **Sandbox**，需完成域名验证后再申请生产权限。

### 1.2 验证发信域名
1. 进入 `SES → Verified identities → Create identity`，选择 **Domain**。
2. 输入主域名（如 `example.com`），勾选 “Generate DKIM settings”。
3. 将返回的 TXT/CNAME 记录添加到域名 DNS 服务商（Cloudflare、DNSPod 等），等待状态变为 `Verified`。

### 1.3 退出 Sandbox（生产额度申请）
1. 打开 `AWS Support Center → Create case → Service limit increase`。
2. 选择 `SES Sending Limits`，填写预计发送量、用途、内容类型（事务邮件）。
3. 通常 1～2 个工作日内收到审批结果。

### 1.4 创建 SMTP 凭证
1. `SES → SMTP settings → Create SMTP credentials`。
2. 记录生成的 **SMTP Username (Access Key)** 与 **SMTP Password (Secret Key)**，妥善存放。

### 1.5 Supabase Edge Function 环境变量
在 Supabase 项目或 `supabase/.env` 中新增（注意不要提交真实密钥）：

```
NOTIFY_SMTP_HOST=email-smtp.<region>.amazonaws.com
NOTIFY_SMTP_PORT=587
NOTIFY_SMTP_USER=<SES SMTP 用户名>
NOTIFY_SMTP_PASS=<SES SMTP 密码>
NOTIFY_FROM_EMAIL=noreply@example.com
```

- `NOTIFY_FROM_EMAIL` 必须是已验证域名下的邮箱。
- 完成配置后部署/触发 `task-notifier`，发送一封测试邮件确认收件箱可达。

### 1.6 监控
- CloudWatch Metrics 可追踪送达率、退信率、投诉率。
- 必要时可在 SNS 为关键指标配置报警。

---

## 2. Expo Push 通知

### 2.1 准备
1. Expo 项目升级到 SDK 49+（当前已使用 54）。
2. 已安装 `expo-notifications`，`app.config.ts` 中开启所需权限（iOS 需额外配置 `usesNonExemptEncryption` 等）。
3. 在 https://expo.dev/ 创建或确认项目，并获取 `projectId`（EAS 项目 ID，需写入 `EXPO_PUBLIC_EAS_PROJECT_ID` 环境变量）。

### 2.2 生成服务端 Access Token
1. `Expo Dashboard → Account Settings → Access Tokens → Create new token`。
2. 勾选 “Push Notifications: Send” 权限。
3. 将 Token 写入 Supabase Function 环境变量：

```
EXPO_ACCESS_TOKEN=<Expo Access Token>
```

（可额外配置 `EXPO_PUSH_URL`，默认 `https://exp.host/--/api/v2/push/send`）

### 2.3 客户端设备 token 采集
- `apps/mobile/src/features/notifications/usePushToken.ts` 会在登录后自动注册：
  - 请求通知权限 → 调用 `Notifications.getExpoPushTokenAsync({ projectId })`
  - 写入 `user_device_tokens` 表，记录平台/设备信息
  - 若权限被拒绝，展示友好提示
- 建议在 UI 中提供“重新登记通知”入口，用于手动刷新 token。

### 2.4 Edge Function 推送
`task-notifier/process.ts` 已支持：
- 读取 `EXPO_ACCESS_TOKEN`，按 90 个/批次推送到 Expo API。
- 记录失败日志，便于排查无效 token。
- 当后端取到任务提醒或审核事件时，同时下发邮件与推送。

### 2.5 调度与监控
- 通过 Edge Scheduler（5 分钟一次）拉取 `task_notification_queue`。
- 建议新增 `notification_logs` 表记录最终状态、失败原因。

---

## 3. Supabase Storage 附件

### 3.1 Bucket & 策略
1. `Supabase → Storage → Create bucket`，命名建议使用 `attachments`，类型选 **Private**。
2. 在 SQL Editor 中编写 RLS 策略，限制上传/读取范围（示例）：

```sql
create policy "org_members_can_upload"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and auth.role() = 'authenticated'
  and is_active_org_member(current_setting('request.org_id', true)::uuid, auth.uid())
);
```

可按业务需求扩展路径、角色、大小限制等逻辑。

### 3.2 Web API
新增两个 Next.js Route Handler：

- `POST /api/storage/sign-upload`
  - Body：`{ taskId, fileName, contentType, size }`
  - 验证组织成员身份 → 校验类型/尺寸 → 生成签名上传 URL

- `POST /api/storage/sign-download`
  - Body：`{ path }`
  - 解析路径中的组织/任务 → 验证权限 → 生成下载 URL

服务端使用 `SUPABASE_SERVICE_ROLE_KEY` 创建管理端客户端，实现更精细的校验。

### 3.3 客户端直传流程
1. 前端调用上述 API，取得 `signedUrl`。
2. 使用 `fetch` / `axios` 直接向 Supabase Storage 上传文件（PUT）。
3. 上传成功后，将文件元数据（路径、类型、大小）写入业务表，例如 `task_attachments`。
4. 下载时再调用 `sign-download` 获取临时链接。

### 3.4 配额与环境变量
新增/可选环境变量：

```
STORAGE_ATTACHMENTS_BUCKET=attachments
STORAGE_MAX_ATTACHMENT_SIZE=20971520        # 默认 20MB
STORAGE_ALLOWED_MIME_TYPES=image/png,image/jpeg,application/pdf,...
STORAGE_ALLOWED_MIME_PREFIXES=image/
```

依据套餐设定组织/成员的存储配额，并在后端定期汇总使用量。

### 3.5 迁移预案
- 统一命名：`org/{orgId}/task/{taskId}/{uuid-filename}`，便于批量迁移。
- 将存储操作封装成服务层，后续可平移到 Cloudflare R2 或 AWS S3。
- 迁移时仅需同步文件与更新配置，无需大幅改动业务代码。

---

## 4. 快速自检清单

| 项目 | 待确认 | 备注 |
| --- | --- | --- |
| SES 域名验证 | ✅/⬜ | DKIM 状态为 `Verified` |
| SES 生产配额 | ✅/⬜ | Support Case 已获批 |
| Edge SMTP 环境变量 | ✅/⬜ | `NOTIFY_SMTP_*`、`NOTIFY_FROM_EMAIL` |
| Expo Access Token | ✅/⬜ | `EXPO_ACCESS_TOKEN` 已填写 |
| 移动端 push 注册 | ✅/⬜ | 真机可获取 token，写入 `user_device_tokens` |
| Storage Bucket | ✅/⬜ | `attachments` 存在且为 Private |
| API 调试 | ✅/⬜ | 上传/下载签名接口返回 200 |

> 准备好上述参数后，可随时通知我继续完善代码或联调流程。若步骤中遇到权限或配置问题，也欢迎随时反馈。***
