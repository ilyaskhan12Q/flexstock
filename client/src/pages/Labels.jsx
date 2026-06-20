import React, { useState, useEffect } from 'react';
import API from '../api';
import { Tag, Printer, Download, Search, Plus, Minus, CheckSquare, Square } from 'lucide-react';

function Labels() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // { productId: qty }
  const [template, setTemplate] = useState('2x4');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  useEffect(() => {
    loadProducts();
  }, [search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get('/products', { params: { search: search || undefined, limit: 30 } });
      setProducts(res.data.products || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (id) => {
    setSelected(prev => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = 1;
      }
      return copy;
    });
  };

  const updateQty = (id, delta) => {
    setSelected(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const selectedCount = Object.keys(selected).length;
  const totalLabels = Object.values(selected).reduce((s, q) => s + q, 0);

  const handleGeneratePDF = async () => {
    if (!selectedCount) return;
    try {
      setGenerating(true);
      const payload = {
        template,
        products: Object.entries(selected).map(([id, qty]) => ({ id, qty }))
      };
      const res = await API.post('/labels/generate/pdf', payload, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      alert('Failed to generate label PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleBarcodePreview = async (product) => {
    const url = `/api/v1/labels/barcode?value=${encodeURIComponent(product.barcodeValue || product.sku)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-950/40 border border-amber-900/60 rounded-lg">
            <Tag className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Label & Barcode Printing</h1>
            <p className="text-xs text-slate-500 mt-0.5">Select products, set label quantity, choose layout, and print</p>
          </div>
        </div>

        {/* Print Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            value={template}
            onChange={e => setTemplate(e.target.value)}
          >
            <option value="2x4">Layout: 2×4 (Standard)</option>
            <option value="3x5">Layout: 3×5 (Large)</option>
            <option value="single">Layout: Single Full Page</option>
          </select>

          <button
            onClick={handleGeneratePDF}
            disabled={!selectedCount || generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            {generating ? 'Generating...' : `Print ${totalLabels} Label${totalLabels !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Summary row */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-300 text-sm">
          <CheckSquare className="w-4 h-4" />
          <span>{selectedCount} product{selectedCount !== 1 ? 's' : ''} selected — {totalLabels} total labels to print</span>
          <button
            onClick={() => setSelected({})}
            className="ml-auto text-xs text-amber-500 hover:text-amber-300 underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Product Search & Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 pl-9 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {loading && (
                <div className="py-8 text-center text-slate-500 text-sm">Loading products...</div>
              )}
              {!loading && products.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-sm">No products found.</div>
              )}
              {products.map(prod => {
                const isSelected = !!selected[prod.id];
                const qty = selected[prod.id] || 1;
                const mainStock = prod.inventory?.find(i => i.location === 'Main')?.quantity ?? 0;

                return (
                  <div
                    key={prod.id}
                    className={`py-3 flex items-center gap-4 cursor-pointer hover:bg-slate-800/20 rounded-lg px-2 transition ${isSelected ? 'bg-amber-950/10' : ''}`}
                  >
                    <button onClick={() => toggleProduct(prod.id)} className="flex-shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-amber-400" />
                        : <Square className="w-5 h-5 text-slate-600" />
                      }
                    </button>

                    <div className="flex-1 min-w-0" onClick={() => toggleProduct(prod.id)}>
                      <p className="text-sm font-semibold text-slate-200 truncate">{prod.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{prod.sku} · Stock: {mainStock} {prod.unit}</p>
                    </div>

                    <div className="text-right text-sm font-bold text-emerald-400 min-w-[70px]">
                      {currencySymbol} {parseFloat(prod.price || 0).toFixed(2)}
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQty(prod.id, -1); }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-slate-200">{qty}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQty(prod.id, 1); }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); handleBarcodePreview(prod); }}
                      title="Preview barcode"
                      className="p-1.5 text-slate-600 hover:text-amber-400 rounded transition flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Label Template Preview */}
        <div className="space-y-4">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Label Layout Preview</h3>
            <div className="bg-white rounded-lg p-4 aspect-[210/297] flex flex-col gap-2">
              {template === '2x4' && (
                <div className="grid grid-cols-3 gap-1 h-full">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-gray-300 rounded flex flex-col items-center justify-center p-1 text-gray-800 text-center">
                      <div className="text-[6px] font-bold leading-none">STORE</div>
                      <div className="text-[5px] mt-0.5 leading-none">Product Name</div>
                      <div className="text-[5px] font-bold mt-0.5 leading-none">PKR 120.00</div>
                      <div className="text-[4px] mt-0.5 leading-none font-mono">||| SKU |||</div>
                    </div>
                  ))}
                </div>
              )}
              {template === '3x5' && (
                <div className="grid grid-cols-2 gap-1 h-full">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border border-gray-300 rounded flex flex-col items-center justify-center p-2 text-gray-800 text-center">
                      <div className="text-[7px] font-bold leading-none">STORE NAME</div>
                      <div className="text-[6px] mt-1 leading-none">Product Name</div>
                      <div className="text-[7px] font-bold mt-1 leading-none">PKR 120.00</div>
                      <div className="text-[5px] mt-1 leading-none font-mono">||||||||||||||</div>
                    </div>
                  ))}
                </div>
              )}
              {template === 'single' && (
                <div className="border-2 border-gray-300 rounded flex flex-col items-center justify-center h-full text-gray-800 text-center gap-2">
                  <div className="text-xs font-bold">STORE NAME</div>
                  <div className="text-sm font-medium">Product Name Here</div>
                  <div className="text-base font-bold">PKR 120.00</div>
                  <div className="text-xs font-mono tracking-widest">|||||||||||||||||||||</div>
                  <div className="text-[10px]">SKU-CODE-123</div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">A4 paper label layout preview</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-400">How it works:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Select products using the checkboxes</li>
              <li>Set how many labels per product</li>
              <li>Choose a label layout template</li>
              <li>Click Print — a PDF opens in a new tab</li>
              <li>Use your browser's print dialog to print</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Labels;
