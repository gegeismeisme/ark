# QA Checklist（阶段性）

> 用于每次构建后的快速验证，确保核心功能正常。可根据迭代持续补充。

## 1. 账号 & 组织
- [ ] 使用新邮箱注册账号，完成邮箱验证后能够登录。
- [ ] 登录后创建组织：  
  - 成功调用 `bootstrap_organization` RPC，页面跳转至仪表盘。  
  - 组织成员列表出现当前用户（owner），默认小组已创建。
- [ ] 旧账号再次登录不会重复创建组织。

## 2. 成员与标签
- [ ] 在 Web 端邀请成员，链接可打开并成功加入。  
- [ ] 加入申请：成员提交申请，管理员可查看 / 审批。  
- [ ] 标签管理：创建类别与标签，设置成员标签，任务指派时可过滤。

## 3. 任务全流程
- [ ] Web 端创建任务（含截止时间、指派成员）。  
- [ ] 成员接收任务，执行状态切换（待开始 → 进行中 → 已完成）。  
- [ ] 管理员审核任务：通过 / 驳回均可生效。  
- [ ] 邮件通知：执行上述操作时能收到来自 SES 的提醒邮件。
- [ ] 移动端任务列表与状态同步更新（Zustand store 正常）。

## 4. 附件 / 存储
- [ ] 调用 `/api/storage/sign-upload` 生成上传签名。  
- [ ] 使用签名 URL 上传文件成功（HTTP 200/204）。  
- [ ] 调用 `/api/storage/sign-download` 获取临时链接并可访问。  
- [ ] Supabase `storage.objects` 中记录路径 `org/<orgId>/task/<taskId>/...`。
> 注：UI 层的附件上传/展示尚未完成，当前主要验证 API 与存储策略。

## 5. 通知与推送
- [ ] `task_notification_queue` 中插入测试记录，Edge Scheduler / 手动调用可触发 `task-notifier`。  
- [ ] 邮件部分可正常发送（查看日志 / 邮件收件箱）。  
- [ ] 移动端安装 APK，登录后显示“推送未配置”的友好提示，不会闪退。  
- [ ] `user_device_tokens` 表不会新增记录（预期行为，等待 FCM 配置）。

## 6. 移动端构建
- [ ] Preview / Production APK 可安装并登录成功。  
- [ ] 核心页面（任务列表、标签、邀请）加载正常。  
- [ ] 退出登录、重新登录流程正常。  
- [ ] 若调试 Dev Client，`npx expo start --dev-client` 可连接。

## 7. 管理报表 / 分析
- [ ] `/dashboard/analytics` 能加载统计数据，无报错。  
- [ ] 组织切换（OrgSwitcher）正常，成员 / 任务数据随组织变更。

## 8. 运维与文档
- [ ] `pnpm --filter web lint`、`pnpm --filter mobile test` 通过。  
- [ ] 迁移脚本执行记录：最新 `0015` ~ `0017` 均已应用。  
- [ ] 环境变量：Web / Mobile / Supabase Secrets / EAS Secrets 与文档一致。  
- [ ] 计划文档《docs/MVP-task-plan.md》更新至最新状态。  
- [ ] 测试流程记录在《docs/manual-test-notifications-storage.md》，必要时更新。

---

若遇到异常，先记录：  
1. 发生时间、环境（dev/preview/production）。  
2. 重现步骤。  
3. 浏览器控制台 / Supabase 日志 / Edge Function 日志。  
4. 是否影响核心流程。  

确认修复后，在此清单对勾并补充备注。***
