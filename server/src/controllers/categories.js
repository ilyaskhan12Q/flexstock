const prisma = require('../lib/prisma');

const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, color, icon, fields = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if name unique
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: { name, description, color, icon }
      });

      if (fields.length > 0) {
        await tx.productField.createMany({
          data: fields.map((field, idx) => ({
            categoryId: category.id,
            label: field.label,
            key: field.key || field.label.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            fieldType: field.fieldType,
            isRequired: !!field.isRequired,
            options: field.options || null,
            unit: field.unit || null,
            sortOrder: field.sortOrder !== undefined ? field.sortOrder : idx
          }))
        });
      }

      return tx.category.findUnique({
        where: { id: category.id },
        include: { fields: true }
      });
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, fields = [] } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (name && name !== category.name) {
      const existing = await prisma.category.findUnique({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: 'Category name already in use' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update core category
      await tx.category.update({
        where: { id },
        data: { name, description, color, icon }
      });

      // 2. Fetch current fields
      const currentFields = await tx.productField.findMany({
        where: { categoryId: id }
      });

      const currentFieldIds = currentFields.map(f => f.id);
      const incomingFieldIds = fields.filter(f => f.id).map(f => f.id);

      // 3. Delete removed fields
      const fieldsToDelete = currentFieldIds.filter(fId => !incomingFieldIds.includes(fId));
      if (fieldsToDelete.length > 0) {
        await tx.productField.deleteMany({
          where: { id: { in: fieldsToDelete } }
        });
      }

      // 4. Create or update incoming fields
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const key = field.key || field.label.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const fieldData = {
          label: field.label,
          key,
          fieldType: field.fieldType,
          isRequired: !!field.isRequired,
          options: field.options || null,
          unit: field.unit || null,
          sortOrder: field.sortOrder !== undefined ? field.sortOrder : i
        };

        if (field.id && currentFieldIds.includes(field.id)) {
          // Update
          await tx.productField.update({
            where: { id: field.id },
            data: fieldData
          });
        } else {
          // Create
          await tx.productField.create({
            data: {
              ...fieldData,
              categoryId: id
            }
          });
        }
      }

      return tx.category.findUnique({
        where: { id },
        include: { fields: { orderBy: { sortOrder: 'asc' } } }
      });
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        error: `Cannot delete category because it contains ${category._count.products} products.`
      });
    }

    await prisma.$transaction(async (tx) => {
      // ProductField cascade delete is handled by database onDelete: Cascade in prisma schema
      await tx.category.delete({ where: { id } });
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
