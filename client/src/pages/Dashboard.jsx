import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import { 
  Package, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  History,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTheme } from '../hooks/useTheme';

function Dashboard() {
  const theme = useTheme();
  const isLight = theme === 'light';

  const [summary, setSummary] = useState(null);
  const [valuationData, setValuationData] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [sumRes, valRes, lowRes, movRes] = await Promise.all([
          API.get('/reports/stock'),
          API.get('/reports/valuation'),
          API.get('/inventory/low-stock'),
          API.get('/inventory/movements?limit=5')
        ]);
        
        setSummary(sumRes.data);
        setValuationData(valRes.data);
        setLowStock(lowRes.data);
        setRecentMovements(movRes.data.movements);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val) => {
    return `${currencySymbol} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const chartGridColor = isLight ? 'rgba(0,0,0,0.06)' : '#1e293b';
  const chartTextColor = isLight ? '#64748b' : '#94a3b8';
  const tooltipBgColor = isLight ? '#ffffff' : '#0f172a';
  const tooltipBorderColor = isLight ? '#e2e8f0' : '#334155';
  const tooltipTextColor = isLight ? '#0f172a' : '#f1f5f9';

  const cards = [
    { title: 'Total Products', val: summary?.totalProducts || 0, desc: 'Unique catalog SKUs', icon: Package, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { title: 'Total Items Stocked', val: summary?.totalItems || 0, desc: 'Sum of all physical items', icon: Layers, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { title: 'Valuation (Retail)', val: formatCurrency(summary?.totalValueRetail || 0), desc: 'Est. selling price', icon: TrendingUp, color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { title: 'Valuation (Cost)', val: formatCurrency(summary?.totalValueCost || 0), desc: 'Est. cost base price', icon: DollarSign, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Low Stock Toast Warning Banner */}
      {summary?.lowStockCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-600 dark:text-yellow-300 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Low Stock Items Detected</h4>
              <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-0.5">{summary.lowStockCount} items have reached or crossed their minimum stock threshold.</p>
            </div>
          </div>
          <Link to="/inventory" className="text-xs font-semibold underline hover:text-yellow-800 dark:hover:text-yellow-100">
            View Inventory
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} className={`p-6 rounded-xl border glass-panel flex justify-between items-start ${c.color.split(' ').slice(2).join(' ')}`}>
              <div>
                <span className="text-xs text-muted-foreground font-medium block uppercase tracking-wider">{c.title}</span>
                <span className="text-2xl font-extrabold block mt-2 text-foreground">{c.val}</span>
                <span className="text-xs text-muted-foreground/80 block mt-1">{c.desc}</span>
              </div>
              <div className={`p-3 rounded-lg border ${c.color.split(' ').slice(0, 2).join(' ')}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Valuation Bar Chart */}
        <div className="p-6 rounded-xl border border-border bg-card/50 glass-panel shadow-premium">
          <h3 className="text-base font-semibold text-foreground mb-4">Stock Valuation by Category</h3>
          <div className="h-80 w-full">
            {valuationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">No category valuation data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valuationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="categoryName" stroke={chartTextColor} fontSize={12} />
                  <YAxis stroke={chartTextColor} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBgColor, borderColor: tooltipBorderColor, color: tooltipTextColor }} 
                    formatter={(value) => [`${currencySymbol} ${value.toLocaleString()}`, 'Valuation']}
                  />
                  <Bar dataKey="totalValue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Products Count */}
        <div className="p-6 rounded-xl border border-border bg-card/50 glass-panel shadow-premium">
          <h3 className="text-base font-semibold text-foreground mb-4">Total Inventory Items by Category</h3>
          <div className="h-80 w-full">
            {valuationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">No category inventory data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valuationData}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="categoryName" stroke={chartTextColor} fontSize={12} />
                  <YAxis stroke={chartTextColor} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBgColor, borderColor: tooltipBorderColor, color: tooltipTextColor }}
                    formatter={(value) => [value.toLocaleString(), 'Items']}
                  />
                  <Area type="monotone" dataKey="totalQuantity" stroke="#10b981" fillOpacity={1} fill="url(#colorQty)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock list */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-200">Critical Stock Warning List</h3>
            <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-900 font-medium">
              {lowStock.length} Warning
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-center">Min Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No critical stock warnings.</td>
                  </tr>
                ) : (
                  lowStock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        <Link to={`/products?search=${item.product.sku}`} className="hover:underline">
                          {item.product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{item.product.category.name}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-400">{item.quantity}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{item.minStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent stock movements */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 glass-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-200">Recent Movements Audit Log</h3>
            <Link to="/inventory" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              <span>Full History</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No stock movements found.</td>
                  </tr>
                ) : (
                  recentMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(mov.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-200 font-medium truncate max-w-[150px]">{mov.product.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          mov.type === 'IN' || mov.type === 'RETURN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          mov.type === 'OUT' || mov.type === 'SALE' ? 'bg-red-950 text-red-400 border border-red-900' :
                          'bg-blue-950 text-blue-400 border border-blue-900'
                        }`}>
                          {mov.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${mov.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;
