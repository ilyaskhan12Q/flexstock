const prisma = require('../lib/prisma');
const crypto = require('crypto');
const { recordAuditEvent } = require('../lib/audit');

// Validate dynamic custom fields against category definition
const validateCustomFields = async (categoryId, customFields = {}) => {
  const fields = await prisma.productField.findMany({
    where: { categoryId }
  });

  const errors = [];

  for (const field of fields) {
    const value = customFields[field.key];

    // Check if required
    if (field.isRequired && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field.label}' is required.`);
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      // Validate types
      if (field.fieldType === 'NUMBER') {
        if (isNaN(Number(value))) {
          errors.push(`Field '${field.label}' must be a number.`);
        }
      } else if (field.fieldType === 'DATE') {
        if (isNaN(Date.parse(value))) {
          errors.push(`Field '${field.label}' must be a valid date.`);
        }
      } else if (field.fieldType === 'BOOLEAN') {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 1 && value !== 0) {
          errors.push(`Field '${field.label}' must be a boolean.`);
        }
      } else if (field.fieldType === 'DROPDOWN') {
        const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]');
        if (options.length > 0 && !options.includes(value)) {
          errors.push(`Field '${field.label}' must be one of: ${options.join(', ')}.`);
        }
      }
    }
  }

  return errors;
};

// Generate unique SKU
const generateSKU = async (categoryName) => {
  const prefix = (categoryName || 'PROD').substring(0, 3).toUpperCase();
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  const sku = `${prefix}-${randomStr}`;
  // Verify uniqueness
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) {
    return generateSKU(categoryName);
  }
  return sku;
};

