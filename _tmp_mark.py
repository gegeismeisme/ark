from pathlib import Path
text = Path("更新计划.md").read_text(encoding="utf-8")
for idx, line in enumerate(text.splitlines()):
    if "OrgSwitcher" in line or "Toast/Badge" in line or "Dexie" in line:
        print(idx, line)
