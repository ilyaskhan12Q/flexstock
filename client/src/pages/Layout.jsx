import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useFeedbackStore } from '../store/feedbackStore';
import { useSocket } from '../hooks/useSocket';
import { useLanguageStore } from '../store/languageStore';
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
  User as UserIcon,
  XCircle,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

function DashboardShell() {
  const { user, logout } = useAuthStore();
  const { notifications, addNotification, markAsRead, markAllAsRead } = useNotificationStore();
  const { open: feedbackOpen, isSuccess: feedbackIsSuccess, title: feedbackTitle, message: feedbackMessage, close: closeFeedback, voiceEnabled, toggleVoice } = useFeedbackStore();
  const { language, setLanguage, t } = useLanguageStore();
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
    { name: 'Dashboard', key: 'dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Products', key: 'products', path: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Inventory', key: 'inventory', path: '/inventory', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Sales Register', key: 'salesRegister', path: '/sales', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Reports', key: 'reports', path: '/reports', icon: TrendingUp, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Label Printing', key: 'labelPrinting', path: '/labels', icon: Tag, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Categories / Schema', key: 'categoriesSchema', path: '/categories', icon: Settings, roles: ['ADMIN'] },
    { name: 'Users', key: 'users', path: '/users', icon: UsersIcon, roles: ['ADMIN'] },
    { name: 'Settings', key: 'settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarPositionClass = language === 'ur' ? 'right-0 border-l' : 'left-0 border-r';
  const sidebarTransformClass = sidebarOpen 
    ? 'translate-x-0' 
    : (language === 'ur' ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0');
  
  const mainContentClass = language === 'ur' ? 'md:pr-60' : 'md:pl-60';
  const notifDropdownAlignClass = language === 'ur' ? 'left-0' : 'right-0';

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans antialiased selection:bg-primary/20">
      
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 ${sidebarPositionClass} z-40 w-60 bg-card border-border transition-transform ${sidebarTransformClass}`}>
        <div className="flex flex-col h-full">
          
          {/* Logo Brand Header */}
          <div className="h-14 flex items-center justify-between px-5 border-b border-border bg-card">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 bg-primary rounded-md flex items-center justify-center shadow-sm">
                <Package className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">
                {appName}
              </span>
            </Link>
            <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
  
          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${active ? 'bg-secondary text-foreground font-semibold border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
  
          {/* Logged in User Profile Footer info */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border text-primary">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold truncate text-foreground leading-tight">{user?.name}</h4>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${user?.role === 'ADMIN' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : user?.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-muted text-muted-foreground'}`}>
                {user?.role}
              </span>
            </div>
  
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-secondary border border-border hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 text-muted-foreground text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('signOut')}</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${mainContentClass} min-w-0`}>
        
        {/* Top Navbar */}
        <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-card/65 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {(() => {
                const currentItem = filteredNavItems.find((item) => item.path === location.pathname);
                return currentItem ? t(currentItem.key) : t('dashboard');
              })()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Connection Indicator */}
            <span className={`text-[10px] flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
              {isConnected ? t('realtimeLive') : t('offline')}
            </span>

            {/* Language Switcher Toggler */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
              title={language === 'en' ? "Switch to Urdu" : "English میں تبدیل کریں"}
              className="px-2.5 py-1.5 rounded-md border border-border text-xs font-bold bg-secondary hover:text-foreground text-muted-foreground transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{language === 'en' ? 'اردو' : 'EN'}</span>
            </button>

            {/* Dark/Light Mode Toggler */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md bg-secondary border border-border hover:brightness-105 text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Voice Assistant Toggler */}
            <button
              onClick={toggleVoice}
              title={voiceEnabled ? "Mute Voice Assistant" : "Unmute Voice Assistant"}
              className={`p-1.5 rounded-md border transition cursor-pointer ${voiceEnabled ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-1.5 rounded-md bg-secondary border border-border hover:brightness-105 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-600 rounded-full text-[9px] font-bold flex items-center justify-center text-white border-2 border-background">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifDropdownOpen(false)} />
                  <div className={`absolute ${notifDropdownAlignClass} mt-1.5 w-72 rounded-md bg-card border border-border shadow-premium py-1.5 z-50 text-xs`}>

                    <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border">
                      <span className="font-semibold text-foreground">Alerts Log</span>
                      {unreadNotifCount > 0 && (
                        <button
                          onClick={() => { markAllAsRead(); setNotifDropdownOpen(false); }}
                          className="text-[10px] text-primary hover:brightness-110 font-bold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-5 text-center text-muted-foreground text-xs">No active alerts.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 transition hover:bg-muted/40 flex items-start gap-2.5 ${!notif.read ? 'bg-primary/5' : ''}`}
                            onClick={() => { markAsRead(notif.id); }}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${notif.type === 'error' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground text-xs">{notif.title}</p>
                              <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">{notif.message}</p>
                              <span className="text-[9px] text-muted-foreground/60 block mt-1">
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
        <main className="flex-1 p-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Feedback Modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-premium text-center space-y-5 animate-scale-up text-foreground">
            <div className="flex justify-center">
              {feedbackIsSuccess ? (
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <CheckCircle className="w-10 h-10 stroke-[2]" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20">
                  <XCircle className="w-10 h-10 stroke-[2]" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">{feedbackTitle}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feedbackMessage}</p>
            </div>
            <button
              onClick={closeFeedback}
              className={`w-full py-2 rounded-md font-semibold text-white text-xs shadow-sm transition cursor-pointer ${feedbackIsSuccess ? 'bg-emerald-600 hover:brightness-105' : 'bg-red-600 hover:brightness-105'}`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardShell;
