const path = require('path');
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = require('docx');

async function createDocx(targetPath, pages = 60) {
  // Prepare document children (content)

  const children = [];

  children.push(new Paragraph({
    text: "软著材料（样本）",
    heading: HeadingLevel.TITLE,
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: "版本：样本 1.0", size: 28 })],
  }));
  children.push(new Paragraph({
    children: [new TextRun("仅用于版式占位，无具体内容要求")],
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  for (let i = 1; i <= pages; i++) {
    children.push(new Paragraph({
      text: `第 ${i} 页`,
      heading: HeadingLevel.HEADING_2,
    }));

    for (let line = 1; line <= 30; line++) {
      children.push(new Paragraph(`占位内容 第${i}页 - 行${line}`));
    }

    if (i < pages) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Build document using sections API
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(targetPath, buffer);
}

(async () => {
  const outPath = path.resolve(process.cwd(), "软著_样本_60页.docx");
  await createDocx(outPath, 60);
  console.log(outPath);
})();
