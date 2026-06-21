# Custom Field Builder

FlexStock allows administrators to customize what information is collected and displayed for products on a per-category basis. This is ideal for supporting diverse inventories (e.g., medicine expiration dates, electronic model specifications, or clothing sizes) within the same application instance.

---

## Technical Architecture

The custom field engine is built using a hybrid database schema combining traditional relational tables with a JSONB column.

```
+--------------------+
|      Category      |
+--------------------+
          | (1 to Many)
          v
+--------------------+         +--------------------+
|    ProductField    |         |      Product       |
|  (Field Schema)    |         |                    |
|                    |         | - name, sku, price |
| - label, key, type |         | - customFields     |
| - required, options|         |   (JSONB Column)   |
+--------------------+         +--------------------+
```

### 1. The Schema definition (`ProductField`)
Each category can have multiple field definitions:
- **Field Label**: The display name in the form (e.g., `"Expiry Date"`).
- **Field Key**: The normalized key used in JSONB objects (e.g., `"expiry_date"`).
- **Field Type**: Matches input fields:
  - `TEXT`: Single-line text input.
  - `NUMBER`: Numeric input.
  - `DATE`: Date picker input.
  - `DROPDOWN`: Select dropdown with user-defined options.
  - `BOOLEAN`: Toggle switch or checkbox.
  - `TEXTAREA`: Multi-line text block.
- **Required**: Flag defining whether the field must be filled.
- **Options**: List of comma-separated strings for `DROPDOWN` options.
- **Unit**: Optional suffix unit (e.g., `"kg"`, `"ml"`, `"pcs"`).

### 2. The Data storage (`Product.customFields`)
Rather than creating separate tables for every category (which requires dangerous runtime database schema alterations), product-specific fields are stored in a single `customFields` **JSONB** column inside the `Product` table.

For example, a product in the "Medicines" category might have:
```json
{
  "expiry_date": "2027-12-31",
  "batch_number": "BATCH-8902A"
}
```

---

## Field Validation Flow

Before any product is created or updated, the backend runs validation logic:

1. Look up all `ProductField` rows associated with the product's `categoryId`.
2. Check if all fields marked `required: true` are present and non-empty in the request's `customFields` object.
3. Validate data types:
   - Verify that fields of type `NUMBER` contain valid numbers.
   - Verify that fields of type `DATE` contain valid ISO date strings.
   - Verify that fields of type `DROPDOWN` match one of the options defined in the schema.
4. Clean the incoming `customFields` object to strip out any keys not defined in the category schema (protects against parameter injection).

---

## Drag-and-Drop Reordering

Administrators can drag and drop custom fields in the dashboard to change their visual hierarchy. 
This order is persisted via a `fieldOrder` array on the category table, which the frontend uses to render forms and detail views sequentially.
