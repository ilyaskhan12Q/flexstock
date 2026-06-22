import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import { useFeedbackStore } from '../store/feedbackStore';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Minus, 
  Plus, 
  Receipt,
  DollarSign,
  User,
  CheckCircle,
  X
} from 'lucide-react';

function Sales() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [cashPaid, setCashPaid] = useState('');
  const [note, setNote] = useState('');
  
  // Checkout Modal Receipt State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const { showSuccess, showError } = useFeedbackStore();
  const searchInputRef = useRef(null);

  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  // Auto-focus search input on mount and handle global keybind to refocus scanner
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e) => {
      // Focus search input on Escape or F2 key
      if (e.key === 'Escape' || e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search products as user types or scans barcode
  useEffect(() => {
    if (search.trim()) {
      const checkAndAddBarcode = async () => {
        try {
          const res = await API.get('/products', {
            params: { search: search.trim(), limit: 5 }
          });
          const found = res.data.products;
          // If exactly one match is found and it has matching barcode or SKU, auto-add
          if (found.length === 1 && (found[0].barcodeValue === search.trim() || found[0].sku === search.trim())) {
            handleAddToCart(found[0]);
            return;
          }
          // Normal search
          searchProducts();
        } catch (err) {
          console.error(err);
        }
      };

      const delayDebounceFn = setTimeout(() => {
        checkAndAddBarcode();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setProducts([]);
    }
  }, [search]);

  const searchProducts = async () => {
    try {
      const res = await API.get('/products', {
        params: { search, limit: 5 }
      });
      setProducts(res.data.products);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = (prod) => {
    // Check if item already exists in cart
    const existing = cart.find(item => item.id === prod.id);
    if (existing) {
      handleUpdateCartQty(prod.id, existing.quantity + 1);
    } else {
      // Find stock quantity available at Main shop location
      const mainStock = prod.inventory?.find(inv => inv.location === 'Main')?.quantity || 0;
      if (mainStock <= 0) {
        showError('Out of Stock', 'Item is out of stock at Main Location');
        return;
      }

      setCart([...cart, {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        price: parseFloat(prod.price || 0),
        quantity: 1,
        maxStock: mainStock
      }]);
    }
    setSearch('');
    setProducts([]);
  };

  const handleUpdateCartQty = (id, qty) => {
    const updated = cart.map(item => {
      if (item.id === id) {
        const count = parseInt(qty);
        if (count > item.maxStock) {
          showError('Insufficient Stock', `Insufficient stock. Available: ${item.maxStock}`);
          return item;
        }
        return { ...item, quantity: Math.max(1, count) };
      }
      return item;
    });
    setCart(updated);
  };

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const disc = parseFloat(discount || 0);
    return Math.max(0, subtotal - disc);
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const paid = parseFloat(cashPaid || 0);
    return Math.max(0, paid - total);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      const items = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        location: 'Main' // default cash sales at Main shop
      }));

      const res = await API.post('/sales', {
        items,
        discount: parseFloat(discount || 0),
        note
      });

      // Show receipt modal
      setCompletedSale(res.data);
      setReceiptOpen(true);
      showSuccess('Sale Completed', `Sale #${res.data.id.substring(0, 8)} recorded successfully!`);
      
      // Clear Cart state
      setCart([]);
      setDiscount('');
      setCashPaid('');
      setNote('');
    } catch (err) {
      showError('Checkout Failed', err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Left Columns: Search & Cart lists */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Search Scan Input */}
        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel relative shadow-premium">
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground/60" />
            <span>Search / Scan SKU or Barcode</span>
          </h3>

          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or type name..."
              className="input-field-sm pl-9 font-bold bg-background/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Search Dropdown list overlay */}
          {products.length > 0 && (
            <div className="absolute left-6 right-6 mt-2 rounded-xl bg-card border border-border shadow-premium divide-y divide-border z-20 overflow-hidden">
              {products.map(p => {
                const stock = p.inventory?.find(inv => inv.location === 'Main')?.quantity || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="p-3 hover:bg-secondary/60 cursor-pointer flex justify-between items-center text-sm transition"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">{currencySymbol} {parseFloat(p.price || 0).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Stock: {stock} {p.unit}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Item Grid */}
        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
          <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span>Checkout Cart</span>
            </h3>
            <span className="text-xs text-muted-foreground font-medium">{cart.length} items added</span>
          </div>

          <div className="divide-y divide-border">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <ShoppingCart className="w-12 h-12 mx-auto stroke-1 text-muted-foreground/60" />
                <p className="font-medium text-sm text-foreground">Your checkout cart is empty.</p>
                <p className="text-xs text-muted-foreground">Scan or search items above to begin transactions.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-4 flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</p>
                    <p className="text-xs text-primary font-bold mt-1">{currencySymbol} {item.price.toFixed(2)}</p>
                  </div>

                  {/* Quantity adjustment controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                      className="p-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground cursor-pointer shadow-premium"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <input
                      type="number"
                      className="w-12 bg-background border border-border rounded px-1 py-1 text-center text-xs font-bold text-foreground outline-none"
                      value={item.quantity}
                      onChange={(e) => handleUpdateCartQty(item.id, e.target.value)}
                    />

                    <button
                      onClick={() => handleAddToCart(item)}
                      className="p-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground cursor-pointer shadow-premium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Total calculation */}
                  <div className="text-right min-w-[80px]">
                    <div className="font-extrabold text-foreground">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Checkout Summary & Cash flow */}
      <div className="lg:col-span-1">
        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel space-y-6 shadow-premium">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">Checkout Receipt</h3>
          
          <form onSubmit={handleCheckout} className="space-y-5">
            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-semibold">{currencySymbol} {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Discount / Price Adjustment</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded px-2.5 py-1 pl-6 text-right text-xs outline-none focus:border-primary text-foreground font-bold"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Cash Received</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Paid"
                    className="w-full bg-background border border-border rounded px-2.5 py-1 pl-6 text-right text-xs outline-none focus:border-primary text-foreground font-bold"
                    value={cashPaid}
                    onChange={(e) => setCashPaid(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                <span>Total Amount Due</span>
                <span className="text-primary">{currencySymbol} {calculateTotal().toFixed(2)}</span>
              </div>

              {cashPaid && (
                <div className="flex justify-between text-sm font-semibold text-blue-500 dark:text-blue-400 pt-1">
                  <span>Cash Change Due</span>
                  <span>{currencySymbol} {calculateChange().toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Checkout Comments</label>
              <textarea
                rows={2}
                placeholder="Walk-in customer, credit notes..."
                className="w-full bg-background border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground outline-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={cart.length === 0}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm transition shadow-premium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Receipt className="w-4.5 h-4.5" />
              <span>Complete Transaction Checkout</span>
            </button>
          </form>
        </div>
      </div>

      {/* COMPLETED TRANSACTION RECEIPT POPUP */}
      {receiptOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-premium space-y-6">
            
            {/* Success icon */}
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-pulse" />
              <h2 className="text-lg font-bold text-foreground">Sale Checkout Complete</h2>
              <p className="text-xs text-muted-foreground">Transaction ID: #{completedSale.id.substring(0, 8)}</p>
            </div>

            {/* Receipt details */}
            <div className="p-4 rounded-xl bg-background border border-border font-mono text-xs space-y-3 text-muted-foreground shadow-inner">
              <div className="text-center font-bold border-b border-dashed border-border pb-2 text-foreground uppercase tracking-wider">
                {import.meta.env.VITE_APP_NAME || 'FlexStock'} Receipt
              </div>
              
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="text-foreground">{new Date(completedSale.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Register Cashier:</span>
                <span className="text-foreground">Staff cashier</span>
              </div>
              
              {/* Items */}
              <div className="border-t border-b border-dashed border-border py-2 my-2 divide-y divide-border/60">
                {completedSale.items?.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 text-foreground font-semibold">
                    <span>Item #{i+1} x{item.quantity}</span>
                    <span>{currencySymbol} {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Final Math */}
              <div className="flex justify-between font-bold text-foreground">
                <span>Subtotal:</span>
                <span>{currencySymbol} {(parseFloat(completedSale.total) + parseFloat(completedSale.discount)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground/75">
                <span>Discount:</span>
                <span>- {currencySymbol} {parseFloat(completedSale.discount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-500 border-t border-border pt-2 text-sm">
                <span>Total Paid:</span>
                <span>{currencySymbol} {parseFloat(completedSale.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-semibold transition cursor-pointer shadow-premium"
              >
                Print Receipt
              </button>
              <button
                onClick={() => { setReceiptOpen(false); setCompletedSale(null); }}
                className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold transition cursor-pointer shadow-premium"
              >
                New Checkout
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Sales;
