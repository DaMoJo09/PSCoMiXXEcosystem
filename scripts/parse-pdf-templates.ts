import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath = path.resolve(__dirname, '../attached_assets/Blank-Comic-Book-Templates_1765504857998.pdf');
const outputPath = path.resolve(__dirname, '../client/src/data/pdf-templates.json');

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExtractedTemplate {
  id: string;
  name: string;
  category: string;
  panels: PanelRect[];
  pageNumber: number;
}

async function parsePDF(): Promise<void> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  console.log('Loading PDF from:', pdfPath);
  
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  
  console.log(`PDF loaded successfully. Total pages: ${pdf.numPages}`);
  
  const extractedTemplates: ExtractedTemplate[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    console.log(`\n--- Processing page ${pageNum} ---`);
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    
    console.log(`Page dimensions: ${pageWidth} x ${pageHeight}`);
    
    const operatorList = await page.getOperatorList();
    const ops = operatorList.fnArray;
    const args = operatorList.argsArray;
    
    const allPoints: { x: number; y: number }[] = [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    let currentPath: { x: number; y: number }[] = [];
    let lastPoint: { x: number; y: number } | null = null;
    
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const arg = args[i];
      
      if (op === pdfjsLib.OPS.constructPath) {
        const pathOps = arg[0] as number[];
        const pathArgs = arg[1] as number[];
        
        let argIdx = 0;
        for (let j = 0; j < pathOps.length; j++) {
          const pathOp = pathOps[j];
          
          if (pathOp === pdfjsLib.OPS.moveTo) {
            const x = pathArgs[argIdx];
            const y = pathArgs[argIdx + 1];
            argIdx += 2;
            lastPoint = { x, y };
            currentPath = [{ x, y }];
            allPoints.push({ x, y });
          } else if (pathOp === pdfjsLib.OPS.lineTo) {
            const x = pathArgs[argIdx];
            const y = pathArgs[argIdx + 1];
            argIdx += 2;
            if (lastPoint) {
              lines.push({ x1: lastPoint.x, y1: lastPoint.y, x2: x, y2: y });
            }
            lastPoint = { x, y };
            currentPath.push({ x, y });
            allPoints.push({ x, y });
          } else if (pathOp === pdfjsLib.OPS.rectangle) {
            const x = pathArgs[argIdx];
            const y = pathArgs[argIdx + 1];
            const w = pathArgs[argIdx + 2];
            const h = pathArgs[argIdx + 3];
            argIdx += 4;
            lines.push({ x1: x, y1: y, x2: x + w, y2: y });
            lines.push({ x1: x + w, y1: y, x2: x + w, y2: y + h });
            lines.push({ x1: x + w, y1: y + h, x2: x, y2: y + h });
            lines.push({ x1: x, y1: y + h, x2: x, y2: y });
            allPoints.push({ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h });
          } else if (pathOp === pdfjsLib.OPS.curveTo || pathOp === pdfjsLib.OPS.curveTo2 || pathOp === pdfjsLib.OPS.curveTo3) {
            argIdx += 6;
          } else if (pathOp === pdfjsLib.OPS.closePath) {
            if (currentPath.length > 1) {
              const first = currentPath[0];
              const last = currentPath[currentPath.length - 1];
              lines.push({ x1: last.x, y1: last.y, x2: first.x, y2: first.y });
            }
          }
        }
      }
    }
    
    console.log(`Found ${lines.length} line segments, ${allPoints.length} points`);
    
    const horizontalLines = lines.filter(l => Math.abs(l.y1 - l.y2) < 2 && Math.abs(l.x2 - l.x1) > 30);
    const verticalLines = lines.filter(l => Math.abs(l.x1 - l.x2) < 2 && Math.abs(l.y2 - l.y1) > 30);
    
    console.log(`Horizontal lines: ${horizontalLines.length}, Vertical lines: ${verticalLines.length}`);
    
    const uniqueYs = [...new Set(horizontalLines.map(l => Math.round(l.y1)))].sort((a, b) => a - b);
    const uniqueXs = [...new Set(verticalLines.map(l => Math.round(l.x1)))].sort((a, b) => a - b);
    
    console.log(`Unique Y positions: ${uniqueYs.join(', ')}`);
    console.log(`Unique X positions: ${uniqueXs.join(', ')}`);
    
    const panels: PanelRect[] = [];
    
    if (uniqueYs.length >= 2 && uniqueXs.length >= 2) {
      for (let yi = 0; yi < uniqueYs.length - 1; yi++) {
        for (let xi = 0; xi < uniqueXs.length - 1; xi++) {
          const x1 = uniqueXs[xi];
          const x2 = uniqueXs[xi + 1];
          const y1 = uniqueYs[yi];
          const y2 = uniqueYs[yi + 1];
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          if (width > 30 && height > 30 && width < pageWidth * 0.98 && height < pageHeight * 0.98) {
            const hasTop = horizontalLines.some(l => 
              Math.abs(l.y1 - y1) < 5 && 
              Math.min(l.x1, l.x2) <= x1 + 5 && 
              Math.max(l.x1, l.x2) >= x2 - 5
            );
            const hasBottom = horizontalLines.some(l => 
              Math.abs(l.y1 - y2) < 5 && 
              Math.min(l.x1, l.x2) <= x1 + 5 && 
              Math.max(l.x1, l.x2) >= x2 - 5
            );
            const hasLeft = verticalLines.some(l => 
              Math.abs(l.x1 - x1) < 5 && 
              Math.min(l.y1, l.y2) <= y1 + 5 && 
              Math.max(l.y1, l.y2) >= y2 - 5
            );
            const hasRight = verticalLines.some(l => 
              Math.abs(l.x1 - x2) < 5 && 
              Math.min(l.y1, l.y2) <= y1 + 5 && 
              Math.max(l.y1, l.y2) >= y2 - 5
            );
            
            if ((hasTop || hasBottom) && (hasLeft || hasRight)) {
              panels.push({
                x: Math.round((x1 / pageWidth) * 100 * 10) / 10,
                y: Math.round(((pageHeight - y2) / pageHeight) * 100 * 10) / 10,
                width: Math.round((width / pageWidth) * 100 * 10) / 10,
                height: Math.round((height / pageHeight) * 100 * 10) / 10
              });
            }
          }
        }
      }
    }
    
    if (panels.length === 0 && uniqueXs.length >= 2 && uniqueYs.length >= 2) {
      const margin = 30;
      const contentXs = uniqueXs.filter(x => x > margin && x < pageWidth - margin);
      const contentYs = uniqueYs.filter(y => y > margin && y < pageHeight - margin);
      
      if (contentXs.length >= 2 || contentYs.length >= 2) {
        const xBounds = contentXs.length >= 2 ? contentXs : [margin, pageWidth - margin];
        const yBounds = contentYs.length >= 2 ? contentYs : [margin, pageHeight - margin];
        
        for (let yi = 0; yi < yBounds.length - 1; yi++) {
          for (let xi = 0; xi < xBounds.length - 1; xi++) {
            const x1 = xBounds[xi];
            const x2 = xBounds[xi + 1];
            const y1 = yBounds[yi];
            const y2 = yBounds[yi + 1];
            
            const width = x2 - x1;
            const height = y2 - y1;
            
            if (width > 50 && height > 50) {
              panels.push({
                x: Math.round((x1 / pageWidth) * 100 * 10) / 10,
                y: Math.round(((pageHeight - y2) / pageHeight) * 100 * 10) / 10,
                width: Math.round((width / pageWidth) * 100 * 10) / 10,
                height: Math.round((height / pageHeight) * 100 * 10) / 10
              });
            }
          }
        }
      }
    }
    
    panels.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
      return a.y - b.y;
    });
    
    console.log(`Detected ${panels.length} panels`);
    
    if (panels.length > 0 && panels.length <= 12) {
      const panelCount = panels.length;
      let category = 'pdf';
      
      extractedTemplates.push({
        id: `pdf_page_${pageNum}`,
        name: `PDF Layout ${pageNum} (${panelCount}p)`,
        category: category,
        panels: panels,
        pageNumber: pageNum
      });
      
      console.log(`Created template with ${panelCount} panels`);
      panels.forEach((p, idx) => {
        console.log(`  Panel ${idx + 1}: x=${p.x}%, y=${p.y}%, w=${p.width}%, h=${p.height}%`);
      });
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total templates extracted: ${extractedTemplates.length}`);
  
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(extractedTemplates, null, 2));
  console.log(`Templates saved to: ${outputPath}`);
  
  if (extractedTemplates.length > 0) {
    const templateCode = extractedTemplates.map(t => {
      const panelsStr = t.panels.map(p => 
        `{x:${p.x},y:${p.y},width:${p.width},height:${p.height}}`
      ).join(',');
      return `  { id: "${t.id}", name: "${t.name}", category: "pdf", panels: [${panelsStr}] },`;
    }).join('\n');
    
    console.log('\n=== COPY THIS TO panelTemplates ARRAY ===\n');
    console.log('  // PDF-Extracted Templates');
    console.log(templateCode);
  } else {
    console.log('\nNo templates could be extracted. The PDF may use:');
    console.log('- Rasterized images instead of vector graphics');
    console.log('- Complex path structures that don\'t form simple rectangles');
    console.log('- Embedded graphics that require image analysis');
  }
}

parsePDF().catch(err => {
  console.error('Error parsing PDF:', err);
  process.exit(1);
});
