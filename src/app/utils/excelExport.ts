import { strToU8, zipSync } from 'fflate';

type Cell = string | number;
export type WorkbookImage = { row: number; column: number; data: Uint8Array; width: number; height: number };

export async function prepareWorkbookImage(blob: Blob): Promise<Omit<WorkbookImage, 'row' | 'column'>> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(130 / bitmap.width, 110 / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare image');
    context.drawImage(bitmap, 0, 0, width, height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to encode image')), 'image/png'));
    return { data: new Uint8Array(await png.arrayBuffer()), width, height };
  } finally { bitmap.close(); }
}
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const column = (index: number): string => {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label;
  return label;
};

/** Store all text as literal cells, including text beginning with =, +, - or @. */
export function createItemWorkbook(rows: Cell[][], images: WorkbookImage[] = []): Uint8Array {
  const sheetRows = rows.map((row, index) => `<row r="${index + 1}"${index > 0 && rows[0].includes('Image') ? ' ht="90" customHeight="1"' : ''}>${row.map((value, col) => {
    const ref = `${column(col)}${index + 1}`;
    const style = index === 0 ? 1 : typeof value === 'number' ? 2 : 0;
    return typeof value === 'number' && Number.isFinite(value)
      ? `<c r="${ref}" s="${style}"><v>${value}</v></c>`
      : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(String(value).slice(0, 32767))}</t></is></c>`;
  }).join('')}</row>`).join('');
  const lastColumn = column(rows[0].length - 1);
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Quotation Items" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.###"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${ns}"><dimension ref="A1:${lastColumn}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${rows[0].map((header, index) => `<col min="${index + 1}" max="${index + 1}" width="${['Specifications', 'Additional Information', 'Item'].includes(String(header)) ? 45 : 20}" customWidth="1"/>`).join('')}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastColumn}${rows.length}"/></worksheet>`,
  };
  const binaryFiles: Record<string, Uint8Array> = {};
  if (images.length) {
    files['[Content_Types].xml'] = files['[Content_Types].xml'].replace('</Types>', '<Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
    files['xl/worksheets/sheet1.xml'] = files['xl/worksheets/sheet1.xml'].replace('</worksheet>', '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></worksheet>');
    files['xl/worksheets/_rels/sheet1.xml.rels'] = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>';
    files['xl/drawings/_rels/drawing1.xml.rels'] = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i + 1}.png"/>`).join('')}</Relationships>`;
    files['xl/drawings/drawing1.xml'] = `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${images.map((image, i) => {
      binaryFiles[`xl/media/image${i + 1}.png`] = image.data;
      const cx = image.width * 9525, cy = image.height * 9525;
      return `<xdr:oneCellAnchor><xdr:from><xdr:col>${image.column}</xdr:col><xdr:colOff>47625</xdr:colOff><xdr:row>${image.row}</xdr:row><xdr:rowOff>47625</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 1}" name="Product image ${i + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId${i + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }).join('')}</xdr:wsDr>`;
  }
  return zipSync({ ...Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)])), ...binaryFiles });
}

export function downloadItemWorkbook(rows: Cell[][], name: string, images: WorkbookImage[] = []) {
  const bytes = createItemWorkbook(rows, images);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'quotation'}-items.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
