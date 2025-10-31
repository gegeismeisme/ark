# 通知与存储集成操作指南

本文档记录实现 “Amazon SES 邮件通知 + Expo Push 推送 + Supabase Storage 附件存储” 的详细步骤，方便提前准备所需的账号、密钥与基础配置。

---

## 一、Amazon SES（事务邮件）

### 1. 注册与区域选择
- 登录 AWS 控制台（https://aws.amazon.com/）。
- 建议选择与 Supabase 项目相近的区域（Supabase 托管在 AWS us-east-1，可优先选该区域）。  
- 首次启用 SES，会处于 **Sandbox** 模式，需要完成域名验证后申请生产权限。

### 2. 验证发信域名
1. 在 SES 控制台选择 `Verified identities` → `Create identity` → 选择 **Domain**。
2. 输入主域名（例如 `example.com`），勾选 “Generate DKIM settings”。  
3. SES 返回 3~5 条 TXT/CNAME 记录，将其添加到域名 DNS 服务商（Cloudflare、DNSpod 等）。  
4. DNS 生效后，SES 控制台会自动将状态更新为 `Verified`。

### 3. 申请生产配额（退出 Sandbox）
1. 打开 AWS Support Center → Create case → Service limit increase。  
2. 选择 `SES Sending Limits`，填写预估发送量、用途、内容类型（事务邮件）。  
3. 一般 1–2 个工作日收到审批通过通知。

### 4. 创建 SMTP 凭证
1. 在 SES 控制台点击 `SMTP settings` → `Create SMTP credentials`。  
2. 填写用户名（AWS 会创建一个 IAM 用户），记录生成的 **Access Key ID** 与 **Secret Access Key**。  
3. 将凭证保存到安全的环境变量管理器。

### 5. 在 Supabase Edge Function 中配置
- 在 `supabase/.env` 或 Supabase 项目环境变量中新增：
  ```
  NOTIFY_SMTP_HOST=email-smtp.<region>.amazonaws.com
  NOTIFY_SMTP_PORT=587
  NOTIFY_SMTP_USER=<SES SMTP 用户名 (Access Key)>
  NOTIFY_SMTP_PASS=<SES SMTP 密码 (Secret Key)>
  NOTIFY_FROM_EMAIL=notify@example.com
  ```
- `NOTIFY_FROM_EMAIL` 必须是已验证域名下的邮箱（可使用 `noreply@domain.com`）。
- 部署 `task-notifier` Edge Function 后，执行一次测试任务确认收件箱能收到邮件。

### 6. 监控与优化
- SES 提供 CloudWatch Metrics，可以监控送达、退信、投诉率。
- 可为关键指标设置 SNS 通知。
- 若需要模板管理，可结合 AWS Pinpoint 或使用第三方渲染服务。

---

## 二、Expo Push 推送

### 1. 准备工作
- 确保 Expo 项目已升级至 SDK 49+（当前已使用 SDK 54）。
- 安装 `expo-notifications`（项目里已存在）。
- 在 Expo Dashboard 上创建或确认项目（https://expo.dev/）。

### 2. 获取 Access Token（用于服务器推送）
1. 在 Expo Dashboard → Account Settings → `Access Tokens` → `Create new token`。  
2. 赋予 “Push Notifications: Send” 权限。  
3. 将 Token 存入 Supabase Edge Function 环境变量：
   ```
   EXPO_ACCESS_TOKEN=<Expo 服务端访问令牌>
   ```

### 3. 客户端采集设备 token
- 移动端 `usePushToken` 已基础接入，后续需要：
  - 请求通知权限（iOS 需在 `app.config.ts` 中开启 `ios.config.usesNonExemptEncryption=false` 等设置）。
  - 调用 `Notifications.getExpoPushTokenAsync()`，将 token 上传到 Supabase（存储在 `user_devices` 或 `notification_endpoints` 表）。
  - 支持退订：提供设置入口，调用 `Notifications.removePushTokenListener`。

### 4. Edge Function 触发推送
- 在 `task-notifier/process.ts` 中增加 Expo 推送逻辑：
  ```ts
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: deviceToken,
      title: '新任务提醒',
      body: '您有新的任务待处理。',
      data: { taskId },
    }),
  });
  ```
- 处理返回结果中的 `status`, `message`，失败时记录日志并重试。

### 5. 调度与监控
- 使用 Edge Scheduler 每 5 分钟触发一次检查。
- 将推送记录写入 `task_notification_queue` 或单独的 `notification_logs` 表，便于追踪送达情况。

---

## 三、Supabase Storage（附件存储）

### 1. 启用 Storage
- 在 Supabase Dashboard → `Storage` → `Create new bucket`，命名如 `attachments`。  
- 根据需要选择 **Private**（推荐，结合签名 URL）或 **Public**。

### 2. 设置访问策略（RLS）
- 在 SQL Editor 中创建策略，示例：
  ```sql
  create policy "org_members_can_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.role() = 'authenticated'
    and is_active_org_member(current_setting('request.org_id', true)::uuid, auth.uid())
  );
  ```
- 也可根据组织 ID、任务 ID 做路径前缀校验，确保成员只能访问自己组织的文件。

### 3. 前端直传流程
1. Web/Mobile 获取预签名 URL：调用 Supabase Client
   ```ts
   const { data, error } = await supabase.storage
     .from('attachments')
     .createSignedUploadUrl('org/<orgId>/task/<taskId>/<filename>');
   ```
2. 前端使用返回的 URL 上传文件（`fetch` PUT），完成后保存文件元数据到数据库（大小、类型、所属任务）。
3. 读取时同理，使用 `createSignedUrl` 生成临时访问链接。

### 4. 配额与限制
- 在业务配置中为组织/用户设定：
  - 单文件最大大小（如 20MB）。
  - 总存储配额（例如基础版 1GB）。
  - 允许的 MIME 类型（图片、PDF、Office 文档等）。
- 可以在 `task_attachments` 表中记录 `size` 字段，定期汇总统计。

### 5. 迁移预案（可选）
- 保持文件命名规范：`org/{orgId}/task/{taskId}/{uuid-filename}`。
- 抽象存储服务模块，使“上传/下载/删除”逻辑可被不同驱动实现（Supabase Storage、Cloudflare R2、AWS S3）。
- 若后续迁移，只需替换驱动与配置，批量复制历史文件即可。

---

## 四、执行顺序建议
1. **SES 配置 → Edge Function 发信测试**（确保邮件可达）。  
2. **Expo Push Token 落库 → Edge Function 推送**（至少完成一轮真机调试）。  
3. **Supabase Storage 直传 → 任务附件 UI**（示范上传 1–2 种文件类型）。  
4. 配置监控与预警，确认失败重试策略（实体表新增 `status` 字段，记录发送结果）。

完成以上准备后，即可开始在代码中实现具体功能。若执行过程中需要协助，可随时反馈。***
