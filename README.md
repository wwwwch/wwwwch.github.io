# LeetCode 笔记静态索引

根目录的 `index.html` 会读取 `html/notes.json`，按题号展示 `html/` 文件夹里的 HTML 笔记，并跳转到对应页面。

新增或修改笔记后，运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-notes-index.ps1
```

脚本会扫描 `html/*.html`，从每个文件的 `<title>` 读取标题，并生成新的 `html/notes.json`。

静态托管时，把 `index.html`、`html/`、`scripts/` 和 `README.md` 一起提交即可。实际访问只依赖 `index.html` 与 `html/`。
