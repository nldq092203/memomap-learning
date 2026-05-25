"""PDF book ingestion for DELF.

Three MCP tools layered on the existing draft pipeline:

- analyze_delf_book_pdf       (render pages, detect activities, build manifest)
- preview_delf_book_extraction (build DelfTestPaper candidates from manifest)
- save_delf_book_drafts        (validate, verify assets, save_or_update drafts)

State handoff between tools lives at
`backend/.local/delf-extracts/{analysis_id}/manifest.json`. Tools are
stateless across calls; each tool reads the manifest by ID.

PDF deps (pymupdf) are imported lazily inside `pdf_reader` so the rest of
the MCP server still loads when the optional dep isn't installed. Scanned
PDF support is handled by optional local `ocrmypdf` + Tesseract tooling.
"""
