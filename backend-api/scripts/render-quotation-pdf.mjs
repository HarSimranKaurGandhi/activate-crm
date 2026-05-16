import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const [, , htmlPath, pdfPath] = process.argv;

if (!htmlPath || !pdfPath) {
  console.error('Usage: node render-quotation-pdf.mjs <input.html> <output.pdf>');
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage({
    viewport: { width: 820, height: 1160 },
    deviceScaleFactor: 1,
  });

  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'networkidle',
  });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
  });
} finally {
  await browser.close();
}