const getProducts = async (req, res, next) => {
  try {
    const { categoryId, search, stockStatus, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    // Cap at 100 — prevents someone requesting limit=999999 and dumping the DB
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Whitelist sortBy to prevent injection via orderBy
    const ALLOWED_SORT_FIELDS = ['name', 'sku', 'price', 'createdAt', 'updatedAt'];
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'name';
    const safeSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

    // Build filters
    const where = { isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcodeValue: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filters on stock status — note: low_stock filter avoids the broken
    // prisma.inventory.fields.minStock reference (that's a Prisma meta object, not a value)
    if (stockStatus) {
      if (stockStatus === 'out_of_stock') {
        where.inventory = { some: { quantity: 0 } };
      } else if (stockStatus === 'in_stock') {
        where.inventory = { some: { quantity: { gt: 0 } } };
      }
      // low_stock requires column-to-column compare — skip the ORM filter, handle in JS post-query
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true, color: true, icon: true } },
          inventory: true
        },
        orderBy: { [safeSortBy]: safeSortOrder },
        skip,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
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

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        category: {
          include: { fields: { orderBy: { sortOrder: 'asc' } } }
        },
        inventory: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { categoryId, name, sku, description, price, costPrice, unit = 'pcs', barcodeValue, customFields = {} } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ error: 'Category ID and name are required' });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Parse customFields if passed as string (e.g. from multipart form)
    let parsedFields = customFields;
    if (typeof customFields === 'string') {
      try {
        parsedFields = JSON.parse(customFields);
      } catch (e) {
        parsedFields = {};
      }
    }

    // Validate custom fields
    const validationErrors = await validateCustomFields(categoryId, parsedFields);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    // Generate SKU if not provided
    const finalSku = sku || await generateSKU(category.name);

    // Check SKU unique
    const existingSku = await prisma.product.findUnique({ where: { sku: finalSku } });
    if (existingSku) {
      return res.status(400).json({ error: 'SKU already in use' });
    }

    // Check barcodeValue unique
    if (barcodeValue) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcodeValue } });
      if (existingBarcode) {
        return res.status(400).json({ error: 'Barcode value already in use' });
      }
    }

    // Image URL from file upload if present
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          categoryId,
          name,
          sku: finalSku,
          description,
          price: price ? parseFloat(price) : null,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          unit,
          barcodeValue: barcodeValue || finalSku, // default to SKU if no barcode
          imageUrl,
          customFields: parsedFields
        }
      });

      // Initialize default inventory at Main location
      await tx.inventory.create({
        data: {
          productId: prod.id,
          location: 'Main',
          quantity: 0,
          minStock: 5 // default threshold
        }
      });

      return prod;
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'create_product',
      resourceType: 'product',
      resourceId: product.id,
      reason: 'Created product with initial inventory row',
      after: product,
      metadata: {
        categoryId,
        hasImage: !!req.file,
        customFieldKeys: Object.keys(parsedFields || {})
      }
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, description, price, costPrice, unit, barcodeValue, customFields = {} } = req.body;

    const product = await prisma.product.findFirst({ where: { id, isActive: true } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Parse customFields if passed as string (e.g. from multipart form)
    let parsedFields = customFields;
    if (req.body.customFields) {
      if (typeof customFields === 'string') {
        try {
          parsedFields = JSON.parse(customFields);
        } catch (e) {
          parsedFields = {};
        }
      }
      
      const validationErrors = await validateCustomFields(product.categoryId, parsedFields);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: validationErrors });
      }
    }

    if (sku && sku !== product.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        return res.status(400).json({ error: 'SKU already in use' });
      }
    }

    if (barcodeValue && barcodeValue !== product.barcodeValue) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcodeValue } });
      if (existingBarcode) {
        return res.status(400).json({ error: 'Barcode value already in use' });
      }
    }

    const data = {
      name,
      sku,
      description,
      price: price !== undefined ? (price ? parseFloat(price) : null) : undefined,
      costPrice: costPrice !== undefined ? (costPrice ? parseFloat(costPrice) : null) : undefined,
      unit,
      barcodeValue,
      customFields: parsedFields
    };

    if (req.file) {
      data.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.product.update({
      where: { id },
      data
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'update_product',
      resourceType: 'product',
      resourceId: id,
      reason: 'Updated product metadata, pricing, or custom fields',
      before: product,
      after: updated,
      metadata: {
        hasImage: !!req.file,
        updatedCustomFields: req.body.customFields ? Object.keys(parsedFields || {}) : []
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'delete_product',
      resourceType: 'product',
      resourceId: id,
      reason: 'Soft-deleted product',
      before: product,
      after: { isActive: false },
      metadata: { sku: product.sku, categoryId: product.categoryId }
    });

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// CSV Bulk Import
const importProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvData = req.file.buffer.toString('utf8');
    const lines = csvData.split(/\r?\n/);
    if (lines.length <= 1) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Required headers: categoryName, name
    const categoryIdx = headers.indexOf('categoryName');
    const nameIdx = headers.indexOf('name');
    const skuIdx = headers.indexOf('sku');
    const priceIdx = headers.indexOf('price');
    const costPriceIdx = headers.indexOf('costPrice');
    const unitIdx = headers.indexOf('unit');
    const barcodeIdx = headers.indexOf('barcodeValue');

    if (categoryIdx === -1 || nameIdx === -1) {
      return res.status(400).json({ error: 'CSV must contain categoryName and name headers' });
    }

    const results = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parse (ignores commas in quotes for brevity here, in production standard parsers like csv-parse are preferred)
      // Since it's self-contained, we parse carefully
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < headers.length) {
        errors.push(`Row ${i + 1}: Columns count mismatch`);
        continue;
      }

      const categoryName = cols[categoryIdx];
      const name = cols[nameIdx];
      const sku = skuIdx !== -1 ? cols[skuIdx] : null;
      const price = priceIdx !== -1 ? parseFloat(cols[priceIdx]) : null;
      const costPrice = costPriceIdx !== -1 ? parseFloat(cols[costPriceIdx]) : null;
      const unit = unitIdx !== -1 ? cols[unitIdx] : 'pcs';
      const barcodeValue = barcodeIdx !== -1 ? cols[barcodeIdx] : null;

      if (!categoryName || !name) {
        errors.push(`Row ${i + 1}: Category Name and Product Name are required`);
        continue;
      }

      try {
        // Find or create category
        let category = await prisma.category.findUnique({ where: { name: categoryName } });
        if (!category) {
          category = await prisma.category.create({
            data: { name: categoryName, description: 'Auto-created via CSV import' }
          });
        }

        const finalSku = sku || await generateSKU(categoryName);

        // Build product
        // Custom fields are left empty on import since schemas are client-specific
        await prisma.$transaction(async (tx) => {
          const prod = await tx.product.create({
            data: {
              categoryId: category.id,
              name,
              sku: finalSku,
              price,
              costPrice,
              unit,
              barcodeValue: barcodeValue || finalSku,
              customFields: {}
            }
          });

          await tx.inventory.create({
            data: {
              productId: prod.id,
              location: 'Main',
              quantity: 0,
              minStock: 5
            }
          });
        });

        results.push(`Row ${i + 1}: Product '${name}' imported successfully`);
      } catch (err) {
        errors.push(`Row ${i + 1}: Error - ${err.message}`);
      }
    }

    res.json({
      message: `${results.length} products imported successfully`,
      successCount: results.length,
      errors
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'bulk_import_products',
      resourceType: 'product_import',
      resourceId: null,
      reason: 'Bulk CSV import completed',
      outcome: errors.length > 0 ? 'partial_success' : 'success',
      statusCode: 200,
      metadata: {
        importedCount: results.length,
        errorCount: errors.length,
        sourceFileName: req.file.originalname
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts
};
