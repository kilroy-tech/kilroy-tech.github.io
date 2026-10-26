from pathlib import Path


def on_page_markdown(markdown, page, config, files):
    if page.file.src_uri == "index.md":
        inapp_home = Path(config.docs_dir) / "inapp-home.md"
        return inapp_home.read_text(encoding="utf-8")
    return markdown
