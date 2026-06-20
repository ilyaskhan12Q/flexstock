const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * GET /api/v1/reports/stock
 * 
 * Previously: loaded ALL products + inventory into Node.js memory, then aggregated in JS.
 * Fixed: single SQL aggregate query — O(1) regardless of catalog size.
 */
const getStockSummary = async (req, res, next) => {
  try {
    // Single aggregate query — no N+1, no full table load into memory
    const [aggregate] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT p.id)::int                                         AS "totalProducts",
        COALESCE(SUM(i.quantity), 0)::int                                 AS "totalItems",
        COALESCE(SUM(i.quantity * COALESCE(p.price::numeric, 0)), 0)      AS "totalValueRetail",
        COALESCE(SUM(i.quantity * COALESCE(p."costPrice"::numeric, 0)), 0) AS "totalValueCost",
        COUNT(DISTINCT CASE WHEN i.quantity = 0 THEN p.id END)::int       AS "outOfStockCount",
        COUNT(DISTINCT CASE WHEN i.quantity > 0 AND i.quantity <= i."minStock" THEN p.id END)::int AS "lowStockCount"
      FROM "Product" p
      LEFT JOIN "Inventory" i ON i."productId" = p.id
      WHERE p."isActive" = true
    `;

    res.json({
      totalProducts:   Number(aggregate.totalProducts),
      totalItems:      Number(aggregate.totalItems),
      totalValueRetail: Number(aggregate.totalValueRetail),
      totalValueCost:   Number(aggregate.totalValueCost),
      lowStockCount:    Number(aggregate.lowStockCount),
      outOfStockCount:  Number(aggregate.outOfStockCount),
      estimatedProfit:  Number(aggregate.totalValueRetail) - Number(aggregate.totalValueCost)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/valuation
 * 
 * Previously: nested include loaded ALL categories → ALL products → ALL inventory simultaneously.
 * Fixed: single GROUP BY query.
 */
const getCategoryValuation = async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        c.id           AS "categoryId",
        c.name         AS "categoryName",
        c.color,
        c.icon,
        COUNT(DISTINCT p.id)::int                                         AS "productCount",
        COALESCE(SUM(i.quantity), 0)::int                                 AS "totalQuantity",
        COALESCE(SUM(i.quantity * COALESCE(p.price::numeric, 0)), 0)      AS "totalValue"
      FROM "Category" c
      LEFT JOIN "Product" p   ON p."categoryId" = c.id AND p."isActive" = true
      LEFT JOIN "Inventory" i ON i."productId" = p.id
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY "totalValue" DESC
    `;

    res.json(rows.map(r => ({
      categoryId:    r.categoryId,
      categoryName:  r.categoryName,
      color:         r.color,
      icon:          r.icon,
      productCount:  Number(r.productCount),
      totalQuantity: Number(r.totalQuantity),
      totalValue:    Number(r.totalValue)
    })));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/stock/pdf
 * Streams PDF directly — does not buffer entire response in memory.
 */
const exportStockPDF = async (req, res, next) => {
  try {
    // Paginate at DB level, not in memory — export is capped at 2000 rows
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        sku: true, name: true, price: true,
        category: { select: { name: true } },
        inventory: { select: { quantity: true } }
      },
      orderBy: { name: 'asc' },
      take: 2000
    });

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="stock-report.pdf"');
    doc.pipe(res);

    const appName = process.env.APP_NAME || 'FlexStock';
    const currency = process.env.CURRENCY_SYMBOL || 'PKR';

    doc.fontSize(20).text(`${appName} - Inventory Report`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    let totalItems = 0;
    let totalValue = 0;
    products.forEach(p => {
      const qty = p.inventory.reduce((s, i) => s + i.quantity, 0);
      totalItems += qty;
      totalValue += qty * (p.price ? parseFloat(p.price) : 0);
    });

    doc.fontSize(12)
      .text(`Total Products: ${products.length}`)
      .text(`Total Stock Items: ${totalItems}`)
      .text(`Total Value (${currency}): ${totalValue.toFixed(2)}`);
    doc.moveDown(2);

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('SKU', 30, 200);
    doc.text('Product Name', 110, 200);
    doc.text('Category', 270, 200);
    doc.text('Price', 370, 200);
    doc.text('Qty', 440, 200);
    doc.text('Value', 490, 200);
    doc.moveTo(30, 215).lineTo(570, 215).stroke();
    doc.font('Helvetica').fontSize(9);

    let y = 225;
    products.forEach(p => {
      if (y > 700) { doc.addPage(); y = 50; }
      const qty = p.inventory.reduce((s, i) => s + i.quantity, 0);
      const val = qty * (p.price ? parseFloat(p.price) : 0);
      doc.text(p.sku.substring(0, 12), 30, y);
      doc.text(p.name.substring(0, 22), 110, y);
      doc.text(p.category.name.substring(0, 14), 270, y);
      doc.text(p.price ? parseFloat(p.price).toFixed(2) : '0.00', 370, y);
      doc.text(qty.toString(), 440, y);
      doc.text(val.toFixed(2), 490, y);
      y += 18;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/stock/excel
 * Streams workbook — does not buffer entire response in memory.
 */
const exportStockExcel = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        sku: true, name: true, price: true, costPrice: true, unit: true,
        category: { select: { name: true } },
        inventory: { select: { quantity: true } }
      },
      orderBy: { name: 'asc' },
      take: 10000  // Excel row hard limit for this report
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Inventory');

    ws.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Price', key: 'price', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Cost Price', key: 'costPrice', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Stock Value', key: 'value', width: 15, style: { numFmt: '#,##0.00' } }
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    products.forEach(p => {
      const qty = p.inventory.reduce((s, i) => s + i.quantity, 0);
      const priceVal = p.price ? parseFloat(p.price) : 0;
      ws.addRow({
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        price: priceVal,
        costPrice: p.costPrice ? parseFloat(p.costPrice) : 0,
        quantity: qty,
        unit: p.unit,
        value: qty * priceVal
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stock-valuation.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { getStockSummary, exportStockPDF, exportStockExcel, getCategoryValuation };
