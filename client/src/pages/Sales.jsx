import React, { useState, useEffect } from 'react';
import API from '../api';
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

  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  // Search products as user types
  useEffect(() => {
    if (search.trim()) {
      const delayDebounceFn = setTimeout(() => {
        searchProducts();
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
        alert('Item is out of stock at Main Location');
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
          alert(`Insufficient stock. Available: ${item.maxStock}`);
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
      
      // Clear Cart state
      setCart([]);
      setDiscount('');
      setCashPaid('');
      setNote('');
    } catch (err) {
      alert(`Checkout failed: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Left Columns: Search & Cart lists */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Search Scan Input */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel relative">
          <h3 className="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            <span>Search / Scan SKU or Barcode</span>
          </h3>

          <div className="relative">
            <input
              type="text"
              placeholder="Scan barcode or type name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Search Dropdown list overlay */}
          {products.length > 0 && (
            <div className="absolute left-6 right-6 mt-2 rounded-xl bg-slate-900 border border-slate-800 shadow-glass divide-y divide-slate-800 z-20">
              {products.map(p => {
                const stock = p.inventory?.find(inv => inv.location === 'Main')?.quantity || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="p-3 hover:bg-slate-800/40 cursor-pointer flex justify-between items-center text-sm"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">{currencySymbol} {parseFloat(p.price || 0).toFixed(2)}</div>
                      <div className="text-xs text-slate-500">Stock: {stock} {p.unit}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Item Grid */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              <span>Checkout Cart</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">{cart.length} items added</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <ShoppingCart className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="font-medium text-sm">Your checkout cart is empty.</p>
                <p className="text-xs">Scan or search items above to begin transactions.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-4 flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-200 truncate">{item.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</p>
                    <p className="text-xs text-emerald-400 font-bold mt-1">{currencySymbol} {item.price.toFixed(2)}</p>
                  </div>

                  {/* Quantity adjustment controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <input
                      type="number"
                      className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-center text-xs font-bold text-slate-200 outline-none"
                      value={item.quantity}
                      onChange={(e) => handleUpdateCartQty(item.id, e.target.value)}
                    />

                    <button
                      onClick={() => handleAddToCart(item)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Total calculation */}
                  <div className="text-right min-w-[80px]">
                    <div className="font-extrabold text-slate-100">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded transition"
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
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel space-y-6">
          <h3 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3">Checkout Receipt</h3>
          
          <form onSubmit={handleCheckout} className="space-y-5">
            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{currencySymbol} {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-400">
                <span>Discount / Price Adjustment</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs text-slate-500 font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 pl-6 text-right text-xs outline-none focus:border-blue-500 text-slate-200 font-bold"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Cash Received</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs text-slate-500 font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Paid"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 pl-6 text-right text-xs outline-none focus:border-blue-500 text-slate-200 font-bold"
                    value={cashPaid}
                    onChange={(e) => setCashPaid(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex justify-between text-base font-bold text-slate-100">
                <span>Total Amount Due</span>
                <span className="text-emerald-400">{currencySymbol} {calculateTotal().toFixed(2)}</span>
              </div>

              {cashPaid && (
                <div className="flex justify-between text-sm font-semibold text-blue-400 pt-1">
                  <span>Cash Change Due</span>
                  <span>{currencySymbol} {calculateChange().toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Checkout Comments</label>
              <textarea
                rows={2}
                placeholder="Walk-in customer, credit notes..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={cart.length === 0}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold text-sm transition shadow-premium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
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
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass space-y-6">
            
            {/* Success icon */}
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-slate-100">Sale Checkout Complete</h2>
              <p className="text-xs text-slate-500">Transaction ID: #{completedSale.id.substring(0, 8)}</p>
            </div>

            {/* Receipt details */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3 text-slate-400">
              <div className="text-center font-bold border-b border-dashed border-slate-800 pb-2 text-slate-200 uppercase tracking-wider">
                {import.meta.env.VITE_APP_NAME || 'FlexStock'} Receipt
              </div>
              
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(completedSale.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Register Cashier:</span>
                <span>Staff cashier</span>
              </div>
              
              {/* Items */}
              <div className="border-t border-b border-dashed border-slate-800 py-2 my-2 divide-y divide-slate-900">
                {completedSale.items?.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 text-slate-300">
                    <span>Item #{i+1} x{item.quantity}</span>
                    <span>{currencySymbol} {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Final Math */}
              <div className="flex justify-between font-bold text-slate-300">
                <span>Subtotal:</span>
                <span>{currencySymbol} {(parseFloat(completedSale.total) + parseFloat(completedSale.discount)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span>- {currencySymbol} {parseFloat(completedSale.discount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-400 border-t border-slate-800 pt-2 text-sm">
                <span>Total Paid:</span>
                <span>{currencySymbol} {parseFloat(completedSale.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Print Receipt
              </button>
              <button
                onClick={() => { setReceiptOpen(false); setCompletedSale(null); }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
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
