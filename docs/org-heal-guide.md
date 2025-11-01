# 组织数据修复指南

> 适用于在早期版本中出现的“组织已创建但 owner 未加入 / 默认小组缺失”等数据异常场景。

## 1. 新函数简介

迁移 `0018_org_autofix.sql` 提供了 `heal_orphan_organizations()` RPC。  
它会逐个检查所有未删除的组织，自动完成以下修复：

- 如果 owner 不在 `organization_members` 中，补上一条 `owner / active` 记录。  
- 如果组织没有任何小组，则创建一个 `General` 小组。  
- 如果 owner 不在默认小组中，补上一条 `admin / active` 小组成员记录。

函数返回每个组织的处理结果：

| 字段 | 含义 |
| ---- | ---- |
| `organization_id` | 组织 ID |
| `fixed_owner_membership` | 是否补齐 owner 成员 |
| `created_default_group` | 是否新建默认小组 |
| `fixed_group_membership` | 是否补齐 owner 小组成员 |

## 2. 手动修复步骤

1. 确保数据库已应用迁移 `0015` ~ `0018`：  
   ```bash
   pnpm exec supabase db push
   ```

2. 登录 Supabase SQL Editor，执行：
   ```sql
   select * from heal_orphan_organizations();
   ```

3. 查看返回结果：  
   - 如果所有标志均为 `false`，说明没有需要修复的记录。  
   - 如果有 `true`，表示该组织已自动修复成功。

4. 建议在执行后检查相关组织的成员 / 小组页面确认数据无误。

## 3. 注意事项

- 函数默认以 `security definer` 执行，普通用户无法直接调用。如需在应用中触发，可另行编写 Edge Function 或仅通过 SQL 工具执行。  
- 修复过程中不会删除任何记录，只做“补齐”操作。  
- 建议在大规模数据修复前先备份数据库。

---

如后续遇到新类型的“孤儿数据”，可在本函数基础上继续扩展补齐逻辑。***
