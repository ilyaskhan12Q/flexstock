import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import {
  Settings as SettingsIcon,
  Building2,
  MapPin,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  Plus,
  Trash2,
  Save,
  Mail,
  ShieldCheck,
  ImagePlus,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-glass border text-sm font-semibold transition-all
      ${type === 'success' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-red-950 border-red-800 text-red-300'}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {message}
    </div>
  );
}

function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [newLocation, setNewLocation] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef();

  const showToast = (type, message) => setToast({ type, message });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get('/settings');
      setSettings(res.data);
      if (res.data.logoUrl) setLogoPreview(res.data.logoUrl);
    } catch (err) {
      showToast('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleModuleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      modules: { ...prev.modules, [key]: !prev.modules[key] }
    }));
  };

  const handleSmtpChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      smtp: { ...prev.smtp, [field]: value }
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();

      // Append all top-level string/number settings
      formData.append('businessName', settings.businessName || '');
      formData.append('businessAddress', settings.businessAddress || '');
      formData.append('currencySymbol', settings.currencySymbol || 'PKR');
      formData.append('dateFormat', settings.dateFormat || 'DD/MM/YYYY');
      formData.append('defaultMinStock', settings.defaultMinStock || 5);
      formData.append('modules', JSON.stringify(settings.modules || {}));
      formData.append('smtp', JSON.stringify(settings.smtp || {}));

      // Logo file
      if (logoInputRef.current?.files[0]) {
        formData.append('logo', logoInputRef.current.files[0]);
      }

      const res = await API.patch('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSettings(res.data);
      showToast('success', 'Settings saved successfully');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    try {
      const res = await API.post('/settings/locations', { name: newLocation.trim() });
      setSettings(prev => ({ ...prev, locations: res.data.locations }));
      setNewLocation('');
      showToast('success', `Location "${newLocation}" added`);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to add location');
    }
  };

  const handleRemoveLocation = async (name) => {
    if (!confirm(`Remove location "${name}"? This cannot be undone.`)) return;
    try {
      const res = await API.delete(`/settings/locations/${encodeURIComponent(name)}`);
      setSettings(prev => ({ ...prev, locations: res.data.locations }));
      showToast('success', `Location "${name}" removed`);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to remove location');
    }
  };

  const handleBackup = async () => {
    try {
      const res = await API.get('/settings/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `flexstock-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Backup downloaded successfully');
    } catch {
      showToast('error', 'Failed to generate backup');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950/40 border border-blue-900/60 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">System Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">Configure business details, locations, and module toggles</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg text-sm font-semibold transition shadow-premium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* ── Business Information ──────────────────────────── */}
      <Section icon={<Building2 className="w-4 h-4 text-emerald-400" />} title="Business Information"
        desc="This information appears on all reports and PDF exports">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business / Store Name">
            <input
              type="text"
              className="input-field"
              value={settings.businessName || ''}
              onChange={e => handleChange('businessName', e.target.value)}
              placeholder="Al-Noor Pharmacy"
            />
          </Field>
          <Field label="Currency Symbol">
            <input
              type="text"
              className="input-field"
              value={settings.currencySymbol || ''}
              onChange={e => handleChange('currencySymbol', e.target.value)}
              placeholder="PKR"
              maxLength={6}
            />
          </Field>
          <Field label="Business Address">
            <textarea
              rows={2}
              className="input-field resize-none"
              value={settings.businessAddress || ''}
              onChange={e => handleChange('businessAddress', e.target.value)}
              placeholder="123 Main Street, City"
            />
          </Field>
          <Field label="Date Format">
            <select
              className="input-field"
              value={settings.dateFormat || 'DD/MM/YYYY'}
              onChange={e => handleChange('dateFormat', e.target.value)}
            >
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </Field>
        </div>

        {/* Logo Upload */}
        <div className="mt-4">
          <label className="label-text">Business Logo</label>
          <div className="flex items-center gap-4 mt-1.5">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-slate-700 bg-slate-900 p-1" />
            ) : (
              <div className="h-16 w-16 rounded-lg border border-dashed border-slate-700 bg-slate-900 flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-slate-600" />
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              >
                Upload Logo
              </button>
              <p className="text-xs text-slate-500 mt-1">PNG/JPG, max 2MB. Used in PDF reports and labels.</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </div>

        {/* Default Min Stock */}
        <div className="mt-4 max-w-xs">
          <Field label="Default Low Stock Threshold">
            <input
              type="number"
              min={0}
              className="input-field"
              value={settings.defaultMinStock ?? 5}
              onChange={e => handleChange('defaultMinStock', parseInt(e.target.value))}
            />
            <p className="text-xs text-slate-500 mt-1">Applied automatically to new products when no threshold is set.</p>
          </Field>
        </div>
      </Section>

      {/* ── Locations ────────────────────────────────────── */}
      <Section icon={<MapPin className="w-4 h-4 text-purple-400" />} title="Warehouse / Store Locations"
        desc="Manage where stock is tracked. Each product's inventory is tracked per location.">
        <div className="space-y-2 mb-3">
          {(settings.locations || ['Main']).map(loc => (
            <div key={loc} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">{loc}</span>
                {loc === 'Main' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900 font-bold">DEFAULT</span>
                )}
              </div>
              {loc !== 'Main' && (
                <button
                  onClick={() => handleRemoveLocation(loc)}
                  className="p-1 text-slate-600 hover:text-red-400 rounded transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="New location name (e.g. Store Front, Warehouse B)"
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
          />
          <button
            onClick={handleAddLocation}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </Section>

      {/* ── Optional Modules ─────────────────────────────── */}
      <Section icon={<ToggleRight className="w-4 h-4 text-amber-400" />} title="Optional Modules"
        desc="Enable or disable optional features for this deployment">
        <div className="space-y-3">
          <ModuleToggle
            label="Sales Tracking Module"
            desc="Enables the POS checkout screen, sale receipts, and sales history"
            enabled={settings.modules?.salesEnabled}
            onToggle={() => handleModuleToggle('salesEnabled')}
          />
          <ModuleToggle
            label="Label & Barcode Printing"
            desc="Enables PDF label sheet generation and barcode printing from product pages"
            enabled={settings.modules?.labelPrintingEnabled}
            onToggle={() => handleModuleToggle('labelPrintingEnabled')}
          />
          <ModuleToggle
            label="Thermal Printer (QZ Tray)"
            desc="Enables ZPL output for Zebra and ESC/P thermal printers via QZ Tray (requires QZ Tray installed locally)"
            enabled={settings.modules?.thermalPrinting}
            onToggle={() => handleModuleToggle('thermalPrinting')}
          />
        </div>
      </Section>

      {/* ── Email Alerts (SMTP) ──────────────────────────── */}
      <Section icon={<Mail className="w-4 h-4 text-blue-400" />} title="Email Alerts (Optional)"
        desc="Configure SMTP to receive low-stock digest emails. Leave blank to disable.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SMTP Host">
            <input type="text" className="input-field" value={settings.smtp?.host || ''} onChange={e => handleSmtpChange('host', e.target.value)} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="SMTP Port">
            <input type="number" className="input-field" value={settings.smtp?.port || 587} onChange={e => handleSmtpChange('port', parseInt(e.target.value))} />
          </Field>
          <Field label="SMTP Username">
            <input type="text" className="input-field" value={settings.smtp?.user || ''} onChange={e => handleSmtpChange('user', e.target.value)} placeholder="alerts@yourstore.com" />
          </Field>
          <Field label="SMTP Password">
            <input type="password" className="input-field" onChange={e => handleSmtpChange('password', e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Alert Recipient Email">
            <input type="email" className="input-field" value={settings.smtp?.alertEmail || ''} onChange={e => handleSmtpChange('alertEmail', e.target.value)} placeholder="owner@yourstore.com" />
          </Field>
        </div>
      </Section>

      {/* ── Backup & Security ────────────────────────────── */}
      <Section icon={<ShieldCheck className="w-4 h-4 text-red-400" />} title="Data Backup"
        desc="Export a full JSON backup of all your inventory data. Store it safely.">
        <button
          onClick={handleBackup}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold border border-slate-700 transition"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Download Full Database Backup
        </button>
        <p className="text-xs text-slate-500 mt-2">Downloads all users, products, categories, inventory, movements, and sales as a JSON file.</p>
      </Section>

    </div>
  );
}

// ── Reusable Sub-Components ──────────────────────────────────

function Section({ icon, title, desc, children }) {
  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel space-y-4">
      <div className="flex items-start gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 bg-slate-800/60 rounded-lg mt-0.5">{icon}</div>
        <div>
          <h2 className="text-sm font-bold text-slate-200">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ModuleToggle({ label, desc, enabled, onToggle }) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 p-1 rounded-full transition ${enabled ? 'text-emerald-400' : 'text-slate-600'}`}
      >
        {enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}

export default Settings;
