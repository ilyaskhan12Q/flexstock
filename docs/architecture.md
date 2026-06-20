# System Architecture

## Overview

FlexStock is a monorepo with two workspaces: `server/` (Express + Prisma) and `client/` (React + Vite).

```

                        CLIENT BROWSER                       
  React + Vite App                                           
       
     Dashboard     Products       Admin / Config     
    (realtime)     (dynamic       (categories,       
                    forms)         fields, users)    
       
                                                          
  Socket.IO Client     REST API calls      REST API calls   

                                             
                                             

                     NODE.JS / EXPRESS SERVER                
        
   Socket.IO       REST API        Auth Middleware    
   Server          Routes          (JWT + roles)     
        
            
                        PRISMA ORM                           
   
                           
                           
              
                    POSTGRESQL DB       
                users, categories,     
                product_fields,        
                products (+ JSONB),    
                inventory,             
                stock_movements        
              
```

## Key Design Decisions

### Real-Time: Socket.IO

All connected clients join the `inventory` room. Every stock mutation emits one of:
- `stock:updated`  fires after any movement is recorded
- `alert:low-stock`  fires when quantity <= minStock
- `alert:out-of-stock`  fires when quantity reaches 0
- `sale:completed`  fires after POS checkout

### Dynamic Fields: Hybrid EAV + JSONB

- Core product fields (name, SKU, price, unit) are fixed columns
- Client-specific fields (expiry date, batch number, size) are stored as JSONB in `customFields`
- The `ProductField` table defines the schema per category  label, key, type, required, options
- Backend validates submitted `customFields` against the `ProductField` schema before insert

### White-Label Architecture

The same codebase is deployed per client. Customization is handled via:
1. `.env`  app name, currency, DB credentials
2. Settings panel  business info, logo, locations, module toggles
3. Admin panel  category and field definitions
4. `/client/public/logo.png`  optional branding override

## Data Flow: Stock Movement

```
User submits movement form
   POST /api/v1/inventory/movement
     Auth middleware validates JWT
     Controller validates inputs
     Prisma transaction:
        - Creates StockMovement record
        - Updates Inventory.quantity
     Socket.IO emits stock:updated to all clients
     If quantity <= minStock: emit alert:low-stock
     HTTP 201 response returned
```
