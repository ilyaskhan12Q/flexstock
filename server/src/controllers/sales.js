const prisma = require('../lib/prisma');
const { recordAuditEvent } = require('../lib/audit');

const getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.sale.count({ where })
    ]);

    res.json({
      sales,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, price: true } }
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale record not found' });
    }

    res.json(sale);
  } catch (error) {
    next(error);
  }
};

const createSale = async (req, res, next) => {
  try {
    const { items = [], discount = 0, note } = req.body;
    const userId = req.user.id;

    if (items.length === 0) {
      return res.status(400).json({ error: 'Cannot create a sale with zero items' });
    }

    const io = req.app.get('io');
    const discountVal = parseFloat(discount || 0);

    const result = await prisma.$transaction(async (tx) => {
      let subtotalSum = 0;
      const parsedItems = [];

      // 1. Process items and verify stock
      for (const item of items) {
        const { productId, quantity, location = 'Main' } = item;
        const qty = parseInt(quantity);

        if (!productId || isNaN(qty) || qty <= 0) {
          throw new Error('Valid Product ID and positive quantity are required for each item');
        }

        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (!product || !product.isActive) {
          throw new Error(`Product not found or inactive`);
        }

        const price = product.price ? parseFloat(product.price) : 0;
        const subtotal = qty * price;
        subtotalSum += subtotal;

        // Fetch stock level
        let inventory = await tx.inventory.findUnique({
          where: { productId_location: { productId, location } }
        });

        if (!inventory || inventory.quantity < qty) {
          throw new Error(`Insufficient stock for '${product.name}' at location '${location}'. Available: ${inventory ? inventory.quantity : 0}`);
        }

        parsedItems.push({
          productId,
          quantity: qty,
          unitPrice: price,
          subtotal,
          location,
          productName: product.name,
          minStock: inventory.minStock
        });
      }

      const total = subtotalSum - discountVal;

      // 2. Create the Sale
      const sale = await tx.sale.create({
        data: {
          userId,
          total,
          discount: discountVal,
          note
        }
      });

      // 3. Create items, update stock and write movements
      const createdItems = [];
      const stockUpdates = [];

      for (const item of parsedItems) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal
          }
        });
        createdItems.push(saleItem);

        // Deduct inventory
        const inventory = await tx.inventory.findUnique({
          where: { productId_location: { productId: item.productId, location: item.location } }
        });

        const newQty = inventory.quantity - item.quantity;
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQty }
        });

        // Record stock movement (OUT/SALE)
        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId,
            type: 'SALE',
            quantity: -item.quantity,
            location: item.location,
            note: `Sale Checkout transaction #${sale.id}`,
            reference: sale.id
          }
        });

        stockUpdates.push({
          productId: item.productId,
          productName: item.productName,
          location: item.location,
          quantity: newQty,
          minStock: item.minStock,
          movement
        });
      }

      return { sale: { ...sale, items: createdItems }, stockUpdates };
    });

    // Broadcast WebSocket updates outside transaction
    if (io) {
      result.stockUpdates.forEach(update => {
        io.to('inventory').emit('stock:updated', {
          productId: update.productId,
          location: update.location,
          newQuantity: update.quantity,
          movement: update.movement
        });

        // Check low-stock triggers
        if (update.quantity <= update.minStock) {
          io.to('inventory').emit('alert:low-stock', {
            productId: update.productId,
            productName: update.productName,
            quantity: update.quantity,
            minStock: update.minStock
          });
        }

        // Out of stock check
        if (update.quantity === 0) {
          io.to('inventory').emit('alert:out-of-stock', {
            productId: update.productId,
            productName: update.productName
          });
        }
      });

      // Broadcast sale completion
      io.to('inventory').emit('sale:completed', {
        saleId: result.sale.id,
        total: result.sale.total,
        itemCount: items.length
      });
    }

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'create_sale',
      resourceType: 'sale',
      resourceId: result.sale.id,
      reason: 'Sale checkout completed',
      after: result.sale,
      metadata: {
        itemCount: items.length,
        discount: discountVal,
        total: result.sale.total
      }
    });

    res.status(201).json(result.sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale
};
