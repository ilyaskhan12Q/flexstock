import React, { useState, useEffect } from 'react';
import API from '../api';
import { 
  Package, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Trash2, 
  Edit2, 
  X,
  Upload,
  AlertTriangle,
  Printer
} from 'lucide-react';

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form Fields State
  const [formCategory, setFormCategory] = useState('');
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formBarcode, setFormBarcode] = useState('');
  const [formImage, setFormImage] = useState(null);
  
  // Custom Dynamic Fields Values
  const [customFieldsValues, setCustomFieldsValues] = useState({});
  const [currentCategorySchema, setCurrentCategorySchema] = useState([]);

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  
  // Print Labels State
  const [printQty, setPrintQty] = useState(1);
  const [printTemplate, setPrintTemplate] = useState('2x4');

  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategoryFilter, page]);

  // Fetch schema config on category change in form
  useEffect(() => {
    if (formCategory) {
      const cat = categories.find(c => c.id === formCategory);
      if (cat) {
        setCurrentCategorySchema(cat.fields || []);
        // Initialize dynamic fields values
        const initialVals = {};
        cat.fields.forEach(f => {
          initialVals[f.key] = selectedProduct?.customFields?.[f.key] !== undefined 
            ? selectedProduct.customFields[f.key] 
            : (f.fieldType === 'BOOLEAN' ? false : '');
        });
        setCustomFieldsValues(initialVals);
      }
    } else {
      setCurrentCategorySchema([]);
      setCustomFieldsValues({});
    }
  }, [formCategory, selectedProduct, categories]);

  const fetchCategories = async () => {
    try {
      const res = await API.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get('/products', {
        params: {
          search,
          categoryId: selectedCategoryFilter || undefined,
          page,
          limit: 10
        }
      });
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    setSelectedProduct(null);
    setFormCategory('');
    setFormName('');
    setFormSku('');
    setFormDescription('');
    setFormPrice('');
    setFormCostPrice('');
    setFormUnit('pcs');
    setFormBarcode('');
    setFormImage(null);
    setCustomFieldsValues({});
    setFormOpen(true);
  };

  const handleOpenEditForm = (prod) => {
    setSelectedProduct(prod);
    setFormCategory(prod.categoryId);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormDescription(prod.description || '');
    setFormPrice(prod.price || '');
    setFormCostPrice(prod.costPrice || '');
    setFormUnit(prod.unit || 'pcs');
    setFormBarcode(prod.barcodeValue || '');
    setFormImage(null);
    setFormOpen(true);
  };

  const handleDynamicFieldChange = (key, value, type) => {
    let finalVal = value;
    if (type === 'BOOLEAN') {
      finalVal = value === true;
    }
    setCustomFieldsValues({
      ...customFieldsValues,
      [key]: finalVal
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    
    // Construct Multi-part Form Data
    const formData = new FormData();
    formData.append('categoryId', formCategory);
    formData.append('name', formName);
    formData.append('sku', formSku);
    formData.append('description', formDescription);
    formData.append('price', formPrice);
    formData.append('costPrice', formCostPrice);
    formData.append('unit', formUnit);
    formData.append('barcodeValue', formBarcode);
    formData.append('customFields', JSON.stringify(customFieldsValues));
    
    if (formImage) {
      formData.append('image', formImage);
    }

    try {
      if (selectedProduct) {
        await API.patch(`/products/${selectedProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await API.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setFormOpen(false);
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Deactivate this product from listing?')) return;
    try {
      await API.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await API.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResults(res.data);
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  // Open Barcode labels Modal
  const handleOpenPrintModal = (prod) => {
    setSelectedProduct(prod);
    setPrintQty(1);
    setLabelOpen(true);
  };

  const handleDownloadLabelsPDF = async () => {
    if (!selectedProduct) return;
    try {
      const res = await API.post('/labels/generate/pdf', {
        products: [{ id: selectedProduct.id, qty: printQty }],
        template: printTemplate
      }, { responseType: 'blob' });

      const fileURL = window.URL.createObjectURL(new Blob([res.data]));
      const fileLink = document.createElement('a');
      fileLink.href = fileURL;
      fileLink.setAttribute('download', `labels-${selectedProduct.sku}.pdf`);
      document.body.appendChild(fileLink);
      fileLink.click();
      fileLink.remove();
      setLabelOpen(false);
    } catch (err) {
      alert(`Failed to download labels: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Action Bars */}
      <div className="flex flex-col sm:flex-row gap-3.5 justify-between items-center bg-card/40 p-6 border border-border rounded-xl glass-panel shadow-premium">
        
        {/* Search & Category Filter */}
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search by name, SKU or barcode..."
              className="input-field-sm pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="input-field-sm"
            value={selectedCategoryFilter}
            onChange={(e) => { setSelectedCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setImportOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Import</span>
          </button>
          
          <button
            onClick={handleOpenCreateForm}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

      </div>

      {/* Grid listing catalog */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-border bg-card/50 glass-panel shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-foreground">
              <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">SKU / Barcode</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-center">Attributes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No products found in catalog.</td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {prod.imageUrl ? (
                          <img src={`http://localhost:3000${prod.imageUrl}`} alt={prod.name} className="w-8 h-8 object-cover rounded border border-border" />
                        ) : (
                          <div className="w-8 h-8 bg-muted border border-border rounded flex items-center justify-center text-muted-foreground/60">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-foreground font-medium">{prod.sku}</div>
                        <div className="text-[10px] text-muted-foreground">{prod.barcodeValue}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{prod.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{prod.category?.name}</td>
                      <td className="px-4 py-3 text-right text-emerald-500 font-bold">{currencySymbol} {parseFloat(prod.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{currencySymbol} {parseFloat(prod.costPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {/* Dynamic Custom Fields attributes preview tags */}
                        <div className="flex flex-wrap gap-1 justify-center max-w-[200px] mx-auto">
                          {Object.entries(prod.customFields || {}).map(([key, val]) => (
                            <span key={key} className="text-[9px] bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                              {key}: {val.toString()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenPrintModal(prod)}
                            className="p-1.5 text-muted-foreground hover:text-emerald-500 hover:bg-muted/50 rounded-md transition"
                            title="Print labels"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditForm(prod)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition"
                            title="Edit details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted/50 rounded-md transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-5 border-t border-border pt-4 text-xs">
              <span className="text-muted-foreground">Showing page {pagination.page} of {pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => setPage(pagination.page - 1)}
                  className="px-3 py-1 bg-secondary border border-border hover:bg-secondary/80 rounded text-xs font-semibold disabled:opacity-40 text-foreground transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPage(pagination.page + 1)}
                  className="px-3 py-1 bg-secondary border border-border hover:bg-secondary/80 rounded text-xs font-semibold disabled:opacity-40 text-foreground transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL FORM */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 shadow-glass max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground">{selectedProduct ? 'Edit Product Details' : 'Add New Product'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground transition cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Category Picker (locked on edit) */}
              <div>
                <label className="label-text">Category</label>
                <select
                  disabled={!!selectedProduct}
                  className="input-field-sm"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  required
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Grid 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Product Name</label>
                  <input
                    type="text"
                    className="input-field-sm"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label-text">SKU (Leave blank to auto-generate)</label>
                  <input
                    type="text"
                    className="input-field-sm font-mono"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    disabled={!!selectedProduct}
                  />
                </div>
              </div>

              {/* Grid 2: Pricing & Units */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Selling Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field-sm"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label-text">Cost Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field-sm"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label-text">Base Unit</label>
                  <input
                    type="text"
                    placeholder="pcs, box, pack"
                    className="input-field-sm"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
              </div>

              {/* Grid 3: Barcode & Image Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Barcode Value (EAN/UPC)</label>
                  <input
                    type="text"
                    className="input-field-sm"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label-text">Product Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-background border border-border rounded-md px-3 py-1 text-xs text-muted-foreground cursor-pointer transition focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    onChange={(e) => setFormImage(e.target.files[0])}
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Long Description</label>
                <textarea
                  rows={2}
                  className="input-field-sm py-2 resize-none"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* DYNAMIC SCHEMA CUSTOM FIELDS FORM SECTION */}
              {currentCategorySchema.length > 0 && (
                <div className="border-t border-border pt-4 space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Custom Attributes ({categories.find(c=>c.id === formCategory)?.name})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentCategorySchema.map((field) => {
                      const inputKey = field.key;
                      const val = customFieldsValues[inputKey] || '';
                      
                      return (
                        <div key={field.id}>
                          <label className="block text-[11px] font-semibold text-foreground/90 mb-1.5">
                            {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                            {field.unit && <span className="text-[9px] text-muted-foreground ml-1 font-normal">({field.unit})</span>}
                          </label>

                          {field.fieldType === 'DROPDOWN' ? (
                            <select
                              required={field.isRequired}
                              className="input-field-sm"
                              value={val}
                              onChange={(e) => handleDynamicFieldChange(inputKey, e.target.value, 'DROPDOWN')}
                            >
                              <option value="">Select option...</option>
                              {(Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]')).map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.fieldType === 'BOOLEAN' ? (
                            <div className="flex items-center gap-2 pt-1.5">
                              <input
                                type="checkbox"
                                id={`dynamic-${field.id}`}
                                className="w-4 h-4 rounded bg-background border border-border text-primary focus:ring-0 cursor-pointer transition-colors"
                                checked={!!val}
                                onChange={(e) => handleDynamicFieldChange(inputKey, e.target.checked, 'BOOLEAN')}
                              />
                              <label htmlFor={`dynamic-${field.id}`} className="text-xs text-muted-foreground cursor-pointer select-none">Yes</label>
                            </div>
                          ) : field.fieldType === 'TEXTAREA' ? (
                            <textarea
                              rows={2}
                              required={field.isRequired}
                              className="input-field-sm py-2 resize-none"
                              value={val}
                              onChange={(e) => handleDynamicFieldChange(inputKey, e.target.value, 'TEXTAREA')}
                            />
                          ) : (
                            <input
                              type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
                              required={field.isRequired}
                              className="input-field-sm"
                              value={val}
                              onChange={(e) => handleDynamicFieldChange(inputKey, e.target.value, field.fieldType)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-3.5 py-1.5 rounded-md bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition cursor-pointer shadow-premium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition cursor-pointer shadow-premium"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-glass space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground">CSV Bulk Import Products</h2>
              <button onClick={() => { setImportOpen(false); setImportResults(null); }} className="text-muted-foreground hover:text-foreground transition cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {!importResults ? (
              <form onSubmit={handleCsvImport} className="space-y-4">
                <div className="p-8 border border-dashed border-border rounded-xl flex flex-col items-center justify-center hover:border-primary/50 transition bg-background">
                  <Upload className="w-8 h-8 text-muted-foreground/60 mb-2" />
                  <input
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    className="text-xs text-muted-foreground file:mr-3.5 file:py-1 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-semibold file:bg-secondary file:text-foreground file:hover:bg-secondary/85 cursor-pointer"
                  />
                  <p className="text-[9px] text-muted-foreground mt-2 text-center">Required headers: categoryName, name. Optional: sku, price, costPrice, unit, barcodeValue.</p>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportOpen(false)}
                    className="px-3.5 py-1.5 rounded-md bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition shadow-premium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold transition cursor-pointer shadow-premium"
                  >
                    Start Import
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center">
                  {importResults.message}
                </div>

                {importResults.errors?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Failed Rows ({importResults.errors.length})</span>
                    </h4>
                    <div className="max-h-40 overflow-y-auto bg-background border border-border p-3 rounded-md divide-y divide-border">
                      {importResults.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400 py-1.5 font-mono">{err}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => { setImportOpen(false); setImportResults(null); }}
                  className="w-full py-1.5 bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT BARCODE LABELS CONFIG MODAL */}
      {labelOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-glass space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground">Print Product Labels</h2>
              <button onClick={() => setLabelOpen(false)} className="text-muted-foreground hover:text-foreground transition cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-text">Product Name</label>
                <div className="p-3 bg-background border border-border rounded-md font-semibold text-foreground text-xs shadow-inner">
                  {selectedProduct.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Print Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field-sm"
                    value={printQty}
                    onChange={(e) => setPrintQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Label Sheet Template</label>
                  <select
                    className="input-field-sm"
                    value={printTemplate}
                    onChange={(e) => setPrintTemplate(e.target.value)}
                  >
                    <option value="2x4">Medium Grid (2x4)</option>
                    <option value="3x5">Small Grid (3x5)</option>
                    <option value="single">Single Label Sheet (Large)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleDownloadLabelsPDF}
                className="w-full py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-md text-xs transition shadow-premium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Generate & Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Products;
