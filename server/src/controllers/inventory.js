const prisma = require('../lib/prisma');
const { recordAuditEvent } = require('../lib/audit');

const getInventory = async (req, res, next) => {
  try {
    const { location, search, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (location) {
      where.location = location;
    }

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: { category: true }
          }
        },
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.inventory.count({ where })
    ]);

    res.json({
      items,
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

const getInventoryByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findMany({
      where: { productId },
      orderBy: { location: 'asc' }
    });

    res.json(inventory);
  } catch (error) {
    next(error);
  }
};

const createMovement = async (req, res, next) => {
  try {
    const { productId, type, quantity, location = 'Main', targetLocation, note, reference } = req.body;
    const userId = req.user.id;

    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({ error: 'Product ID, movement type, and quantity are required' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or inactive' });
    }

    const io = req.app.get('io');

    const result = await prisma.$transaction(async (tx) => {
      // Fetch current inventory at origin location
      let currentInv = await tx.inventory.findUnique({
        where: { productId_location: { productId, location } }
      });

      if (!currentInv) {
        currentInv = await tx.inventory.create({
          data: { productId, location, quantity: 0, minStock: 5 }
        });
      }

      let newQuantity = currentInv.quantity;

      if (type === 'IN' || type === 'RETURN') {
        newQuantity += qty;
      } else if (type === 'OUT' || type === 'SALE') {
        if (currentInv.quantity < qty) {
          throw new Error(`Insufficient stock at location '${location}'. Available: ${currentInv.quantity}`);
        }
        newQuantity -= qty;
      } else if (type === 'ADJUSTMENT') {
        newQuantity = qty; // For adjustments, quantity is the corrected total count
      } else if (type === 'TRANSFER') {
        if (!targetLocation) {
          throw new Error('Destination location is required for transfers');
        }
        if (location === targetLocation) {
          throw new Error('Origin and destination locations must be different');
        }
        if (currentInv.quantity < qty) {
          throw new Error(`Insufficient stock at location '${location}'. Available: ${currentInv.quantity}`);
        }

        // Deduct from origin
        newQuantity -= qty;
        await tx.inventory.update({
          where: { id: currentInv.id },
          data: { quantity: newQuantity }
        });

        // Add to target location
        let targetInv = await tx.inventory.findUnique({
          where: { productId_location: { productId, location: targetLocation } }
        });

        if (!targetInv) {
          targetInv = await tx.inventory.create({
            data: { productId, location: targetLocation, quantity: 0, minStock: 5 }
          });
        }

        const targetNewQty = targetInv.quantity + qty;
        await tx.inventory.update({
          where: { id: targetInv.id },
          data: { quantity: targetNewQty }
        });

        // Log transfer movements
        const m1 = await tx.stockMovement.create({
          data: { productId, userId, type: 'TRANSFER', quantity: -qty, location, note: `Transferred to ${targetLocation}. ${note || ''}`, reference }
        });

        const m2 = await tx.stockMovement.create({
          data: { productId, userId, type: 'TRANSFER', quantity: qty, location: targetLocation, note: `Transferred from ${location}. ${note || ''}`, reference }
        });

        // Broadcast target location updates
        if (io) {
          io.to('inventory').emit('stock:updated', {
            productId,
            location: targetLocation,
            newQuantity: targetNewQty,
            movement: m2
          });
        }

        // Return origin result
        return { movement: m1, newQuantity };
      } else {
        throw new Error('Invalid movement type');
      }

      // Update quantity for standard movements (IN, OUT, ADJUSTMENT, RETURN)
      await tx.inventory.update({
        where: { id: currentInv.id },
        data: { quantity: newQuantity }
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          userId,
          type,
          quantity: (type === 'OUT' || type === 'SALE') ? -qty : qty,
          location,
          note,
          reference
        }
      });

      return { movement, newQuantity, minStock: currentInv.minStock };
    });

    // Broadcast Socket.IO events outside transaction
    if (io) {
      io.to('inventory').emit('stock:updated', {
        productId,
        location,
        newQuantity: result.newQuantity,
        movement: result.movement
      });

      // Low stock trigger check
      if (result.newQuantity <= result.minStock) {
        io.to('inventory').emit('alert:low-stock', {
          productId,
          productName: product.name,
          quantity: result.newQuantity,
          minStock: result.minStock
        });
      }

      // Out of stock check
      if (result.newQuantity === 0) {
        io.to('inventory').emit('alert:out-of-stock', {
          productId,
          productName: product.name
        });
      }
    }

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'record_stock_movement',
      resourceType: 'inventory',
      resourceId: result.movement.id,
      reason: 'Stock movement recorded',
      after: result.movement,
      metadata: {
        productId,
        location,
        targetLocation: targetLocation || null,
        movementType: type,
        quantity: qty,
        newQuantity: result.newQuantity
      }
    });

    res.status(201).json({
      message: 'Stock movement recorded successfully',
      movement: result.movement,
      quantity: result.newQuantity
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMovementHistory = async (req, res, next) => {
  try {
    const { productId, userId, type, location, startDate, endDate, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (productId) where.productId = productId;
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (location) where.location = location;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.stockMovement.count({ where })
    ]);

    res.json({
      movements,
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

const getLowStockList = async (req, res, next) => {
  try {
    // Fix: prisma.inventory.fields.minStock is a Prisma field reference object,
    // NOT a value. Comparing quantity to it doesn't work. Use $queryRaw for
    // the column-to-column comparison that Prisma ORM can't express directly.
    const lowStockItems = await prisma.$queryRaw`
      SELECT
        i.id,
        i."productId",
        i.location,
        i.quantity,
        i."minStock",
        i."updatedAt",
        p.name      AS "productName",
        p.sku       AS "productSku",
        p.unit      AS "productUnit",
        c.name      AS "categoryName",
        c.color     AS "categoryColor"
      FROM "Inventory" i
      JOIN "Product"  p ON p.id = i."productId" AND p."isActive" = true
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE i.quantity <= i."minStock"
      ORDER BY i.quantity ASC
      LIMIT 100
    `;

    // Shape response to match the old include format expected by Dashboard.jsx
    const shaped = lowStockItems.map(row => ({
      id:        row.id,
      productId: row.productId,
      location:  row.location,
      quantity:  Number(row.quantity),
      minStock:  Number(row.minStock),
      updatedAt: row.updatedAt,
      product: {
        name: row.productName,
        sku:  row.productSku,
        unit: row.productUnit,
        category: {
          name:  row.categoryName,
          color: row.categoryColor
        }
      }
    }));

    res.json(shaped);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryByProduct,
  createMovement,
  getMovementHistory,
  getLowStockList
};
