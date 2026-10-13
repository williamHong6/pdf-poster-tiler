# PDF Poster Tiler · 海报分割打印

An offline browser tool that splits large PDFs into printable sheets while preserving their original physical size. Upload a PDF, select **11 × 17 inches**, and download a new multi-page PDF with safe margins, glue overlaps, trimming ticks, and assembly labels.

无需安装或服务器。双击 `index.html`，上传大 PDF，选择纸张，即可下载分割后的打印 PDF。

## Use

1. Download this repository as a ZIP and extract it, or clone it.
2. Open `index.html` in Chrome, Safari, Edge, or Firefox. Keep the `vendor/` folder alongside it.
3. Select or drag in a PDF. The tool reads each page's actual dimensions.
4. Choose the paper size and click the generate button.
5. Print the generated PDF at **Actual size / 100%, single-sided**. Disable “Fit to page” and multiple pages per sheet.

Everything runs locally. PDFs are never uploaded, and the source file is not modified. The PDF engine is bundled, so internet access is not required.

## Features

- Tabloid **11 × 17 in**, Letter **8.5 × 11 in**, A3, and A4.
- Automatic orientation selection to minimize the number of sheets; manual portrait/landscape overrides.
- Full-size vector PDF output, preserving sharp text and graphics instead of rasterizing them.
- Multi-page source PDFs; crop-box origins, right-angle page rotation, and PDF `UserUnit` support.
- Default **0.5 in / 12.7 mm** printer safety margins and **0.4 in / 10.16 mm** repeated-image overlap.
- Separate gutters for trimming ticks and page labels.
- Alignment crosses placed only in overlap areas that will be trimmed away or covered.
- Optional assembly-map pages; a lightweight grid preview in the app.
- All sheets combined into one PDF, with source-page and row/column labels.
- No network calls or external runtime dependencies.

## Assemble

Work left to right, then top to bottom: `R1 C1`, `R1 C2`, and so on. Trim the left/top edges at the matching ticks; retain the right/bottom overlap underneath neighboring sheets. Align repeated artwork and registration crosses, then tape or glue the sheets.

The browser cannot detect a printer's hardware margins. The default is conservative; increase it in Advanced Settings if your printer requires more clearance. Printed sheet counts include these margins, mark gutters, and glue overlaps—not just the nominal paper dimensions.

## Development

The app uses plain HTML, CSS, and JavaScript. No build step is needed.

```sh
npm test
```

Node.js 18+ is needed only for tests. Tests cover physical size, rotated pages, non-zero crop origins, `UserUnit`, overlap coverage, output paper dimensions, optional assembly pages, and one-sheet documents. Generated test PDFs are ignored by Git.

| File | Purpose |
| --- | --- |
| `index.html` | Chinese-language interface |
| `app.js` | File handling, preview, and download |
| `tiler.js` | Vector PDF tiling and print geometry |
| `vendor/pdf-lib.min.js` | Bundled PDF engine |
| `tests/verify.cjs` | PDF geometry regression checks |
| `使用说明.txt` | Detailed Chinese instructions |

## Limits

Password-protected PDFs must first be exported as an unencrypted copy. Output is capped at 500 artwork sheets per operation to protect browser memory. Interactive annotations and form appearances should be flattened in the source PDF before tiling.

## License

MIT. The bundled [pdf-lib](https://pdf-lib.js.org/) engine is also MIT licensed; its original license is retained in `vendor/LICENSE-pdf-lib.md`.
