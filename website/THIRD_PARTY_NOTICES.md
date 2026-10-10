# OnlySkills third-party components

The OnlySkills cashbook is an additive integration, not a replacement application.

## Personal checklist module

`worker/checklist.js` adapts `$delegate` from [tastejs/todomvc](https://github.com/tastejs/todomvc/blob/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/examples/javascript-es6/src/helpers.js), fixed commit `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`, accessed 2026-10-10. Only event delegation is installed locally; TodoMVC's app, framework, storage, global prototype modifications, bulk completion and deletion are not included. Role-plan generation, subtasks, access checks, progress and D1 persistence are OnlySkills-specific. No extra npm runtime is necessary for this source-only integration.

### TodoMVC MIT License

Copyright (c) Addy Osmani, Sindre Sorhus, Pascal Hartig, Stephen Sawchuk.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Receipt bookkeeping dependencies

- Adapted browser preprocessing/OCR workflow from [anupshah/receipt-scanner](https://github.com/anupshah/receipt-scanner), `src/ocr.ts`, accessed 2026-10-10. Changed to bounded pixel memory, selectable OCR language, explicit timeout/retry, conservative MYR parsing, and server-side D1/R2 persistence. No UK VAT or tax-filing code is included.
- Installed `tesseract.js` 7.0.0, Apache-2.0, and `pdfjs-dist` 5.5.207, Apache-2.0. Their installed license texts and browser-bundle notices are included in the build and served at `/assets/bookkeeping-licenses.txt`. Tesseract WASM/language models use the upstream version-pinned public CDN; only model assets are fetched, not uploaded receipt images.
- Ledger, access-control, and CSV integration are OnlySkills-specific code. This captures reviewed cash transactions; it does not implement tax filing, bank reconciliation, or full double-entry accounts.

## Receipt Scanner MIT license

Copyright (c) 2026 Receipt Scanner Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
