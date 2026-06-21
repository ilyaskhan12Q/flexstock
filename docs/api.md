# API Reference

The FlexStock backend exposes a REST API at `/api/v1/` for resource mutations and queries, along with a Socket.IO connection for real-time synchronization.

---

## Authentication

### POST `/api/v1/auth/login`
Authenticates a user and sets an access token.
- **Request Body:**
  ```json
  {
    "email": "admin@flexstock.com",
    "password": "admin123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "user_id",
      "name": "System Admin",
      "email": "admin@flexstock.com",
      "role": "ADMIN"
    }
  }
  ```

### POST `/api/v1/auth/logout`
Logs out the current user and invalidates tokens.
- **Request Headers:**
  - `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### POST `/api/v1/auth/refresh`
Refreshes the expired access token.
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOi..."
  }
  ```

### GET `/api/v1/auth/me`
Gets the current user details from JWT.
- **Request Headers:**
  - `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "id": "user_id",
    "name": "System Admin",
    "email": "admin@flexstock.com",
    "role": "ADMIN"
  }
  ```

---

## Categories & Fields

### GET `/api/v1/categories`
List all categories with fields.
- **Response (200 OK):**
  ```json
  [
    {
      "id": "cat_id",
      "name": "Medicines",
      "color": "#FF0000",
      "icon": "Pills",
      "fields": [
        {
          "id": "field_id",
          "label": "Expiry Date",
          "key": "expiry_date",
          "type": "DATE",
          "required": true,
          "options": null,
          "unit": null
        }
      ]
    }
  ]
  ```

### POST `/api/v1/categories`
Create a new category.
- **Request Body:**
  ```json
  {
    "name": "Electronics",
    "color": "#0000FF",
    "icon": "Laptop"
  }
  ```

### PATCH `/api/v1/categories/:id`
Update an existing category.

### DELETE `/api/v1/categories/:id`
Deletes a category. Requires Admin/Manager.

### GET `/api/v1/categories/:id/fields`
List fields for a category.

### POST `/api/v1/categories/:id/fields`
Add a custom field to a category.
- **Request Body:**
  ```json
  {
    "label": "Batch Number",
    "type": "TEXT",
    "required": true,
    "unit": "batch"
  }
  ```

### PUT `/api/v1/categories/:id/fields/reorder`
Reorder custom fields.
- **Request Body:**
  ```json
  {
    "fieldIds": ["field_id_2", "field_id_1"]
  }
  ```

---

## Products

### GET `/api/v1/products`
Paginated, searchable, and filterable product listing.
- **Query Parameters:**
  - `page`: default 1
  - `limit`: default 10
  - `search`: search term
  - `category`: category ID
  - `stockStatus`: `in_stock` | `low_stock` | `out_of_stock`
- **Response (200 OK):**
  ```json
  {
    "products": [],
    "total": 0,
    "pages": 0
  }
  ```

### POST `/api/v1/products`
Create a new product.
- **Request Body:**
  ```json
  {
    "name": "Panadol 500mg",
    "sku": "MED-PAN-001",
    "barcodeValue": "1234567890",
    "categoryId": "cat_id",
    "price": 150.00,
    "minStock": 20,
    "customFields": {
      "expiry_date": "2027-12-31"
    }
  }
  ```

### PATCH `/api/v1/products/:id`
Update a product (including custom fields).

### DELETE `/api/v1/products/:id`
Deactivates a product (soft delete).

### POST `/api/v1/products/import`
CSV bulk import with validation.

---

## Inventory & Movements

### GET `/api/v1/inventory`
Get current stock levels across all locations.

### GET `/api/v1/inventory/:productId`
Get stock levels for a specific product.

### GET `/api/v1/inventory/movements`
Paginated movement history log.

### GET `/api/v1/inventory/low-stock`
List of products below their minimum stock threshold.

### POST `/api/v1/inventory/movement`
Record a stock movement (IN, OUT, ADJUSTMENT, TRANSFER).
- **Request Body:**
  ```json
  {
    "productId": "prod_id",
    "type": "IN",
    "quantity": 100,
    "location": "Main",
    "toLocation": null,
    "note": "Initial stock reception"
  }
  ```

---

## Reports & Exports

- **GET `/api/v1/reports/stock`** - Returns JSON report summary.
- **GET `/api/v1/reports/stock/export/pdf`** - Returns PDF report file.
- **GET `/api/v1/reports/stock/export/excel`** - Returns Excel sheet.
- **GET `/api/v1/reports/movements/export/pdf`** - Exports movements.

---

## Socket.IO Events

The client connects to `http://localhost:3000` via Socket.IO.
- **`stock:updated`**:
  ```json
  {
    "productId": "prod_id",
    "location": "Main Warehouse",
    "newQuantity": 150,
    "movement": { "type": "IN", "quantity": 50, "note": "Received stock" }
  }
  ```
- **`alert:low-stock`**:
  ```json
  {
    "productId": "prod_id",
    "productName": "Panadol 500mg",
    "quantity": 15,
    "minStock": 20
  }
  ```
- **`alert:out-of-stock`**:
  ```json
  {
    "productId": "prod_id",
    "productName": "Panadol 500mg"
  }
  ```
