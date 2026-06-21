import React, { useState, useEffect } from 'react';
import API from '../api';
import { useSocket } from '../hooks/useSocket';
import { useFeedbackStore } from '../store/feedbackStore';
import { 
  ClipboardList, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  ArrowRightLeft, 
  Settings2,
  Info,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';

function Inventory() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [movPagination, setMovPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const { showSuccess, showError } = useFeedbackStore();
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [page, setPage] = useState(1);
  const [movPage, setMovPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [flashingRows, setFlashingRows] = useState({}); // records row ID -> color flash

  // Transaction form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocationForm, setSelectedLocationForm] = useState('Main');
  const [targetLocationForm, setTargetLocationForm] = useState('');
  const [txType, setTxType] = useState('IN');
  const [txQty, setTxQty] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txRef, setTxRef] = useState('');
  
  const [allProducts, setAllProducts] = useState([]);

  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  useEffect(() => {
    fetchInventory();
  }, [search, selectedLocation, page]);

  useEffect(() => {
    fetchMovements();
  }, [movPage]);

  useEffect(() => {
    // Fetch all products for selector
    const fetchProducts = async () => {
      try {
        const res = await API.get('/products?limit=100');
        setAllProducts(res.data.products);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
  }, []);

  // Listen to Real-time Sockets for inline row updates!
  const socketCallbacks = React.useMemo(() => ({
    'stock:updated': (data) => {
      // Find matching item in current view and update quantity
      setInventoryItems((prev) => 
        prev.map((item) => {
          if (item.productId === data.productId && item.location === data.location) {
            // Trigger row flash animation
            const flashColor = data.movement.quantity > 0 ? 'bg-emerald-950/40 border-emerald-500' : 'bg-red-950/40 border-red-500';
            setFlashingRows((flash) => ({ ...flash, [item.id]: flashColor }));
            
            // Remove flash after 2 seconds
            setTimeout(() => {
              setFlashingRows((flash) => {
                const copy = { ...flash };
                delete copy[item.id];
                return copy;
              });
            }, 2000);

            return { ...item, quantity: data.newQuantity };
          }
          return item;
        })
      );
      // Fetch movements again to show new transactions
      fetchMovements();
    }
  }), []);

  useSocket(socketCallbacks);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await API.get('/inventory', {
        params: {
          search,
          location: selectedLocation || undefined,
          page,
          limit: 10
        }
      });
      setInventoryItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await API.get('/inventory/movements', {
        params: {
          page: movPage,
          limit: 10
        }
      });
      setMovements(res.data.movements);
      setMovPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !txQty) return;

    try {
      const res = await API.post('/inventory/movement', {
        productId: selectedProduct,
        type: txType,
        quantity: txQty,
        location: selectedLocationForm,
        targetLocation: txType === 'TRANSFER' ? targetLocationForm : undefined,
        note: txNote,
        reference: txRef
      });

      showSuccess('Transaction Successful', 'Stock transaction submitted successfully.');
      setTxQty('');
      setTxNote('');
      setTxRef('');
      fetchInventory();
    } catch (err) {
      showError('Transaction Failed', err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert Info Block */}
      {message && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-xs font-semibold text-slate-500 hover:text-slate-300">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Stock transaction Quick Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
            <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              <span>Record Stock Transaction</span>
            </h3>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Scan / Search Product</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Scan barcode or type name..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none"
                    onChange={(e) => {
                      const val = e.target.value.trim().toLowerCase();
                      if (!val) return;
                      const matched = allProducts.find(p => 
                        p.barcodeValue === val || 
                        p.sku.toLowerCase() === val || 
                        p.name.toLowerCase().includes(val)
                      );
                      if (matched) {
                        setSelectedProduct(matched.id);
                      }
                    }}
                  />
                </div>
                
                <select
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none mb-2"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Or choose item manually...</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              {selectedProduct && (() => {
                const prod = allProducts.find(p => p.id === selectedProduct);
                if (!prod) return null;
                const catColor = prod.category?.color || '#3B82F6';
                return (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between animate-fade-in">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                        <span className="font-bold text-slate-200 text-sm">{prod.name}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 block mt-0.5">{prod.sku}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      {prod.category?.name || 'No Category'}
                    </span>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Action Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('IN')}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${txType === 'IN' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                      <span>Stock IN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('OUT')}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${txType === 'OUT' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      <ArrowDown className="w-4 h-4 text-red-500" />
                      <span>Stock OUT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('ADJUSTMENT')}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${txType === 'ADJUSTMENT' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      <Settings2 className="w-4 h-4 text-amber-500" />
                      <span>Correct Count</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('TRANSFER')}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${txType === 'TRANSFER' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Count"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none font-bold"
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Origin Location</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                    value={selectedLocationForm}
                    onChange={(e) => setSelectedLocationForm(e.target.value)}
                  >
                    <option value="Main">Main Shop</option>
                    <option value="Warehouse">Warehouse A</option>
                    <option value="Pharmacy">Pharmacy Shelf</option>
                  </select>
                </div>

                {txType === 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Location</label>
                    <select
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none border-blue-600 animate-pulse"
                      value={targetLocationForm}
                      onChange={(e) => setTargetLocationForm(e.target.value)}
                    >
                      <option value="">Destination...</option>
                      <option value="Main">Main Shop</option>
                      <option value="Warehouse">Warehouse A</option>
                      <option value="Pharmacy">Pharmacy Shelf</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Reference / PO #</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-92832"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Transaction Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for adjustment/movement..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {txType === 'IN' ? <ArrowUp className="w-4 h-4" /> : txType === 'OUT' ? <ArrowDown className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                <span>Record Movement</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Stock levels table & history logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl glass-panel">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search stock by product name or SKU..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 w-full sm:w-auto"
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
            >
              <option value="">All Locations</option>
              <option value="Main">Main Shop</option>
              <option value="Warehouse">Warehouse A</option>
              <option value="Pharmacy">Pharmacy Shelf</option>
            </select>
          </div>

          {/* Grid listing stock */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
              <h3 className="text-base font-semibold text-slate-200 mb-4">Stock Inventory Levels</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-center">Available Stock</th>
                      <th className="px-4 py-3 text-center">Threshold (Min)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No stock levels found matching filters.</td>
                      </tr>
                    ) : (
                      inventoryItems.map((item) => {
                        const isLow = item.quantity <= item.minStock;
                        const isOut = item.quantity === 0;
                        const flashClass = flashingRows[item.id] || '';

                        return (
                          <tr key={item.id} className={`hover:bg-slate-800/20 transition-all duration-300 ${flashClass}`}>
                            <td className="px-4 py-3 font-semibold text-slate-100 flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.product.category?.color || '#475569' }} title={item.product.category?.name || 'No Category'} />
                              <span>{item.product.name}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.product.sku}</td>
                            <td className="px-4 py-3 text-slate-400 font-medium">{item.location}</td>
                            <td className="px-4 py-3 text-center font-extrabold text-slate-200">{item.quantity}</td>
                            <td className="px-4 py-3 text-center text-slate-500">{item.minStock}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                isOut ? 'bg-red-950 text-red-400 border-red-900' :
                                isLow ? 'bg-yellow-950 text-yellow-400 border-yellow-900' :
                                'bg-emerald-950 text-emerald-400 border-emerald-900'
                              }`}>
                                <span>{isOut ? '🛑' : isLow ? '⚠️' : '✅'}</span>
                                <span>{isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-6 border-t border-slate-800 pt-4 text-sm">
                  <span className="text-slate-500">Showing page {pagination.page} of {pagination.pages}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.page === 1}
                      onClick={() => setPage(pagination.page - 1)}
                      className="px-3 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded text-xs font-semibold disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPage(pagination.page + 1)}
                      className="px-3 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded text-xs font-semibold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit History Log Block */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
            <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span>Full Transaction Audit Log</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2">Timestamp</th>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2 text-center">Type</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2">Operator</th>
                    <th className="px-4 py-2">PO Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No logs found.</td>
                    </tr>
                  ) : (
                    movements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-800/20">
                        <td className="px-4 py-2 text-slate-500">{new Date(mov.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 font-medium text-slate-200">{mov.product.name}</td>
                        <td className="px-4 py-2 text-slate-400">{mov.location}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            mov.type === 'IN' || mov.type === 'RETURN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                            mov.type === 'OUT' || mov.type === 'SALE' ? 'bg-red-950 text-red-400 border border-red-900' :
                            'bg-blue-950 text-blue-400 border border-blue-900'
                          }`}>
                            {mov.type}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-right font-bold ${mov.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </td>
                        <td className="px-4 py-2 text-slate-400 truncate max-w-[80px]">{mov.user.name}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono">{mov.reference || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* History Pagination */}
            {movPagination.pages > 1 && (
              <div className="flex justify-between items-center mt-4 border-t border-slate-800 pt-3 text-xs">
                <span className="text-slate-500">Page {movPagination.page} of {movPagination.pages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={movPagination.page === 1}
                    onClick={() => setMovPage(movPagination.page - 1)}
                    className="px-2 py-0.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={movPagination.page === movPagination.pages}
                    onClick={() => setMovPage(movPagination.page + 1)}
                    className="px-2 py-0.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

export default Inventory;
