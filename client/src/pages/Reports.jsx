import React, { useState, useEffect } from 'react';
import API from '../api';
import { 
  TrendingUp, 
  FileSpreadsheet, 
  FileText, 
  BarChart4, 
  DollarSign, 
  Layers, 
  Package,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../hooks/useTheme';

function Reports() {
  const theme = useTheme();
  const isLight = theme === 'light';

  const [summary, setSummary] = useState(null);
  const [valuationData, setValuationData] = useState([]);
  const [loading, setLoading] = useState(true);

  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';
  const appName = import.meta.env.VITE_APP_NAME || 'FlexStock';

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [sumRes, valRes] = await Promise.all([
        API.get('/reports/stock'),
        API.get('/reports/valuation')
      ]);
      setSummary(sumRes.data);
      setValuationData(valRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await API.get('/reports/stock/export/pdf', { responseType: 'blob' });
      const fileURL = window.URL.createObjectURL(new Blob([res.data]));
      const fileLink = document.createElement('a');
      fileLink.href = fileURL;
      fileLink.setAttribute('download', `${appName}-stock-valuation-report.pdf`);
      document.body.appendChild(fileLink);
      fileLink.click();
      fileLink.remove();
    } catch (err) {
      alert(`Error exporting PDF: ${err.message}`);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await API.get('/reports/stock/export/excel', { responseType: 'blob' });
      const fileURL = window.URL.createObjectURL(new Blob([res.data]));
      const fileLink = document.createElement('a');
      fileLink.href = fileURL;
      fileLink.setAttribute('download', `${appName}-stock-valuation-report.xlsx`);
      document.body.appendChild(fileLink);
      fileLink.click();
      fileLink.remove();
    } catch (err) {
      alert(`Error exporting Excel: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `${currencySymbol} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const chartGridColor = isLight ? 'rgba(0,0,0,0.06)' : '#1e293b';
  const chartTextColor = isLight ? '#64748b' : '#94a3b8';
  const tooltipBgColor = isLight ? '#ffffff' : '#0f172a';
  const tooltipBorderColor = isLight ? '#e2e8f0' : '#334155';
  const tooltipTextColor = isLight ? '#0f172a' : '#f1f5f9';

  return (
    <div className="space-y-6">
      
      {/* Reports Header Action Banner */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/40 p-5 border border-border rounded-xl glass-panel shadow-premium">
        <div>
          <h2 className="text-base font-semibold text-foreground">Inventory Valuation & Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Download full audits and valuation balance logs.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownloadExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            <span>Export Excel</span>
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/15 rounded-md text-xs font-semibold transition cursor-pointer shadow-premium"
          >
            <FileText className="w-4.5 h-4.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
          <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">Total Catalog Products</span>
          <span className="text-2xl font-extrabold block mt-2 text-foreground">{summary?.totalProducts || 0}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
            <Package className="w-3.5 h-3.5" />
            <span>Unique dynamic entries</span>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
          <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">Total Items Stocked</span>
          <span className="text-2xl font-extrabold block mt-2 text-foreground">{summary?.totalItems || 0}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Physical items count</span>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
          <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">Gross Stock Value</span>
          <span className="text-2xl font-extrabold block mt-2 text-emerald-600 dark:text-emerald-400">{formatCurrency(summary?.totalValueRetail || 0)}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Based on retail pricing</span>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
          <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">Net Stock Value (Cost)</span>
          <span className="text-2xl font-extrabold block mt-2 text-blue-600 dark:text-blue-400">{formatCurrency(summary?.totalValueCost || 0)}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Based on acquisition costs</span>
          </div>
        </div>
      </div>

      {/* Estimations & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Estimated profit card */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-border bg-card/40 glass-panel flex flex-col justify-between shadow-premium">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-2">Estimated Margin Breakdown</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Calculated difference between selling price and acquisition cost of currently stocked items. Represents unrealized profit margin.</p>
          </div>

          <div className="my-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Est. Profit</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary?.estimatedProfit || 0)}</span>
            </div>
            
            <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-border flex">
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${(summary?.totalValueCost / summary?.totalValueRetail) * 100 || 0}%` }} 
                title="Cost Base"
              />
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${(summary?.estimatedProfit / summary?.totalValueRetail) * 100 || 0}%` }} 
                title="Potential Profit"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Cost Base ({((summary?.totalValueCost / summary?.totalValueRetail) * 100 || 0).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Profit Margin ({((summary?.estimatedProfit / summary?.totalValueRetail) * 100 || 0).toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-background border border-border rounded-lg text-xs text-muted-foreground flex items-start gap-2.5 shadow-inner">
            <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Valuation values change dynamically as stock levels fluctuate via real-time transaction movements.</span>
          </div>
        </div>

        {/* Categories Cost vs Value chart */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-card/40 glass-panel shadow-premium">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart4 className="w-5 h-5 text-purple-400" />
            <span>Cost vs Retail Value Comparison</span>
          </h3>

          <div className="h-80 w-full">
            {valuationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No chart data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valuationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="categoryName" stroke={chartTextColor} fontSize={11} />
                  <YAxis stroke={chartTextColor} fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBgColor, borderColor: tooltipBorderColor, color: tooltipTextColor }}
                    formatter={(value) => [`${currencySymbol} ${value.toLocaleString()}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {/* We map double bars */}
                  <Bar dataKey="totalValue" name="Retail Value" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalValue" name="Cost Value" fill="#3b82f6" opacity={0.6} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default Reports;
