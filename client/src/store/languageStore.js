import { create } from 'zustand';

const translations = {
  en: {
    // Navigation / Header
    dashboard: 'Dashboard',
    products: 'Products',
    inventory: 'Inventory',
    salesRegister: 'Sales Register',
    reports: 'Reports',
    labelPrinting: 'Label Printing',
    categoriesSchema: 'Categories / Schema',
    users: 'Users',
    settings: 'Settings',
    signOut: 'Sign Out',
    realtimeLive: 'Realtime Live',
    offline: 'Offline',
    languageName: 'English',
    
    // Inventory Page
    recordStockTransaction: 'Record Stock Transaction',
    actionType: 'Action Type',
    stockIn: 'Stock IN',
    stockOut: 'Stock OUT',
    correctCount: 'Correct Count',
    transfer: 'Transfer',
    quantity: 'Quantity',
    originLocation: 'Origin Location',
    targetLocation: 'Target Location',
    referencePo: 'Reference / PO #',
    transactionNotes: 'Transaction Notes',
    recordMovement: 'Record Movement',
    scanSearchProduct: 'Scan / Search Product',
    orChooseItemManually: 'Or choose item manually...',
    accessRestricted: 'Access Restricted',
    onlyAdminsManagersAdjust: 'Only administrators or managers can manually adjust inventory levels or transfer products between locations.',
    staffRecordDeductions: 'Staff cashiers record stock deductions automatically by completing checkout sales in the Checkout module.',
    stockTransactionSuccess: 'Stock Transaction Recorded',
    stockTransactionSuccessMsg: 'Quantity successfully updated in inventory.',
    mainShop: 'Main Shop',
    warehouseA: 'Warehouse A',
    pharmacyShelf: 'Pharmacy Shelf',
    allLocations: 'All Locations',
    outOfStock: 'Out of Stock',
    lowStock: 'Low Stock',
    inStock: 'In Stock',
    prev: 'Prev',
    next: 'Next',
    searchStockPlaceholder: 'Search stock by product name or SKU...',
    productName: 'Product Name',
    minThreshold: 'Threshold (Min)',
    status: 'Status',
    timestamp: 'Timestamp',
    operator: 'Operator',
    auditHistoryLog: 'Full Transaction Audit Log',
    noLogsFound: 'No logs found.',
    showingPage: 'Showing page {page} of {pages}',
    pageOf: 'Page {page} of {pages}',
    
    // POS / Sales Register Page
    posCheckout: 'POS Checkout / Cashier Register',
    cartSummary: 'Cart Summary',
    noItemsInCart: 'No items in cart.',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    mobileWallet: 'Mobile Wallet',
    completeSale: 'Complete Sale',
    clearCart: 'Clear Cart',
    customerName: 'Customer Name (Optional)',
    customerPhone: 'Customer Phone (Optional)',
    saleCompletedSuccessfully: 'Sale Completed Successfully',
    receiptGenerated: 'Receipt generated and stock adjusted.',
    
    // General terms / actions
    searchPlaceholder: 'Search...',
    success: 'Success',
    error: 'Error',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    name: 'Name',
    price: 'Price',
    sku: 'SKU',
    barcode: 'Barcode',
    category: 'Category',
    minStock: 'Min Stock',
    actions: 'Actions',
    currentStock: 'Current Stock',
    location: 'Location',
  },
  ur: {
    // Navigation / Header
    dashboard: 'ڈیش بورڈ',
    products: 'مصنوعات',
    inventory: 'انوینٹری',
    salesRegister: 'فروخت کا رجسٹر',
    reports: 'رپورٹس',
    labelPrinting: 'لیبل پرنٹنگ',
    categoriesSchema: 'اقسام اور ڈیزائن',
    users: 'صافرین',
    settings: 'ترتیبات',
    signOut: 'لاگ آؤٹ',
    realtimeLive: 'لائیو کنکشن',
    offline: 'آف لائن',
    languageName: 'اردو',
    
    // Inventory Page
    recordStockTransaction: 'اسٹاک کا اندراج کریں',
    actionType: 'کام کی قسم',
    stockIn: 'اسٹاک آیا (ان)',
    stockOut: 'اسٹاک گیا (آؤٹ)',
    correctCount: 'تعداد درست کریں',
    transfer: 'منتقل کریں',
    quantity: 'تعداد',
    originLocation: 'موجودہ جگہ',
    targetLocation: 'نئی جگہ',
    referencePo: 'حوالہ نمبر / PO',
    transactionNotes: 'تفصیلات (نوٹ)',
    recordMovement: 'اندراج کریں',
    scanSearchProduct: 'بار کوڈ اسکین کریں یا نام لکھیں',
    orChooseItemManually: 'یا فہرست سے منتخب کریں...',
    accessRestricted: 'رسائی ممنوع ہے',
    onlyAdminsManagersAdjust: 'صرف ایڈمن یا مینیجر ہی اسٹاک میں دستی تبدیلی یا منتقلی کر سکتے ہیں۔',
    staffRecordDeductions: 'کیشیئر اسٹاک کو کم کرنے کے لیے بل بنانے کا ماڈیول استعمال کریں۔',
    stockTransactionSuccess: 'اسٹاک کا اندراج ہو گیا',
    stockTransactionSuccessMsg: 'انوینٹری میں تعداد کامیابی کے ساتھ اپ ڈیٹ ہو گئی ہے۔',
    mainShop: 'مین دکان',
    warehouseA: 'گودام A',
    pharmacyShelf: 'فارمیسی شیلف',
    allLocations: 'تمام مقامات',
    outOfStock: 'اسٹاک ختم',
    lowStock: 'کم اسٹاک',
    inStock: 'اسٹاک میں',
    prev: 'پیچھے',
    next: 'آگے',
    searchStockPlaceholder: 'پروڈکٹ کا نام یا SKU تلاش کریں...',
    productName: 'پروڈکٹ کا نام',
    minThreshold: 'حد (کم از کم)',
    status: 'حالت',
    timestamp: 'وقت',
    operator: 'آپریٹر',
    auditHistoryLog: 'ٹرانزیکشن آڈٹ لاگ',
    noLogsFound: 'کوئی لاگ نہیں ملا۔',
    showingPage: 'صفحہ {page} از {pages} دکھایا جا رہا ہے',
    pageOf: 'صفحہ {page} از {pages}',
    
    // POS / Sales Register Page
    posCheckout: 'کیشیئر رجسٹر / بل بنائیں',
    cartSummary: 'بل کی تفصیلات',
    noItemsInCart: 'بل میں کوئی چیز موجود نہیں ہے۔',
    subtotal: 'کل رقم',
    discount: 'رعایت',
    tax: 'ٹیکس',
    total: 'حتمی رقم',
    paymentMethod: 'ادائیگی کا طریقہ',
    cash: 'نقد (کیش)',
    card: 'کارڈ',
    mobileWallet: 'موبائل والٹ',
    completeSale: 'بل مکمل کریں',
    clearCart: 'بل صاف کریں',
    customerName: 'گاہک کا نام (اختیاری)',
    customerPhone: 'گاہک کا فون (اختیاری)',
    saleCompletedSuccessfully: 'فروخت کامیابی سے مکمل ہوئی',
    receiptGenerated: 'رسید تیار کر دی گئی ہے اور اسٹاک اپ ڈیٹ ہو گیا ہے۔',
    
    // General terms / actions
    searchPlaceholder: 'تلاش کریں...',
    success: 'کامیابی',
    error: 'خرابی',
    cancel: 'منسوخ کریں',
    save: 'محفوظ کریں',
    edit: 'ترمیم کریں',
    delete: 'حذف کریں',
    add: 'شامل کریں',
    name: 'نام',
    price: 'قیمت',
    sku: 'ایس کے یو (SKU)',
    barcode: 'بارکوڈ',
    category: 'قسم',
    minStock: 'کم از کم اسٹاک',
    actions: 'کارروائی',
    currentStock: 'موجودہ اسٹاک',
    location: 'جگہ',
  }
};

export const useLanguageStore = create((set, get) => ({
  language: localStorage.getItem('language') || 'en',
  
  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
    // Update HTML dir attribute
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  },
  
  t: (key) => {
    const lang = get().language;
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  },

  getDir: () => {
    return get().language === 'ur' ? 'rtl' : 'ltr';
  }
}));

// Initialize document attributes on load
if (typeof document !== 'undefined') {
  const savedLang = localStorage.getItem('language') || 'en';
  document.documentElement.dir = savedLang === 'ur' ? 'rtl' : 'ltr';
  document.documentElement.lang = savedLang;
}
