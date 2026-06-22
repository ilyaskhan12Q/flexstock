import React, { useState, useEffect } from 'react';
import API from '../api';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  FolderPlus, 
  Check, 
  MoveUp, 
  MoveDown,
  Info
} from 'lucide-react';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Category Form State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catIcon, setCatIcon] = useState('Folder');
  const [editingCatId, setEditingCatId] = useState(null);

  // Fields Form State
  const [fields, setFields] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await API.get('/categories');
      setCategories(res.data);
      if (res.data.length > 0 && !selectedCategory) {
        handleSelectCategory(res.data[0]);
      } else if (selectedCategory) {
        // Refresh selected category fields
        const refreshed = res.data.find(c => c.id === selectedCategory.id);
        if (refreshed) {
          handleSelectCategory(refreshed);
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    // Deep clone fields to prevent mutating states directly
    setFields(
      cat.fields.map(f => ({
        id: f.id,
        label: f.label,
        key: f.key,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        options: Array.isArray(f.options) ? f.options : JSON.parse(f.options || '[]'),
        unit: f.unit || '',
        sortOrder: f.sortOrder
      }))
    );
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;

    try {
      if (editingCatId) {
        const res = await API.patch(`/categories/${editingCatId}`, {
          name: catName,
          description: catDesc,
          color: catColor,
          icon: catIcon
        });
        setMessage('Category updated successfully');
        setEditingCatId(null);
      } else {
        const res = await API.post('/categories', {
          name: catName,
          description: catDesc,
          color: catColor,
          icon: catIcon,
          fields: []
        });
        setMessage('Category created successfully');
      }
      setCatName('');
      setCatDesc('');
      fetchCategories();
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleEditCategoryStart = (cat) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatColor(cat.color || '#3b82f6');
    setCatIcon(cat.icon || 'Folder');
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this category? This will fail if products exist.')) return;
    try {
      await API.delete(`/categories/${catId}`);
      setMessage('Category deleted successfully');
      setSelectedCategory(null);
      fetchCategories();
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  // Add Dynamic Custom Field Definition to Local Array
  const handleAddFieldDef = () => {
    const newField = {
      label: '',
      key: '',
      fieldType: 'TEXT',
      isRequired: false,
      options: [],
      unit: '',
      sortOrder: fields.length
    };
    setFields([...fields, newField]);
  };

  const handleRemoveFieldDef = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, key, val) => {
    const updated = [...fields];
    if (key === 'options') {
      updated[index][key] = val.split(',').map(o => o.trim());
    } else {
      updated[index][key] = val;
    }
    setFields(updated);
  };

  const handleMoveField = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate sort orders
    const resort = updated.map((f, i) => ({ ...f, sortOrder: i }));
    setFields(resort);
  };

  const handleSaveSchema = async () => {
    if (!selectedCategory) return;
    try {
      // Validate field labels
      if (fields.some(f => !f.label.trim())) {
        alert('All fields must have a label');
        return;
      }

      await API.patch(`/categories/${selectedCategory.id}`, {
        name: selectedCategory.name,
        description: selectedCategory.description,
        color: selectedCategory.color,
        icon: selectedCategory.icon,
        fields: fields.map(f => ({
          ...f,
          options: f.fieldType === 'DROPDOWN' ? JSON.stringify(f.options) : null
        }))
      });
      setMessage('Category schema saved successfully');
      fetchCategories();
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Toast Alert Info Block */}
      {message && (
        <div className="p-4 rounded-xl bg-secondary/40 border border-border flex justify-between items-center text-xs shadow-premium glass-panel">
          <div className="flex items-center gap-2 text-foreground">
            <Info className="w-4 h-4 text-primary" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer transition">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Side: Create / List Categories */}
        <div className="space-y-5 lg:col-span-1">
          
          {/* Create Category Form */}
          <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
            <h3 className="text-xs font-bold text-foreground mb-3.5 flex items-center gap-2 uppercase tracking-wider text-muted-foreground/80">
              <FolderPlus className="w-4.5 h-4.5 text-primary" />
              <span>{editingCatId ? 'Edit Category' : 'Create Category'}</span>
            </h3>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="label-text">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medicines, Electronics"
                  className="input-field-sm"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text">Description</label>
                <textarea
                  placeholder="Describe what items fit here..."
                  rows={2}
                  className="input-field-sm py-2 resize-none"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Theme Color</label>
                  <input
                    type="color"
                    className="w-full bg-background border border-border rounded-md h-8 p-1 cursor-pointer transition focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Icon Identifier</label>
                  <select
                    className="input-field-sm"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                  >
                    <option value="Folder">Folder</option>
                    <option value="Pills">Pills / Medicines</option>
                    <option value="Cpu">CPU / Hardware</option>
                    <option value="Shirt">Shirt / Clothes</option>
                    <option value="Wine">Wine / Drinks</option>
                    <option value="Coffee">Coffee / Food</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-md bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-premium"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCatId ? 'Save' : 'Create'}</span>
                </button>
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => { setEditingCatId(null); setCatName(''); setCatDesc(''); }}
                    className="px-3 py-1.5 rounded-md bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition shadow-premium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Categories List */}
          <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
            <h3 className="text-xs font-bold text-foreground mb-3.5 uppercase tracking-wider text-muted-foreground/80">Categories</h3>
            <div className="space-y-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`p-2.5 rounded-md border flex items-center justify-between cursor-pointer transition ${
                      isSelected 
                        ? 'bg-secondary/60 border-primary' 
                        : 'bg-background/40 border-border/80 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: cat.color || '#3b82f6' }} />
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{cat.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{cat.fields?.length || 0} custom fields</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditCategoryStart(cat)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted/50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: dynamic Schema Custom Field Designer */}
        <div className="lg:col-span-2">
          {selectedCategory ? (
            <div className="p-6 rounded-xl border border-border bg-card/50 glass-panel shadow-premium space-y-6">
              
              {/* Category Header metadata info */}
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: selectedCategory.color || '#3b82f6' }} />
                    <h2 className="text-sm font-bold text-foreground">{selectedCategory.name} Schema Designer</h2>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{selectedCategory.description || 'No description provided.'}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddFieldDef}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                  
                  <button
                    onClick={handleSaveSchema}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Schema</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Field Rows */}
              <div className="space-y-3">
                {fields.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <Settings className="w-10 h-10 mx-auto text-muted-foreground/30 stroke-1" />
                    <p className="font-semibold text-xs text-foreground">No custom fields defined yet.</p>
                    <p className="text-[10px] max-w-sm mx-auto text-muted-foreground">Add custom attributes like Expire Date, Batch No, or Strength to capture client-specific metrics.</p>
                  </div>
                ) : (
                  fields.map((field, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-background/50 border border-border/80 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-premium">
                      
                      {/* Drag / Sort position controllers */}
                      <div className="flex md:flex-col gap-1 items-center justify-center">
                        <button
                          onClick={() => handleMoveField(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition cursor-pointer"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                        <button
                          onClick={() => handleMoveField(idx, 'down')}
                          disabled={idx === fields.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition cursor-pointer"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Attribute inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
                        <div>
                          <label className="label-text mb-1 block">Field Label</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Expire Date"
                            className="input-field-sm"
                            value={field.label}
                            onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="label-text mb-1 block">Field Type</label>
                          <select
                            className="input-field-sm"
                            value={field.fieldType}
                            onChange={(e) => handleFieldChange(idx, 'fieldType', e.target.value)}
                          >
                            <option value="TEXT">Short Text</option>
                            <option value="NUMBER">Number</option>
                            <option value="DATE">Date Picker</option>
                            <option value="DROPDOWN">Dropdown List</option>
                            <option value="BOOLEAN">Yes / No Switch</option>
                            <option value="TEXTAREA">Long Textarea</option>
                          </select>
                        </div>

                        <div>
                          <label className="label-text mb-1 block">
                            {field.fieldType === 'DROPDOWN' ? 'Dropdown Options' : 'Suffix / Unit'}
                          </label>
                          {field.fieldType === 'DROPDOWN' ? (
                            <input
                              type="text"
                              placeholder="Red, Green, Blue"
                              className="input-field-sm"
                              value={field.options.join(', ')}
                              onChange={(e) => handleFieldChange(idx, 'options', e.target.value)}
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. mg, ml, kg"
                              className="input-field-sm"
                              value={field.unit}
                              disabled={field.fieldType === 'BOOLEAN' || field.fieldType === 'DATE'}
                              onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id={`req-${idx}`}
                            className="w-3.5 h-3.5 rounded bg-background border-border text-primary focus:ring-0 cursor-pointer"
                            checked={field.isRequired}
                            onChange={(e) => handleFieldChange(idx, 'isRequired', e.target.checked)}
                          />
                          <label htmlFor={`req-${idx}`} className="text-xs text-muted-foreground cursor-pointer select-none">Mandatory</label>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFieldDef(idx)}
                        className="p-2 text-muted-foreground hover:text-red-500 rounded-md border border-border hover:bg-muted/50 transition md:mt-4 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  ))
                )}
              </div>

            </div>
          ) : (
            <div className="p-12 rounded-xl border border-border bg-card/50 glass-panel shadow-premium h-full flex flex-col justify-center items-center text-muted-foreground text-center">
              <FolderPlus className="w-12 h-12 text-muted-foreground/20 stroke-1 mb-3" />
              <h3 className="font-semibold text-xs text-foreground">Select or Create a Category</h3>
              <p className="text-[10px] max-w-sm mt-1">Pick a category from the left pane to manage its dynamic custom database properties and schemas.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default Categories;
