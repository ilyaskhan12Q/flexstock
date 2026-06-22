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
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl shadow-premium">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Label & Barcode Printing</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select products, set label quantity, choose layout, and print</p>
          </div>
        </div>

        {/* Print Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input-field-sm w-auto h-9 cursor-pointer"
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
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-md text-xs font-semibold transition cursor-pointer shadow-premium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {generating ? 'Generating...' : `Print ${totalLabels} Label${totalLabels !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Summary row */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-premium">
          <CheckSquare className="w-4 h-4" />
          <span>{selectedCount} product{selectedCount !== 1 ? 's' : ''} selected — {totalLabels} total labels to print</span>
          <button
            onClick={() => setSelected({})}
            className="ml-auto text-xs text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 underline cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Product Search & Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU..."
                  className="input-field-sm pl-9 py-2 bg-background/50"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="divide-y divide-border">
              {loading && (
                <div className="py-8 text-center text-muted-foreground text-xs">Loading products...</div>
              )}
              {!loading && products.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-xs">No products found.</div>
              )}
              {products.map(prod => {
                const isSelected = !!selected[prod.id];
                const qty = selected[prod.id] || 1;
                const mainStock = prod.inventory?.find(i => i.location === 'Main')?.quantity ?? 0;

                return (
                  <div
                    key={prod.id}
                    className={`py-3 flex items-center gap-4 cursor-pointer hover:bg-secondary/40 rounded-lg px-2 transition ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <button onClick={() => toggleProduct(prod.id)} className="flex-shrink-0 cursor-pointer">
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-primary" />
                        : <Square className="w-5 h-5 text-muted-foreground/60" />
                      }
                    </button>

                    <div className="flex-1 min-w-0" onClick={() => toggleProduct(prod.id)}>
                      <p className="text-sm font-semibold text-foreground truncate">{prod.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{prod.sku} · Stock: {mainStock} {prod.unit}</p>
                    </div>

                    <div className="text-right text-sm font-bold text-foreground min-w-[70px]">
                      {currencySymbol} {parseFloat(prod.price || 0).toFixed(2)}
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQty(prod.id, -1); }}
                          className="p-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground cursor-pointer shadow-premium"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-foreground">{qty}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQty(prod.id, 1); }}
                          className="p-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground cursor-pointer shadow-premium"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); handleBarcodePreview(prod); }}
                      title="Preview barcode"
                      className="p-1.5 text-muted-foreground hover:text-primary rounded transition flex-shrink-0 cursor-pointer"
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
          <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
            <h3 className="text-sm font-bold text-foreground mb-4">Label Layout Preview</h3>
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
            <p className="text-xs text-muted-foreground mt-2 text-center">A4 paper label layout preview</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/40 glass-panel shadow-premium text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground/90">How it works:</p>
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
