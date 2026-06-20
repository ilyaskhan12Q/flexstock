import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useSocket } from '../hooks/useSocket';
import { 
  LayoutDashboard, 
  Package, 
  Settings,
  Tag,
  ClipboardList, 
  TrendingUp, 
  ShoppingCart, 
  Users as UsersIcon, 
  LogOut, 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  X,
  User as UserIcon
} from 'lucide-react';

function DashboardShell() {
  const { user, logout } = useAuthStore();
  const { notifications, addNotification, markAsRead, markAllAsRead } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  const location = useLocation();
  const navigate = useNavigate();

  const appName = import.meta.env.VITE_APP_NAME || 'FlexStock';
  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'PKR';

  // Toggle Dark/Light Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Hook up Real-time Sockets
  const socketCallbacks = React.useMemo(() => ({
    'alert:low-stock': (data) => {
      addNotification({
        title: 'Low Stock Alert',
        message: `${data.productName} is low on stock (${data.quantity} left, limit: ${data.minStock})`,
        type: 'warning'
      });
    },
    'alert:out-of-stock': (data) => {
      addNotification({
        title: 'Out of Stock Alert',
        message: `${data.productName} is completely out of stock!`,
        type: 'error'
      });
    },
    'sale:completed': (data) => {
      addNotification({
        title: 'New Sale Recorded',
        message: `Sale #${data.saleId} completed. Total: ${currencySymbol} ${data.total}`,
        type: 'success'
      });
    }
  }), [addNotification, currencySymbol]);

  const { isConnected } = useSocket(socketCallbacks);

  // Nav Items configuration based on User Role
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Products', path: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Inventory', path: '/inventory', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Sales Register', path: '/sales', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Reports', path: '/reports', icon: TrendingUp, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Label Printing', path: '/labels', icon: Tag, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Categories / Schema', path: '/categories', icon: Settings, roles: ['ADMIN'] },
    { name: 'Users', path: '/users', icon: UsersIcon, roles: ['ADMIN'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/50">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center shadow">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-100 dark:to-emerald-300 bg-clip-text text-transparent">
                {appName}
              </span>
            </Link>
            <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
 
          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${active ? 'bg-gradient-to-r from-blue-600/20 to-emerald-600/5 border-l-4 border-blue-500 text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
 
          {/* Logged in User Profile Footer info */}
          <div className="p-4 border-t border-border bg-card/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border text-blue-500">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold truncate text-foreground">{user?.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${user?.role === 'ADMIN' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : user?.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-muted text-muted-foreground'}`}>
                {user?.role}
              </span>
            </div>
 
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-muted border border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 text-muted-foreground text-sm font-medium transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {filteredNavItems.find((item) => item.path === location.pathname)?.name || 'App'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Connection Indicator */}
            <span className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
              {isConnected ? 'Realtime Live' : 'Offline'}
            </span>

            {/* Dark/Light Mode Toggler */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-muted border border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-lg bg-muted border border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-background">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-card border border-border shadow-glass py-2 z-50 text-sm">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                      <span className="font-semibold text-foreground">Alerts Log</span>
                      {unreadNotifCount > 0 && (
                        <button
                          onClick={() => { markAllAsRead(); setNotifDropdownOpen(false); }}
                          className="text-xs text-blue-500 hover:text-blue-600 font-medium cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">No active alerts.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 transition hover:bg-muted/40 flex items-start gap-2.5 ${!notif.read ? 'bg-blue-500/5' : ''}`}
                            onClick={() => { markAsRead(notif.id); }}
                          >
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.type === 'error' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-xs">{notif.title}</p>
                              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{notif.message}</p>
                              <span className="text-[10px] text-muted-foreground/60 block mt-1">
                                {new Date(notif.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default DashboardShell;
