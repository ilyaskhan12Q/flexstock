const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');
const prisma = require('../lib/prisma');

const generateBarcodePNG = async (req, res, next) => {
  try {
    const { value } = req.query;

    if (!value) {
      return res.status(400).json({ error: 'Barcode value parameter is required' });
    }

    bwipjs.toBuffer({
      bcid: 'code128',       // Barcode type
      text: value,           // Text to encode
      scale: 3,              // 3x scaling factor
      height: 12,            // Bar height, in millimeters
      includetext: true,     // Show human-readable text below barcode
      textxalign: 'center'   // Center-align the text
    }, (err, png) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to generate barcode image', details: err.message });
      }
      res.setHeader('Content-Type', 'image/png');
      res.send(png);
    });
  } catch (error) {
    next(error);
  }
};

const generateLabelPDF = async (req, res, next) => {
  try {
    const { products = [], template = '2x4' } = req.body; // array of { id, qty }

    if (products.length === 0) {
      return res.status(400).json({ error: 'No products specified for printing labels' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="barcode-labels.pdf"');

    doc.pipe(res);

    // Fetch products
    const productIds = products.map(p => p.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true }
    });

    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    // Layout configuration (based on template)
    let cols = 3;
    let width = 175;
    let height = 100;
    let gapX = 15;
    let gapY = 15;

    if (template === '3x5') {
      cols = 2;
      width = 260;
      height = 150;
      gapX = 20;
      gapY = 20;
    } else if (template === 'single') {
      cols = 1;
      width = 540;
      height = 300;
      gapX = 0;
      gapY = 0;
    }

    let x = 20;
    let y = 20;
    let col = 0;

    for (const item of products) {
      const prod = productMap.get(item.id);
      if (!prod) continue;

      const labelQty = parseInt(item.qty || 1);

      for (let q = 0; q < labelQty; q++) {
        // If we exceed page boundaries, insert page break
        if (y + height > 820) {
          doc.addPage();
          x = 20;
          y = 20;
          col = 0;
        }

        // Draw label border box
        doc.rect(x, y, width, height).stroke();

        // Print details inside label
        doc.fontSize(8).font('Helvetica-Bold').text(process.env.APP_NAME || 'FlexStock', x + 5, y + 8, { width: width - 10, align: 'center' });
        doc.fontSize(10).font('Helvetica').text(prod.name.substring(0, 30), x + 5, y + 20, { width: width - 10, align: 'center' });
        
        const priceText = `${process.env.CURRENCY_SYMBOL || 'PKR'} ${prod.price ? parseFloat(prod.price).toFixed(2) : '0.00'}`;
        doc.fontSize(9).font('Helvetica-Bold').text(priceText, x + 5, y + 33, { width: width - 10, align: 'center' });

        // Draw barcode placeholder text or generate barcode inline
        // Since generating multiple barcodes synchronously inside pdfkit page breaks is heavy,
        // we print a barcode code block and barcode value
        doc.fontSize(8).font('Helvetica').text(`SKU: ${prod.sku}`, x + 5, y + height - 25, { width: width - 10, align: 'center' });
        doc.fontSize(7).text(`* ${prod.barcodeValue || prod.sku} *`, x + 5, y + height - 15, { width: width - 10, align: 'center' });

        // Increment positioning
        col++;
        if (col >= cols) {
          col = 0;
          x = 20;
          y += height + gapY;
        } else {
          x += width + gapX;
        }
      }
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

const generateZPL = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const labelQty = parseInt(quantity);
    const priceText = `${process.env.CURRENCY_SYMBOL || 'PKR'} ${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}`;

    // Standard ZPL command construction
    const zpl = `
^XA
^CI28
^FO50,30^A0N,28,24^FB400,1,0,C^FD${process.env.APP_NAME || 'FlexStock'}^FS
^FO50,60^A0N,24,20^FB400,2,0,C^FD${product.name.substring(0, 36)}^FS
^FO50,110^A0N,26,22^FB400,1,0,C^FDPrice: ${priceText}^FS
^FO100,150^BY2,3,60
^BCN,60,Y,N,N
^FD${product.barcodeValue || product.sku}^FS
^PQ${labelQty}
^XZ
`.trim();

    res.json({ zpl });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateBarcodePNG,
  generateLabelPDF,
  generateZPL
};
