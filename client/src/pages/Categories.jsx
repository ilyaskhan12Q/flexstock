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
    <div className="space-y-6">
      
      {/* Toast Alert Info Block */}
      {message && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Info className="w-4 h-4 text-blue-400" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-xs font-semibold text-slate-500 hover:text-slate-300">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Create / List Categories */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Create Category Form */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
            <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-400" />
              <span>{editingCatId ? 'Edit Category' : 'Create Category'}</span>
            </h3>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medicines, Electronics"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 outline-none text-sm"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                <textarea
                  placeholder="Describe what items fit here..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 outline-none text-sm"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Theme Color</label>
                  <input
                    type="color"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg h-9 p-1 cursor-pointer"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Icon Identifier</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none text-sm"
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

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCatId ? 'Save Category' : 'Create'}</span>
                </button>
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => { setEditingCatId(null); setCatName(''); setCatDesc(''); }}
                    className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Categories List */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      isSelected 
                        ? 'bg-slate-800/80 border-blue-500' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }} />
                      <div>
                        <h4 className="font-semibold text-sm text-slate-200">{cat.name}</h4>
                        <p className="text-xs text-slate-500">{cat.fields?.length || 0} custom fields</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditCategoryStart(cat)}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
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
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel space-y-6">
              
              {/* Category Header metadata info */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory.color || '#3b82f6' }} />
                    <h2 className="text-lg font-bold text-slate-100">{selectedCategory.name} Schema Designer</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedCategory.description || 'No description provided.'}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddFieldDef}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Custom Field</span>
                  </button>
                  
                  <button
                    onClick={handleSaveSchema}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Schema</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Field Rows */}
              <div className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <Settings className="w-12 h-12 mx-auto text-slate-600 stroke-1" />
                    <p className="font-medium text-sm">No custom fields defined yet.</p>
                    <p className="text-xs">Add custom attributes like Expire Date, Batch No, or Strength to capture client-specific metrics.</p>
                  </div>
                ) : (
                  fields.map((field, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center">
                      
                      {/* Drag / Sort position controllers */}
                      <div className="flex md:flex-col gap-1 items-center justify-center">
                        <button
                          onClick={() => handleMoveField(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-slate-600">{idx + 1}</span>
                        <button
                          onClick={() => handleMoveField(idx, 'down')}
                          disabled={idx === fields.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Attribute inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Field Label</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Expire Date"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                            value={field.label}
                            onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Field Type</label>
                          <select
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
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
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            {field.fieldType === 'DROPDOWN' ? 'Dropdown Options' : 'Suffix / Unit'}
                          </label>
                          {field.fieldType === 'DROPDOWN' ? (
                            <input
                              type="text"
                              placeholder="Red, Green, Blue"
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                              value={field.options.join(', ')}
                              onChange={(e) => handleFieldChange(idx, 'options', e.target.value)}
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. mg, ml, kg"
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
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
                            className="w-4 h-4 rounded bg-slate-900 border border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                            checked={field.isRequired}
                            onChange={(e) => handleFieldChange(idx, 'isRequired', e.target.checked)}
                          />
                          <label htmlFor={`req-${idx}`} className="text-xs text-slate-400 cursor-pointer select-none">Mandatory</label>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFieldDef(idx)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-lg border border-transparent hover:border-slate-800 transition md:mt-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  ))
                )}
              </div>

            </div>
          ) : (
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel h-full flex flex-col justify-center items-center text-slate-500 text-center">
              <FolderPlus className="w-16 h-16 text-slate-700 stroke-1 mb-4" />
              <h3 className="font-semibold text-slate-300">Select or Create a Category</h3>
              <p className="text-xs max-w-sm mt-1">Pick a category from the left pane to manage its dynamic custom database properties and schemas.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default Categories;
