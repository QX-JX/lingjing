const path = require('path');
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = require('docx');

function collectFiles(root) {
  const targets = [];
  function walk(dir) {
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of ents) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        // skip node_modules and build artifacts
        if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('release')) continue;
        walk(p);
      } else {
        if (/\.(ts|tsx|js|cjs|py)$/.test(ent.name)) {
          targets.push(p);
        }
      }
    }
  }
  walk(root);
  return targets;
}

function readLines(filepath) {
  try {
    const stats = fs.statSync(filepath);
    if (stats.size > 100 * 1024) { // skip files larger than 100KB
      console.log(`Skipping large file: ${filepath} (${stats.size} bytes)`);
      return [];
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return content.replace(/\r\n/g, '\n').split('\n');
  } catch {
    return [];
  }
}

async function createDocx(targetPath, pages = 60, linesPerPage = 45) {
  console.log("Starting docx generation...");
  const children = [];

  children.push(new Paragraph({ text: "项目主要代码（摘录）", heading: HeadingLevel.TITLE }));
  children.push(new Paragraph({ text: "仅用于软著版式，占满至 60 页" }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  const roots = [
    path.resolve(process.cwd(), 'tauri-app', 'electron'),
    path.resolve(process.cwd(), 'tauri-app', 'src'),
    path.resolve(process.cwd(), 'python'),
  ];

  let files = [];
  for (const r of roots) {
    if (fs.existsSync(r)) files = files.concat(collectFiles(r));
  }
  console.log(`Collected ${files.length} candidate files.`);

  // prioritize important files
  const priorityOrder = [
    path.resolve(process.cwd(), 'tauri-app', 'electron', 'main.cjs'),
    path.resolve(process.cwd(), 'tauri-app', 'src', 'services', 'ttsService.ts'),
    path.resolve(process.cwd(), 'tauri-app', 'src', 'utils', 'textProcessor.ts'),
    path.resolve(process.cwd(), 'tauri-app', 'src', 'components', 'TextEditor.tsx'),
    path.resolve(process.cwd(), 'tauri-app', 'src', 'components', 'Toolbar.tsx'),
    path.resolve(process.cwd(), 'tauri-app', 'src', 'components', 'Header.tsx'),
    path.resolve(process.cwd(), 'tauri-app', 'electron', 'ttsService.cjs'),
    path.resolve(process.cwd(), 'tauri-app', 'src', 'store', 'useAppStore.ts'),
    path.resolve(process.cwd(), 'python', 'tts_wrapper.py'),
  ];

  const set = new Set(files);
  const ordered = [];
  for (const p of priorityOrder) {
    if (set.has(p)) {
      ordered.push(p);
      set.delete(p);
    }
  }
  ordered.push(...Array.from(set));

  let currentPage = 1;
  let lineCountOnPage = 0;
  let totalLinesProcessed = 0;
  const MAX_TOTAL_LINES = pages * linesPerPage + 100; // Safety cap

  function addLine(text) {
    // Truncate overly long lines
    if (text.length > 200) text = text.substring(0, 200) + "...";
    
    const run = new TextRun({ text, font: 'Consolas', size: 20 });
    children.push(new Paragraph({ children: [run] }));
    lineCountOnPage++;
    if (lineCountOnPage >= linesPerPage) {
      if (currentPage < pages) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        currentPage++;
        lineCountOnPage = 0;
        console.log(`Generated page ${currentPage}/${pages}`);
      }
    }
  }

  for (const file of ordered) {
    if (currentPage >= pages && lineCountOnPage >= linesPerPage) break;
    
    console.log(`Processing file: ${path.relative(process.cwd(), file)}`);
    children.push(new Paragraph({
      text: path.relative(process.cwd(), file),
      heading: HeadingLevel.HEADING_2,
    }));
    lineCountOnPage += 2; // Heading takes space

    const lines = readLines(file);
    for (const l of lines) {
      if (currentPage >= pages && lineCountOnPage >= linesPerPage) break;
      addLine(l);
      totalLinesProcessed++;
    }
    
    // global memory safety check (though not precise)
    if (children.length > 5000) {
        console.log("Reached safety limit for paragraph count.");
        break;
    }
  }

  console.log(`Finished processing files. Current page: ${currentPage}, Total paragraphs: ${children.length}`);

  while (currentPage <= pages) {
    addLine('');
    if (lineCountOnPage === 0) { // Check if addLine triggered a page break
       // loop continues
    } else {
       // manually force page progress if addLine didn't (e.g. last page filling)
       // actually addLine handles page increment.
       // We just need to make sure we don't loop forever if page is full but not incremented
    }
    
    // Safety break for filling
    if (children.length > 10000) break;
  }
  
  console.log("Building docx object...");
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  console.log("Packing to buffer...");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(targetPath, buffer);
  console.log("Done.");
}

(async () => {
  const outPath = path.resolve(process.cwd(), "软著_代码_60页.docx");
  await createDocx(outPath, 60, 45);
  console.log(outPath);
})();
