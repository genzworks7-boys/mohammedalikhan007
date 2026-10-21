// ==========================================================================
// SHARP CRACKERS - ADMIN DASHBOARD & ORDERS MANAGEMENT
// Dedicated 2-Tab Management: Customer Orders & Product/Category Catalog
// Featuring Dynamic Category Management, Stock Quantity Controls, 
// Live Image & Savings Previews, and Luxury Glassmorphic Modals.
// ==========================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dataService, getOrderRetentionDetails, ORDER_RETENTION_DAYS } from '../services/dataService';
import { generateOrderPdf, printOrderDocument } from '../utils/pdfGenerator';
import CreativeActionButton from '../components/CreativeActionButton';
import { 
  Package, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Printer, 
  Search, 
  LogOut, 
  ExternalLink, 
  TrendingUp, 
  AlertCircle, 
  Eye, 
  X, 
  Save, 
  RotateCcw, 
  BellRing, 
  Trash2, 
  Edit, 
  Plus, 
  ShieldCheck, 
  Calendar, 
  RefreshCw, 
  Archive, 
  Download, 
  Undo2, 
  Zap,
  Layers,
  Sparkles,
  Tag,
  Check,
  Sliders,
  DollarSign,
  Image as ImageIcon,
  Box,
  Upload,
  FolderOpen
} from 'lucide-react';

export const AdminDashboardPage = ({ setCurrentPage, onLogout }) => {
  // Navigation Tabs: 'orders' | 'products'
  const [activeTab, setActiveTab] = useState('orders');

  // Live Data States
  const [orders, setOrders] = useState(() => dataService.getOrders());
  const [products, setProducts] = useState(() => dataService.getProducts());
  const [categories, setCategories] = useState(() => dataService.getCategories());
  const [settings] = useState(() => dataService.getSettings());
  const [redisStats, setRedisStats] = useState(null);

  // New incoming order notification banner
  const [incomingOrderAlert, setIncomingOrderAlert] = useState(null);

  // Order Filters & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Selected Order for Details View
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Deletion Confirmation State
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Cancellation Confirmation State
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Backup & Archive Bills (Preserved past 30 days)
  const [backupOrders, setBackupOrders] = useState(() => dataService.getBackupOrders());
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupSearch, setBackupSearch] = useState('');

  // Product Catalog & Category States
  const [catalogSubTab, setCatalogSubTab] = useState('products'); // 'products' | 'categories'
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Category Management States
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    ta: '',
    desc: '',
    image: '/images/products/sparkler_10cm_colour.png'
  });

  // New Product Form State (with stockCount & tamilName)
  const [newProductForm, setNewProductForm] = useState({
    code: '',
    name: '',
    tamilName: '',
    category: 'sparklers',
    packDetails: '1 Box',
    unitPrice: '',
    mrp: '',
    image: '/images/products/sparkler_10cm_colour.png',
    stockCount: 100,
    inStock: true,
    isBestseller: false,
    isFeatured: false,
    description: ''
  });

  // Toast message
  const [toastMessage, setToastMessage] = useState(null);

  // Local File Upload Pickers
  const editProductFileInputRef = useRef(null);
  const addProductFileInputRef = useRef(null);
  const categoryFileInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Track previous order count to detect new additions
  const prevOrderCountRef = useRef(orders.length);

  // Audio chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn("Audio chime prevented:", e);
    }
  };

  // Synchronize orders multi-device
  const refreshOrders = async () => {
    try {
      const latestOrders = await dataService.fetchOrders();
      const currentLen = latestOrders.length;
      if (currentLen > prevOrderCountRef.current) {
        const newest = latestOrders[0];
        setIncomingOrderAlert(newest);
        playChime();
      }
      prevOrderCountRef.current = currentLen;
      setOrders(latestOrders);
    } catch (err) {
      console.error("Order refresh error:", err);
    }
  };

  useEffect(() => {
    const pollInterval = setInterval(() => {
      refreshOrders();
    }, 4000);

    const unsubscribe = dataService.subscribe((event) => {
      if (event.type === 'ORDER_CREATED') {
        refreshOrders();
        setToastMessage({
          type: 'success',
          text: `New order #${event.order?.orderId} from ${event.order?.customer?.name || 'Customer'}!`
        });
        setTimeout(() => setToastMessage(null), 4000);
      } else if (event.type === 'PRODUCTS_UPDATED') {
        setProducts(dataService.getProducts());
      } else if (event.type === 'CATEGORIES_UPDATED') {
        setCategories(dataService.getCategories());
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, []);

  const formatCur = (amount) => {
    return `${settings.currencySymbol || '₹'}${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date: dateStr, time: timeStr };
  };

  // KPI Overview
  const kpiStats = useMemo(() => {
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let totalRevenue = 0;

    orders.forEach(order => {
      if (order.status === 'Pending') pendingOrdersCount++;
      if (order.status === 'Completed') completedOrdersCount++;
      if (order.status !== 'Cancelled') {
        totalRevenue += Number(order.grandTotal) || 0;
      }
    });

    return {
      totalOrdersCount: orders.length,
      pendingOrdersCount,
      completedOrdersCount,
      totalRevenue,
      totalProductsCount: products.length,
      totalCategoriesCount: categories.length
    };
  }, [orders, products, categories]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase().trim();
        const matchId = (order.orderId || '').toLowerCase().includes(q);
        const matchName = (order.customer?.name || '').toLowerCase().includes(q);
        const matchPhone = (order.customer?.phone || '').includes(q);
        return matchId || matchName || matchPhone;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    await dataService.updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder(prev => ({ ...prev, status: newStatus }));
    }
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    await dataService.updateOrderStatus(orderToCancel.orderId, 'Cancelled');
    if (selectedOrder && selectedOrder.orderId === orderToCancel.orderId) {
      setSelectedOrder(prev => ({ ...prev, status: 'Cancelled' }));
    }
    setOrderToCancel(null);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const delId = orderToDelete.orderId;
    await dataService.deleteOrder(delId);
    setOrders(prev => prev.filter(o => o.orderId !== delId));
    if (selectedOrder && selectedOrder.orderId === delId) {
      setSelectedOrder(null);
    }
    setOrderToDelete(null);
    setToastMessage({ type: 'success', text: `Order #${delId} permanently deleted.` });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualPurgeExpired = async () => {
    try {
      const res = await dataService.pruneExpiredOrders();
      await refreshOrders();
      setBackupOrders(dataService.getBackupOrders());
      setToastMessage({
        type: 'success',
        text: `30-Day Retention Verified: ${res.prunedCount} expired bill(s) backed up.`
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.error("Manual purge error:", e);
    }
  };

  const handleRestoreOrder = async (orderId) => {
    try {
      const restored = await dataService.restoreOrderFromBackup(orderId);
      if (restored) {
        await refreshOrders();
        setBackupOrders(dataService.getBackupOrders());
        setToastMessage({ 
          type: 'success', 
          text: `Bill #${orderId} restored back to Active Orders!` 
        });
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.error("Restore error:", err);
    }
  };

  // -------------------------------------------------------------
  // PRODUCT CATALOG & STOCK ACTIONS
  // -------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (productCatFilter !== 'all' && p.category !== productCatFilter) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCode = (p.code || '').toLowerCase().includes(q);
        const matchSno = (p.sno || '').toLowerCase().includes(q);
        const matchTamil = (p.tamilName || '').toLowerCase().includes(q);
        return matchName || matchCode || matchSno || matchTamil;
      }
      return true;
    });
  }, [products, productCatFilter, productSearch]);

  const handleToggleProductStock = (prod) => {
    const newInStock = !prod.inStock;
    const newStockCount = newInStock ? (prod.stockCount > 0 ? prod.stockCount : 100) : 0;
    const updated = { ...prod, inStock: newInStock, stockCount: newStockCount };
    dataService.updateProduct(updated);
    setProducts(dataService.getProducts());
    setToastMessage({ 
      type: 'success', 
      text: `Product "${prod.name}" marked as ${newInStock ? 'In Stock (' + newStockCount + ' pkts)' : 'Out of Stock'}.` 
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveEditProduct = (e) => {
    e.preventDefault();
    if (!editingProduct.name.trim()) {
      alert("Product name is required.");
      return;
    }
    const stockCountVal = Math.max(0, parseInt(editingProduct.stockCount, 10) || 0);
    const finalProd = {
      ...editingProduct,
      stockCount: stockCountVal,
      inStock: stockCountVal > 0 ? (editingProduct.inStock !== false) : false
    };
    dataService.updateProduct(finalProd);
    setProducts(dataService.getProducts());
    setEditingProduct(null);
    setToastMessage({ type: 'success', text: `Product "${finalProd.name}" updated with stock: ${finalProd.stockCount} pkts!` });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !newProductForm.unitPrice) {
      alert("Product name and unit price are required.");
      return;
    }
    const stockCountVal = Math.max(0, parseInt(newProductForm.stockCount, 10) || 0);
    const toCreate = {
      ...newProductForm,
      stockCount: stockCountVal,
      inStock: stockCountVal > 0 ? (newProductForm.inStock !== false) : false
    };
    const created = dataService.addProduct(toCreate);
    setProducts(dataService.getProducts());
    setIsAddingProduct(false);
    setNewProductForm({
      code: '',
      name: '',
      tamilName: '',
      category: 'sparklers',
      packDetails: '1 Box',
      unitPrice: '',
      mrp: '',
      image: '/images/products/sparkler_10cm_colour.png',
      stockCount: 100,
      inStock: true,
      isBestseller: false,
      isFeatured: false,
      description: ''
    });
    setToastMessage({ type: 'success', text: `Product "${created.name}" created with stock: ${created.stockCount} pkts!` });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    const name = productToDelete.name;
    dataService.deleteProduct(productToDelete.id);
    setProducts(dataService.getProducts());
    setProductToDelete(null);
    setToastMessage({ type: 'success', text: `Product "${name}" deleted from catalog.` });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // -------------------------------------------------------------
  // LOCAL DEVICE IMAGE UPLOAD (Reads file + persists to server)
  // -------------------------------------------------------------
  const handleLocalImageSelect = async (e, onImageSet) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP, GIF).');
      e.target.value = '';
      return;
    }

    setIsUploadingImage(true);

    const reader = new FileReader();
    reader.onload = async (uploadEvt) => {
      const base64Data = uploadEvt.target?.result;
      if (!base64Data) {
        setIsUploadingImage(false);
        return;
      }

      // 1. Immediately set base64 preview so user sees instant feedback
      onImageSet(base64Data);

      // 2. Upload to server backend so file is written to /images/products/
      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            data: base64Data
          })
        });

        if (resp.ok) {
          const result = await resp.json();
          if (result.success && result.url) {
            onImageSet(result.url);
            setToastMessage({
              type: 'success',
              text: `Image "${file.name}" saved to catalog as ${result.filename}!`
            });
            setTimeout(() => setToastMessage(null), 3000);
          }
        }
      } catch (err) {
        console.warn("Backend upload fallback to local preview:", err);
      } finally {
        setIsUploadingImage(false);
      }
    };

    reader.onerror = () => {
      setIsUploadingImage(false);
      alert('Error reading local file.');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // CATEGORY MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddCategory = () => {
    setCategoryForm({
      id: '',
      name: '',
      ta: '',
      desc: '',
      image: '/images/products/sparkler_10cm_colour.png'
    });
    setIsAddingCategory(true);
  };

  const handleOpenEditCategory = (cat) => {
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      ta: cat.ta || '',
      desc: cat.desc || '',
      image: cat.image || '/images/products/sparkler_10cm_colour.png'
    });
    setEditingCategory(cat);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert("Category name is required.");
      return;
    }
    if (editingCategory) {
      dataService.updateCategory(categoryForm);
      setToastMessage({ type: 'success', text: `Category "${categoryForm.name}" updated successfully!` });
      setEditingCategory(null);
    } else {
      const created = dataService.addCategory(categoryForm);
      setToastMessage({ type: 'success', text: `Category "${created.name}" added to catalog!` });
      setIsAddingCategory(false);
    }
    setCategories(dataService.getCategories());
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    try {
      dataService.deleteCategory(categoryToDelete.id);
      setCategories(dataService.getCategories());
      setCategoryToDelete(null);
      setToastMessage({ type: 'success', text: `Category "${categoryToDelete.name}" deleted.` });
    } catch (err) {
      alert(err.message || "Failed to delete category.");
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="admin-dashboard-wrapper">
      {/* Admin Top Navigation Bar */}
      <header className="admin-header no-print">
        <div className="container-wide admin-header-content">
          <div className="admin-brand">
            <span className="admin-badge">ADMIN DESK</span>
            <h2 className="admin-shop-title">{settings.shopName || "SHARP CRACKERS"}</h2>
            <span className="admin-loc">Live Customer Orders & Catalog Management</span>
          </div>

          <div className="admin-header-actions">
            <button 
              onClick={() => setCurrentPage('products')} 
              className="btn btn-outline-light btn-sm admin-top-btn"
              title="Open customer catalog in customer view"
            >
              <ExternalLink size={15} />
              <span>Customer Website</span>
            </button>
            <button 
              onClick={() => {
                dataService.adminLogout();
                if (onLogout) onLogout();
                setCurrentPage('home');
              }} 
              className="btn btn-outline-light btn-sm logout-btn"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Order Alert Toast Banner */}
      {incomingOrderAlert && (
        <div className="container-wide mt-3 no-print">
          <div className="incoming-order-alert-banner">
            <div className="alert-pulse-icon">
              <BellRing size={22} className="text-white" />
            </div>
            <div className="alert-text-body">
              <strong>🔔 NEW CUSTOMER ORDER RECEIVED JUST NOW!</strong>
              <span>
                Order <strong>#{incomingOrderAlert.orderId}</strong> placed by <strong>{incomingOrderAlert.customer?.name}</strong> ({incomingOrderAlert.customer?.phone}) for <strong>{formatCur(incomingOrderAlert.grandTotal)}</strong>!
              </span>
            </div>
            <div className="alert-actions-group">
              <button 
                onClick={() => {
                  setSelectedOrder(incomingOrderAlert);
                  setIncomingOrderAlert(null);
                }} 
                className="btn btn-gold btn-sm"
              >
                <Eye size={15} />
                <span>View Order Details</span>
              </button>
              <button 
                onClick={() => setIncomingOrderAlert(null)}
                className="alert-dismiss-btn"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Summary Bar */}
      <section className="kpi-section no-print">
        <div className="container-wide">
          <div className="kpi-grid">
            <div className="kpi-card card">
              <div className="kpi-icon-box bg-blue-subtle">
                <FileText size={22} className="text-blue" />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">Total Orders</span>
                <span className="kpi-value">{kpiStats.totalOrdersCount}</span>
              </div>
            </div>

            <div className="kpi-card card">
              <div className="kpi-icon-box bg-amber-subtle">
                <Clock size={22} className="text-amber" />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">New / Pending</span>
                <span className="kpi-value text-amber">{kpiStats.pendingOrdersCount}</span>
              </div>
            </div>

            <div className="kpi-card card">
              <div className="kpi-icon-box bg-emerald-subtle">
                <CheckCircle size={22} className="text-emerald" />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">Completed Orders</span>
                <span className="kpi-value text-emerald">{kpiStats.completedOrdersCount}</span>
              </div>
            </div>

            <div className="kpi-card card">
              <div className="kpi-icon-box bg-orange-subtle">
                <TrendingUp size={22} className="text-orange" />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">Total Order Value</span>
                <span className="kpi-value text-orange">{formatCur(kpiStats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Admin Tabbed Navigation - Dedicated 2 Primary Tabs as Requested */}
      <div className="container-wide admin-main-container">
        <div className="admin-nav-tabs-bar no-print">
          <button 
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <FileText size={17} />
            <span>Customer Orders ({orders.length})</span>
            {kpiStats.pendingOrdersCount > 0 && (
              <span className="tab-pending-badge">{kpiStats.pendingOrdersCount} new</span>
            )}
          </button>

          <button 
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={17} />
            <span>Product Catalog & Categories ({products.length})</span>
          </button>
        </div>

        {/* =============================================================
            TAB 1: ORDER MANAGEMENT
           ============================================================= */}
        {activeTab === 'orders' && (
          <div className="admin-tab-content">
            {/* 30-Day Cloud & Local Storage Retention & Backup Strip */}
            <div className="card mb-3 p-3 retention-strip">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="retention-icon-box">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                      30-Day Active Retention & Secure Backup Storage Active
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Bills stay active for 30 days. After 30 days, they are automatically stored in the Secure Backup Archive (Never lost).
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="retention-pill-badge">
                    <Calendar size={13} />
                    30 DAYS ACTIVE WINDOW
                  </span>
                  <button 
                    onClick={() => setShowBackupModal(true)}
                    className="btn btn-outline-light btn-xs backup-archive-btn"
                  >
                    <Archive size={13} />
                    <span>Backup Bills Archive ({backupOrders.length})</span>
                  </button>
                  <button 
                    onClick={handleManualPurgeExpired}
                    className="btn btn-outline-light btn-xs retention-check-btn"
                    title="Scan and move bills older than 30 days to Archive"
                  >
                    <RefreshCw size={13} />
                    <span>Run Auto-Purge & Backup</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="table-filter-bar card">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Customer Name, or Mobile..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="admin-search-input"
                />
                {orderSearch && (
                  <button onClick={() => setOrderSearch('')} className="clear-btn">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="status-filter-group">
                <span className="filter-label">Filter Status:</span>
                <select 
                  value={orderStatusFilter} 
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Orders ({orders.length})</option>
                  <option value="Pending">Pending ({kpiStats.pendingOrdersCount})</option>
                  <option value="Completed">Completed ({kpiStats.completedOrdersCount})</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="table-container card">
              {filteredOrders.length === 0 ? (
                <div className="empty-filter-state p-5 text-center">
                  <AlertCircle size={48} className="text-muted mb-2" />
                  <h4>No Customer Orders Found</h4>
                  <p className="text-muted">
                    {orderSearch || orderStatusFilter !== 'all'
                      ? "Try clearing your search query or status filter to see all orders."
                      : "When customers place orders from the website, they will appear here in real time."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th className="col-sno text-center">S.No.</th>
                        <th className="col-order-id">Order ID</th>
                        <th className="col-date">Date & Retention</th>
                        <th className="col-customer">Customer Name</th>
                        <th className="col-phone">Mobile Number</th>
                        <th className="col-email">Email</th>
                        <th className="col-items text-center">Products</th>
                        <th className="col-qty text-center">Total Quantity</th>
                        <th className="col-amount text-right">Order Amount</th>
                        <th className="col-status text-center">Status</th>
                        <th className="col-actions text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, idx) => {
                        const dateTime = formatDate(order.createdAt);
                        const totalQty = (order.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
                        const isJustPlaced = incomingOrderAlert && incomingOrderAlert.orderId === order.orderId;
                        const retention = getOrderRetentionDetails(order);

                        return (
                          <tr 
                            key={order.orderId} 
                            className={`admin-order-row ${isJustPlaced ? 'row-just-placed' : ''} ${order.status === 'Cancelled' ? 'row-cancelled' : ''}`}
                          >
                            <td className="col-sno text-center">
                              <span className="cart-sno-badge">{idx + 1}</span>
                            </td>
                            <td className="col-order-id">
                              <span 
                                className="order-id-badge" 
                                onClick={() => setSelectedOrder(order)}
                                title="Click to view order details"
                              >
                                {order.orderId}
                              </span>
                              {isJustPlaced && <span className="new-tag-dot" title="New order"></span>}
                            </td>
                            <td className="col-date">
                              <div className="date-time-block">
                                <span className="date-line">{dateTime.date}</span>
                                <span className="time-line">{dateTime.time}</span>
                                <span 
                                  className={`retention-countdown-pill ${retention.isExpired ? 'retention-expired' : retention.daysLeft <= 5 ? 'retention-warning' : 'retention-ok'}`}
                                  title={`Placed: ${dateTime.date}. Stays active for 30 days.`}
                                >
                                  <Clock size={10} />
                                  <span>{retention.isExpired ? 'EXPIRED' : `${retention.daysLeft}D LEFT`}</span>
                                </span>
                              </div>
                            </td>
                            <td className="col-customer">
                              <strong className="customer-name">{order.customer?.name}</strong>
                            </td>
                            <td className="col-phone">
                              <a href={`tel:${order.customer?.phone}`} className="mobile-link">
                                {order.customer?.phone}
                              </a>
                            </td>
                            <td className="col-email">
                              <span className="email-text" title={order.customer?.email || 'Not provided'}>
                                {order.customer?.email || '-'}
                              </span>
                            </td>
                            <td className="col-items text-center">
                              <button 
                                onClick={() => setSelectedOrder(order)} 
                                className="item-count-badge"
                                title="Click to view ordered items"
                              >
                                {(order.items || []).length} items ›
                              </button>
                            </td>
                            <td className="col-qty text-center">
                              <span className="qty-tag">{totalQty} pkts</span>
                            </td>
                            <td className="col-amount text-right font-bold text-red">
                              {formatCur(order.grandTotal)}
                            </td>
                            <td className="col-status text-center">
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateStatus(order.orderId, e.target.value)}
                                className={`status-pill status-${order.status.toLowerCase()}`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Processing">Processing</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="col-actions text-center">
                              <div className="order-actions-cell">
                                <button 
                                  onClick={() => setSelectedOrder(order)} 
                                  className="action-icon-btn-sm text-blue"
                                  title="View order details"
                                >
                                  <Eye size={15} />
                                </button>
                                <button 
                                  onClick={() => generateOrderPdf(order, settings, true)}
                                  className="action-icon-btn-sm text-navy"
                                  title="Download PDF Order Sheet"
                                >
                                  <FileText size={15} />
                                </button>
                                <button 
                                  onClick={() => printOrderDocument(order, settings)}
                                  className="action-icon-btn-sm text-gold-dark"
                                  title="Print order sheet"
                                >
                                  <Printer size={15} />
                                </button>
                                <button 
                                  onClick={() => setOrderToDelete(order)}
                                  className="action-icon-btn-sm action-btn-delete"
                                  title="Delete order"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 2: PRODUCT CATALOG & CATEGORY MANAGEMENT
           ============================================================= */}
        {activeTab === 'products' && (
          <div className="admin-tab-content">
            {/* Catalog Sub-navigation bar (Products vs Categories) */}
            <div className="catalog-header-actions-row">
              <div>
                <h3 className="tab-heading">Product Catalog & Categories</h3>
                <p className="tab-sub">Manage product prices, stock quantities, and create custom firecracker categories directly in the database.</p>
              </div>

              <div className="catalog-top-controls">
                <div className="catalog-subtab-switch">
                  <button 
                    className={`subtab-pill ${catalogSubTab === 'products' ? 'active' : ''}`}
                    onClick={() => setCatalogSubTab('products')}
                  >
                    <Package size={15} />
                    <span>Products ({products.length})</span>
                  </button>
                  <button 
                    className={`subtab-pill ${catalogSubTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setCatalogSubTab('categories')}
                  >
                    <Layers size={15} />
                    <span>Categories ({categories.length})</span>
                  </button>
                </div>

                <div className="catalog-actions-btns">
                  <button 
                    onClick={handleOpenAddCategory} 
                    className="btn btn-outline-dark btn-sm"
                  >
                    <Tag size={15} />
                    <span>+ Add Category</span>
                  </button>
                  <button 
                    onClick={() => setIsAddingProduct(true)} 
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={16} />
                    <span>+ Add Product</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW A: PRODUCTS TABLE WITH STOCK MANAGEMENT */}
            {catalogSubTab === 'products' && (
              <>
                {/* Filter and Search Bar */}
                <div className="table-filter-bar card">
                  <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search products by code, English or Tamil name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="admin-search-input"
                    />
                    {productSearch && (
                      <button onClick={() => setProductSearch('')} className="clear-btn">
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="status-filter-group">
                    <span className="filter-label">Category:</span>
                    <select 
                      value={productCatFilter} 
                      onChange={(e) => setProductCatFilter(e.target.value)}
                      className="admin-select"
                    >
                      <option value="all">All Categories ({products.length})</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({products.filter(p => p.category === c.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Products Table */}
                <div className="table-container card">
                  <div className="table-responsive-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th className="col-sno text-center">S.No</th>
                          <th className="text-center">Image</th>
                          <th>Code</th>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Pack Details</th>
                          <th className="text-right">Unit Price</th>
                          <th className="text-right">MRP</th>
                          <th className="text-center">Stock Inventory</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p, idx) => {
                          const stockCount = p.stockCount !== undefined ? Number(p.stockCount) : (p.inStock !== false ? 100 : 0);
                          const isStocked = p.inStock !== false && stockCount > 0;
                          const isLowStock = isStocked && stockCount <= 15;

                          return (
                            <tr key={p.id} className="admin-product-row">
                              <td className="text-center col-sno">
                                <span className="cart-sno-badge">{p.sno || String(idx + 1).padStart(3, '0')}</span>
                              </td>
                              <td className="text-center">
                                <div className="product-table-img-wrap">
                                  <img 
                                    src={p.image} 
                                    alt={p.name} 
                                    className="table-row-thumb" 
                                    onError={(e) => { e.currentTarget.src = '/images/sharp_crackers_brand_logo.jpg'; }}
                                  />
                                </div>
                              </td>
                              <td><span className="code-badge">{p.code}</span></td>
                              <td>
                                <div><strong>{p.name}</strong></div>
                                {p.tamilName && <small className="text-muted product-tamil-sub">{p.tamilName}</small>}
                              </td>
                              <td>
                                <span className="badge badge-festive" style={{ textTransform: 'capitalize' }}>
                                  {p.category ? p.category.replace('-', ' ') : 'General'}
                                </span>
                              </td>
                              <td>{p.packDetails}</td>
                              <td className="text-right font-bold text-red">{formatCur(p.unitPrice)}</td>
                              <td className="text-right text-muted" style={{ textDecoration: 'line-through' }}>{formatCur(p.mrp)}</td>
                              
                              {/* Stock Inventory column with count & quick toggle */}
                              <td className="text-center">
                                <div className="stock-manage-cell">
                                  <button
                                    onClick={() => handleToggleProductStock(p)}
                                    className={`stock-badge ${!isStocked ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-in'}`}
                                    title="Click to toggle stock status"
                                  >
                                    <span className="stock-dot"></span>
                                    <span>
                                      {!isStocked 
                                        ? 'Out of Stock' 
                                        : `${stockCount} pkts ${isLowStock ? '(Low)' : ''}`}
                                    </span>
                                  </button>
                                </div>
                              </td>

                              <td className="text-center">
                                <div className="table-action-btns justify-content-center">
                                  <button
                                    onClick={() => setEditingProduct({ ...p, stockCount: stockCount })}
                                    className="action-icon-btn-sm text-navy"
                                    title="Edit Product Details & Stock"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    onClick={() => setProductToDelete(p)}
                                    className="action-icon-btn-sm action-btn-delete"
                                    title="Delete Product"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredProducts.length === 0 && (
                          <tr>
                            <td colSpan="10" className="text-center py-5 text-muted">
                              No products found matching your filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* VIEW B: CATEGORIES MANAGEMENT GRID */}
            {catalogSubTab === 'categories' && (
              <div className="categories-admin-section">
                <div className="categories-admin-grid">
                  {categories.map((cat) => {
                    const count = products.filter(p => p.category === cat.id).length;
                    return (
                      <div key={cat.id} className="category-admin-card card">
                        <div className="cat-card-media-box">
                          <img 
                            src={cat.image || '/images/products/sparkler_10cm_colour.png'} 
                            alt={cat.name}
                            className="cat-admin-img"
                            onError={(e) => { e.currentTarget.src = '/images/sharp_crackers_brand_logo.jpg'; }}
                          />
                          <span className="cat-product-count-badge">
                            {count} Products
                          </span>
                        </div>

                        <div className="cat-card-body-box">
                          <div className="cat-slug-tag">ID: {cat.id}</div>
                          <h4 className="cat-card-name-en">{cat.name}</h4>
                          {cat.ta && <div className="cat-card-name-ta">{cat.ta}</div>}
                          {cat.desc && <p className="cat-card-desc">{cat.desc}</p>}

                          <div className="cat-card-actions">
                            <button 
                              type="button" 
                              onClick={() => handleOpenEditCategory(cat)}
                              className="btn btn-outline-dark btn-xs"
                            >
                              <Edit size={13} />
                              <span>Edit Category</span>
                            </button>
                            {count === 0 && cat.id !== 'all' && (
                              <button 
                                type="button" 
                                onClick={() => setCategoryToDelete(cat)}
                                className="btn btn-outline-danger btn-xs"
                                title="Delete unused category"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =============================================================
          MODAL: EDIT PRODUCT (REDESIGNED LUXURY FORM WITH STOCK & PREVIEW)
         ============================================================= */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content modal-content-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="modal-luxury-header">
              <div className="modal-header-badge-row">
                <span className="modal-pill-tag">
                  <Sparkles size={12} />
                  EDIT CRACKER PRODUCT
                </span>
                <span className="modal-sku-tag">{editingProduct.code}</span>
              </div>
              <h2 className="modal-title-main">
                {editingProduct.name}
              </h2>
              {editingProduct.tamilName && (
                <div className="modal-title-ta">{editingProduct.tamilName}</div>
              )}
              <button onClick={() => setEditingProduct(null)} className="modal-luxury-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="modal-scroll-body modal-luxury-body">
              {/* Section 1: Names & Categorization */}
              <div className="form-card-section">
                <div className="form-sec-title">
                  <Package size={16} className="text-orange" />
                  <span>General Information</span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Product Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. 10 CM ELECTRIC SPARKLER"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tamil Name (தமிழ்)</label>
                    <input
                      type="text"
                      value={editingProduct.tamilName || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, tamilName: e.target.value })}
                      className="form-input font-tamil"
                      placeholder="e.g. 10 செ.மீ கம்பி"
                    />
                  </div>
                </div>

                <div className="form-grid-2 mt-3">
                  <div className="form-group">
                    <label className="form-label">Product Code (SKU)</label>
                    <input
                      type="text"
                      value={editingProduct.code}
                      onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                      className="form-input font-mono"
                      placeholder="e.g. SC-SP01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="form-input select-styled"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.ta ? `(${c.ta})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Packaging */}
              <div className="form-card-section mt-3">
                <div className="form-sec-title">
                  <Tag size={16} className="text-gold" />
                  <span>Pricing & Pack Details</span>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Pack Details</label>
                    <input
                      type="text"
                      value={editingProduct.packDetails || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, packDetails: e.target.value })}
                      className="form-input"
                      placeholder="e.g. 1 Box (10 Pcs)"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editingProduct.unitPrice}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unitPrice: e.target.value })}
                      className="form-input font-price"
                      placeholder="20"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">MRP (₹)</label>
                    <input
                      type="number"
                      value={editingProduct.mrp || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, mrp: e.target.value })}
                      className="form-input"
                      placeholder="80"
                    />
                  </div>
                </div>

                {/* Live Savings Calculator Strip */}
                {editingProduct.unitPrice && editingProduct.mrp && Number(editingProduct.mrp) > Number(editingProduct.unitPrice) && (
                  <div className="live-savings-box mt-3">
                    <Sparkles size={15} className="text-gold" />
                    <span>
                      Direct Factory Savings: <strong>{Math.round(((editingProduct.mrp - editingProduct.unitPrice) / editingProduct.mrp) * 100)}% OFF</strong> • Customer saves <strong>₹{editingProduct.mrp - editingProduct.unitPrice}</strong> per box!
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Stock Quantity & Availability */}
              <div className="form-card-section mt-3">
                <div className="form-sec-title">
                  <Box size={16} className="text-emerald" />
                  <span>Stock Quantity & Inventory</span>
                </div>

                <div className="form-grid-2 align-items-center">
                  <div className="form-group">
                    <label className="form-label">Current Stock Count (Packs Available) *</label>
                    <div className="stock-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        value={editingProduct.stockCount !== undefined ? editingProduct.stockCount : 100}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setEditingProduct({
                            ...editingProduct,
                            stockCount: val,
                            inStock: val > 0 ? editingProduct.inStock : false
                          });
                        }}
                        className="form-input font-stock"
                        placeholder="100"
                      />
                      <span className="stock-unit-label">pkts</span>
                    </div>

                    <div className="stock-presets-row mt-2">
                      <button 
                        type="button" 
                        className="preset-pill"
                        onClick={() => setEditingProduct({ ...editingProduct, stockCount: 0, inStock: false })}
                      >
                        0 (Out)
                      </button>
                      <button 
                        type="button" 
                        className="preset-pill"
                        onClick={() => setEditingProduct({ ...editingProduct, stockCount: 25, inStock: true })}
                      >
                        25 pkts
                      </button>
                      <button 
                        type="button" 
                        className="preset-pill"
                        onClick={() => setEditingProduct({ ...editingProduct, stockCount: 50, inStock: true })}
                      >
                        50 pkts
                      </button>
                      <button 
                        type="button" 
                        className="preset-pill"
                        onClick={() => setEditingProduct({ ...editingProduct, stockCount: 100, inStock: true })}
                      >
                        100 pkts
                      </button>
                      <button 
                        type="button" 
                        className="preset-pill"
                        onClick={() => setEditingProduct({ ...editingProduct, stockCount: 250, inStock: true })}
                      >
                        250 pkts
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Status</label>
                    <div 
                      className={`custom-toggle-card ${editingProduct.inStock !== false && Number(editingProduct.stockCount) > 0 ? 'is-active' : ''}`}
                      onClick={() => {
                        const nextInStock = !editingProduct.inStock;
                        const nextCount = nextInStock ? (editingProduct.stockCount > 0 ? editingProduct.stockCount : 100) : 0;
                        setEditingProduct({
                          ...editingProduct,
                          inStock: nextInStock,
                          stockCount: nextCount
                        });
                      }}
                    >
                      <div className="toggle-switch-indicator">
                        <div className="toggle-switch-knob"></div>
                      </div>
                      <div>
                        <strong>{editingProduct.inStock !== false && Number(editingProduct.stockCount) > 0 ? 'Available In Stock' : 'Out of Stock'}</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          {editingProduct.inStock !== false && Number(editingProduct.stockCount) > 0 
                            ? 'Customers can add this cracker to their order'
                            : 'Order button disabled on customer website'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Product Image & Description */}
              <div className="form-card-section mt-3">
                <div className="form-sec-title">
                  <ImageIcon size={16} className="text-blue" />
                  <span>Product Visual & Description</span>
                </div>

                {/* Hidden Local File Input */}
                <input
                  type="file"
                  ref={editProductFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleLocalImageSelect(e, (imgUrl) => setEditingProduct(prev => ({ ...prev, image: imgUrl })))}
                />

                <div className="image-uploader-card">
                  <div 
                    className="image-thumb-preview-box clickable"
                    onClick={() => editProductFileInputRef.current?.click()}
                    title="Click to choose image from your computer / device"
                  >
                    <img 
                      src={editingProduct.image || '/images/products/sparkler_10cm_colour.png'} 
                      alt="Product preview" 
                      onError={(e) => { e.currentTarget.src = '/images/sharp_crackers_brand_logo.jpg'; }}
                    />
                    <div className="thumb-hover-overlay">
                      <Upload size={18} />
                      <span>Change</span>
                    </div>
                  </div>

                  <div className="image-uploader-content flex-grow-1">
                    <div className="uploader-btn-row">
                      <button 
                        type="button" 
                        className="btn btn-device-upload"
                        onClick={() => editProductFileInputRef.current?.click()}
                      >
                        <FolderOpen size={16} />
                        <span>Choose File from Computer</span>
                      </button>
                      <span className="upload-badge-note">
                        {isUploadingImage ? '⏳ Uploading...' : '📁 Local Storage Picker'}
                      </span>
                    </div>

                    <div className="manual-url-group mt-2">
                      <label className="form-sublabel">Or image URL / filename:</label>
                      <input
                        type="text"
                        value={editingProduct.image || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        className="form-input form-input-sm"
                        placeholder="/images/products/flowerpot_ashoka.jpg"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Description & Effects</label>
                  <textarea
                    rows="2"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="form-input form-textarea"
                    placeholder="Short description of effects, crackling sounds, and safety tips..."
                  />
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="modal-luxury-actions mt-4">
                <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-outline-dark">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary modal-save-btn">
                  <Save size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: ADD NEW PRODUCT (MATCHING LUXURY REDESIGN)
         ============================================================= */}
      {isAddingProduct && (
        <div className="modal-overlay" onClick={() => setIsAddingProduct(false)}>
          <div className="modal-content modal-content-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="modal-luxury-header">
              <div className="modal-header-badge-row">
                <span className="modal-pill-tag">
                  <Plus size={12} />
                  NEW CRACKER PRODUCT
                </span>
                <span className="modal-sku-tag">Auto-Generated Code</span>
              </div>
              <h2 className="modal-title-main">Add New Cracker Product</h2>
              <button onClick={() => setIsAddingProduct(false)} className="modal-luxury-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="modal-scroll-body modal-luxury-body">
              <div className="form-card-section">
                <div className="form-sec-title">
                  <Package size={16} className="text-orange" />
                  <span>General Information</span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Product Name (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50 cm Electric Mega Sparklers"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tamil Name (தமிழ்)</label>
                    <input
                      type="text"
                      placeholder="e.g. 50 செ.மீ கம்பி மத்தாப்பு"
                      value={newProductForm.tamilName}
                      onChange={(e) => setNewProductForm({ ...newProductForm, tamilName: e.target.value })}
                      className="form-input font-tamil"
                    />
                  </div>
                </div>

                <div className="form-grid-2 mt-3">
                  <div className="form-group">
                    <label className="form-label">Product Code (SKU)</label>
                    <input
                      type="text"
                      placeholder="e.g. SC-SP05 (auto if empty)"
                      value={newProductForm.code}
                      onChange={(e) => setNewProductForm({ ...newProductForm, code: e.target.value })}
                      className="form-input font-mono"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      value={newProductForm.category}
                      onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                      className="form-input select-styled"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.ta ? `(${c.ta})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-card-section mt-3">
                <div className="form-sec-title">
                  <Tag size={16} className="text-gold" />
                  <span>Pricing & Pack Details</span>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Pack Details</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Box (10 Pcs)"
                      value={newProductForm.packDetails}
                      onChange={(e) => setNewProductForm({ ...newProductForm, packDetails: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="150"
                      value={newProductForm.unitPrice}
                      onChange={(e) => setNewProductForm({ ...newProductForm, unitPrice: e.target.value })}
                      className="form-input font-price"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">MRP (₹)</label>
                    <input
                      type="number"
                      placeholder="600"
                      value={newProductForm.mrp}
                      onChange={(e) => setNewProductForm({ ...newProductForm, mrp: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-card-section mt-3">
                <div className="form-sec-title">
                  <Box size={16} className="text-emerald" />
                  <span>Stock Quantity & Inventory</span>
                </div>

                <div className="form-grid-2 align-items-center">
                  <div className="form-group">
                    <label className="form-label">Initial Stock Count (Packs) *</label>
                    <div className="stock-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        value={newProductForm.stockCount}
                        onChange={(e) => setNewProductForm({ ...newProductForm, stockCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="form-input font-stock"
                      />
                      <span className="stock-unit-label">pkts</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Status</label>
                    <div 
                      className={`custom-toggle-card ${newProductForm.inStock ? 'is-active' : ''}`}
                      onClick={() => setNewProductForm({ ...newProductForm, inStock: !newProductForm.inStock })}
                    >
                      <div className="toggle-switch-indicator">
                        <div className="toggle-switch-knob"></div>
                      </div>
                      <div>
                        <strong>{newProductForm.inStock ? 'Available In Stock' : 'Out of Stock'}</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Live on customer website</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-card-section mt-3">
                <div className="form-sec-title">
                  <ImageIcon size={16} className="text-blue" />
                  <span>Product Visual & Description</span>
                </div>

                {/* Hidden Local File Input */}
                <input
                  type="file"
                  ref={addProductFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleLocalImageSelect(e, (imgUrl) => setNewProductForm(prev => ({ ...prev, image: imgUrl })))}
                />

                <div className="image-uploader-card">
                  <div 
                    className="image-thumb-preview-box clickable"
                    onClick={() => addProductFileInputRef.current?.click()}
                    title="Click to choose image from your computer / device"
                  >
                    <img 
                      src={newProductForm.image || '/images/products/sparkler_10cm_colour.png'} 
                      alt="New product preview" 
                      onError={(e) => { e.currentTarget.src = '/images/sharp_crackers_brand_logo.jpg'; }}
                    />
                    <div className="thumb-hover-overlay">
                      <Upload size={18} />
                      <span>Upload</span>
                    </div>
                  </div>

                  <div className="image-uploader-content flex-grow-1">
                    <div className="uploader-btn-row">
                      <button 
                        type="button" 
                        className="btn btn-device-upload"
                        onClick={() => addProductFileInputRef.current?.click()}
                      >
                        <FolderOpen size={16} />
                        <span>Choose File from Computer</span>
                      </button>
                      <span className="upload-badge-note">
                        {isUploadingImage ? '⏳ Uploading...' : '📁 Local Storage Picker'}
                      </span>
                    </div>

                    <div className="manual-url-group mt-2">
                      <label className="form-sublabel">Or image URL / filename:</label>
                      <input
                        type="text"
                        placeholder="/images/products/sparkler_10cm_colour.png"
                        value={newProductForm.image}
                        onChange={(e) => setNewProductForm({ ...newProductForm, image: e.target.value })}
                        className="form-input form-input-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Description</label>
                  <textarea
                    rows="2"
                    placeholder="Short description of cracker effects and bursts..."
                    value={newProductForm.description}
                    onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                    className="form-input form-textarea"
                  />
                </div>
              </div>

              <div className="modal-luxury-actions mt-4">
                <button type="button" onClick={() => setIsAddingProduct(false)} className="btn btn-outline-dark">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary modal-save-btn">
                  <Plus size={16} />
                  <span>Create Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: ADD / EDIT CATEGORY (NEW CATEGORIZATION SUPPORT)
         ============================================================= */}
      {(isAddingCategory || editingCategory) && (
        <div className="modal-overlay" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}>
          <div className="modal-content modal-content-category" onClick={(e) => e.stopPropagation()}>
            <div className="modal-luxury-header">
              <div className="modal-header-badge-row">
                <span className="modal-pill-tag">
                  <Layers size={12} />
                  {editingCategory ? 'EDIT CATEGORY' : 'ADD NEW CATEGORY'}
                </span>
              </div>
              <h2 className="modal-title-main">
                {editingCategory ? `Edit: ${editingCategory.name}` : 'Create Firecracker Category'}
              </h2>
              <button onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="modal-luxury-close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="modal-scroll-body modal-luxury-body">
              <div className="form-card-section">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Category Name (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mega Sky Fountains"
                      value={categoryForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const slug = editingCategory ? categoryForm.id : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                        setCategoryForm({ ...categoryForm, name, id: slug });
                      }}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tamil Name (தமிழ்)</label>
                    <input
                      type="text"
                      placeholder="e.g. மெகா ஸ்கை பவுண்டன்"
                      value={categoryForm.ta}
                      onChange={(e) => setCategoryForm({ ...categoryForm, ta: e.target.value })}
                      className="form-input font-tamil"
                    />
                  </div>
                </div>

                <div className="form-grid-2 mt-3">
                  <div className="form-group">
                    <label className="form-label">Category Slug / ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. mega-sky-fountains"
                      value={categoryForm.id}
                      disabled={!!editingCategory}
                      onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="form-input font-mono"
                    />
                    <small className="text-muted" style={{ fontSize: '11px' }}>Used internally for URL filtering.</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category Visual Image</label>
                    {/* Hidden Local File Input for Category */}
                    <input
                      type="file"
                      ref={categoryFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleLocalImageSelect(e, (imgUrl) => setCategoryForm(prev => ({ ...prev, image: imgUrl })))}
                    />
                    <div className="uploader-btn-row">
                      <button 
                        type="button" 
                        className="btn btn-device-upload btn-sm"
                        onClick={() => categoryFileInputRef.current?.click()}
                      >
                        <FolderOpen size={15} />
                        <span>Choose File from Computer</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2 mt-3">
                  <div className="form-group">
                    <label className="form-label">Category Image URL / Path</label>
                    <input
                      type="text"
                      placeholder="/images/products/flowerpot_ashoka.jpg"
                      value={categoryForm.image}
                      onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                      className="form-input form-input-sm"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Subtitle</label>
                    <input
                      type="text"
                      placeholder="e.g. Beautiful multi-color dancing sparklers & fountains"
                      value={categoryForm.desc}
                      onChange={(e) => setCategoryForm({ ...categoryForm, desc: e.target.value })}
                      className="form-input form-input-sm"
                    />
                  </div>
                </div>

                {/* Image Preview Box with click to change */}
                <div 
                  className="cat-preview-banner clickable mt-3"
                  onClick={() => categoryFileInputRef.current?.click()}
                  title="Click to choose a new category picture from computer"
                >
                  <div className="cat-preview-img-box">
                    <img 
                      src={categoryForm.image || '/images/products/sparkler_10cm_colour.png'} 
                      alt="Category preview"
                      onError={(e) => { e.currentTarget.src = '/images/sharp_crackers_brand_logo.jpg'; }}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between">
                      <strong>{categoryForm.name || 'Category Name Preview'}</strong>
                      <span className="cat-change-badge"><Upload size={12} /> Change Photo</span>
                    </div>
                    {categoryForm.ta && <div className="text-orange" style={{ fontSize: '12px' }}>{categoryForm.ta}</div>}
                    <div className="text-muted" style={{ fontSize: '11px' }}>{categoryForm.desc || 'Category description will appear here.'}</div>
                  </div>
                </div>
              </div>

              <div className="modal-luxury-actions mt-4">
                <button type="button" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="btn btn-outline-dark">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary modal-save-btn">
                  <Save size={16} />
                  <span>{editingCategory ? 'Update Category' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: CONFIRM CATEGORY DELETION
         ============================================================= */}
      {categoryToDelete && (
        <div className="modal-overlay" onClick={() => setCategoryToDelete(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={44} className="text-red mb-2" />
            <h3>Delete Category?</h3>
            <p>
              Are you sure you want to delete category <strong>{categoryToDelete.name}</strong>?
            </p>
            <div className="modal-action-bar-bottom d-flex justify-content-end gap-3 mt-3 pt-3 border-top">
              <button type="button" onClick={() => setCategoryToDelete(null)} className="btn btn-outline-dark">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDeleteCategory} className="btn btn-danger">
                <Trash2 size={16} />
                <span>Yes, Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: CONFIRM PRODUCT DELETION
         ============================================================= */}
      {productToDelete && (
        <div className="modal-overlay" onClick={() => setProductToDelete(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={44} className="text-red mb-2" />
            <h3>Delete Product?</h3>
            <p>
              Are you sure you want to delete <strong>{productToDelete.name}</strong> ({productToDelete.code}) from the catalog?
            </p>
            <div className="modal-action-bar-bottom d-flex justify-content-end gap-3 mt-3 pt-3 border-top">
              <button type="button" onClick={() => setProductToDelete(null)} className="btn btn-outline-dark">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDeleteProduct} className="btn btn-danger">
                <Trash2 size={16} />
                <span>Yes, Delete Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: ORDER DETAILS
         ============================================================= */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div>
                <span className="badge badge-festive mb-1">CUSTOMER ORDER DETAILS</span>
                <h2>Order #{selectedOrder.orderId}</h2>
                <span className="text-muted" style={{ fontSize: '13px' }}>
                  Placed on {formatDate(selectedOrder.createdAt).date} at {formatDate(selectedOrder.createdAt).time}
                </span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-scroll-body p-4">
              <div className="order-details-grid">
                <div className="card p-3">
                  <h4 className="detail-card-title">Customer Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <strong>{selectedOrder.customer?.name}</strong>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <a href={`tel:${selectedOrder.customer?.phone}`} className="mobile-link">
                      {selectedOrder.customer?.phone}
                    </a>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span>{selectedOrder.customer?.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Delivery Type:</span>
                    <span className="badge badge-festive">{selectedOrder.customer?.deliveryType || 'Standard'}</span>
                  </div>
                  {selectedOrder.customer?.address && (
                    <div className="detail-row">
                      <span className="detail-label">Address:</span>
                      <span>{selectedOrder.customer.address}</span>
                    </div>
                  )}
                  {selectedOrder.customer?.notes && (
                    <div className="detail-row">
                      <span className="detail-label">Notes:</span>
                      <span className="text-orange">{selectedOrder.customer.notes}</span>
                    </div>
                  )}
                </div>

                <div className="card p-3">
                  <h4 className="detail-card-title">Order Status & Invoice</h4>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateStatus(selectedOrder.orderId, e.target.value)}
                      className={`status-pill status-${selectedOrder.status.toLowerCase()}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="detail-row mt-3">
                    <span className="detail-label">Total Amount:</span>
                    <strong className="text-red font-bold" style={{ fontSize: '18px' }}>
                      {formatCur(selectedOrder.grandTotal)}
                    </strong>
                  </div>

                  <div className="invoice-action-btns mt-3">
                    <button 
                      onClick={() => generateOrderPdf(selectedOrder, settings, true)}
                      className="btn btn-outline-dark btn-sm w-100 mb-2"
                    >
                      <FileText size={15} />
                      <span>Download PDF Bill</span>
                    </button>
                    <button 
                      onClick={() => printOrderDocument(selectedOrder, settings)}
                      className="btn btn-primary btn-sm w-100"
                    >
                      <Printer size={15} />
                      <span>Print Thermal / A4 Sheet</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              <div className="card p-3 mt-3">
                <h4 className="detail-card-title mb-3">Ordered Firecrackers Items ({(selectedOrder.items || []).length})</h4>
                <div className="table-responsive-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Pack</th>
                        <th className="text-right">Rate</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{it.name}</strong>
                            <div className="text-muted" style={{ fontSize: '11px' }}>{it.code}</div>
                          </td>
                          <td>{it.packDetails || '1 Box'}</td>
                          <td className="text-right">{formatCur(it.unitPrice)}</td>
                          <td className="text-center"><strong>{it.quantity}</strong></td>
                          <td className="text-right font-bold text-red">{formatCur(it.totalPrice || (it.unitPrice * it.quantity))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: BACKUP BILLS ARCHIVE
         ============================================================= */}
      {showBackupModal && (
        <div className="modal-overlay" onClick={() => setShowBackupModal(false)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div>
                <span className="badge badge-festive mb-1">ARCHIVE BILLS & HISTORICAL ORDERS</span>
                <h2>30-Day Backup Bills Storage</h2>
                <span className="text-muted" style={{ fontSize: '13px' }}>
                  Secure permanent vault for customer bills past the 30-day active window.
                </span>
              </div>
              <button onClick={() => setShowBackupModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-scroll-body p-4">
              <div className="table-filter-bar mb-3">
                <div className="search-box">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search backup bills by ID, customer name, mobile..."
                    value={backupSearch}
                    onChange={(e) => setBackupSearch(e.target.value)}
                    className="admin-search-input"
                  />
                </div>
              </div>

              {backupOrders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <Archive size={44} className="mb-2" />
                  <h4>No Archived Bills Yet</h4>
                  <p>Bills older than 30 days are automatically archived here.</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th className="text-right">Amount</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupOrders.map((ord) => (
                        <tr key={ord.orderId}>
                          <td><strong>{ord.orderId}</strong></td>
                          <td>{formatDate(ord.createdAt).date}</td>
                          <td>{ord.customer?.name}</td>
                          <td>{ord.customer?.phone}</td>
                          <td className="text-right font-bold text-red">{formatCur(ord.grandTotal)}</td>
                          <td className="text-center">
                            <button
                              onClick={() => handleRestoreOrder(ord.orderId)}
                              className="btn btn-outline-light btn-xs"
                              title="Restore to active orders"
                            >
                              <Undo2 size={13} />
                              <span>Restore</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: CONFIRM ORDER CANCELLATION
         ============================================================= */}
      {orderToCancel && (
        <div className="modal-overlay" onClick={() => setOrderToCancel(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <XCircle size={44} className="text-red mb-2" />
            <h3>Cancel Order #{orderToCancel.orderId}?</h3>
            <p>
              Are you sure you want to mark this order from <strong>{orderToCancel.customer?.name}</strong> as Cancelled?
            </p>
            <div className="modal-action-bar-bottom d-flex justify-content-end gap-3 mt-3 pt-3 border-top">
              <button type="button" onClick={() => setOrderToCancel(null)} className="btn btn-outline-dark">
                Keep Order
              </button>
              <button type="button" onClick={confirmCancelOrder} className="btn btn-danger">
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: CONFIRM ORDER DELETION
         ============================================================= */}
      {orderToDelete && (
        <div className="modal-overlay" onClick={() => setOrderToDelete(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={44} className="text-red mb-2" />
            <h3>Delete Order #{orderToDelete.orderId}?</h3>
            <p>
              Are you sure you want to permanently delete order from <strong>{orderToDelete.customer?.name}</strong>?
            </p>
            <div className="modal-action-bar-bottom d-flex justify-content-end gap-3 mt-3 pt-3 border-top">
              <button type="button" onClick={() => setOrderToDelete(null)} className="btn btn-outline-dark">
                Cancel
              </button>
              <button type="button" onClick={confirmDeleteOrder} className="btn btn-danger">
                <Trash2 size={16} />
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-toast-banner toast-${toastMessage.type || 'success'}`}>
          <CheckCircle size={18} />
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="toast-close-btn" title="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <style>{`
        .admin-dashboard-wrapper {
          min-height: 90vh;
          background: #f8fafc;
          padding-bottom: 5rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .admin-dashboard-wrapper .container-wide {
          max-width: 98% !important;
          width: 98% !important;
          padding-left: 0.75rem !important;
          padding-right: 0.75rem !important;
        }

        .admin-header {
          background: linear-gradient(135deg, #0a1329 0%, #112044 100%);
          color: #ffffff;
          padding: 1.25rem 0;
          border-bottom: 3px solid #ff6f00;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .admin-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .admin-badge {
          background: linear-gradient(135deg, #d90429 0%, #ef233c 100%);
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(217, 4, 41, 0.4);
        }

        .admin-shop-title {
          font-family: var(--font-display, inherit);
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
        }

        .admin-loc {
          font-size: 0.8rem;
          color: #ffd166;
          border-left: 1px solid rgba(255, 255, 255, 0.2);
          padding-left: 0.75rem;
        }

        .admin-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logout-btn:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fecaca;
        }

        /* Incoming order banner */
        .incoming-order-alert-banner {
          background: linear-gradient(135deg, #ff6f00 0%, #ea580c 100%);
          color: #ffffff;
          border-radius: var(--radius-lg);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: 0 8px 25px rgba(234, 88, 12, 0.35);
          animation: pulseBanner 2s infinite ease-in-out;
        }

        @keyframes pulseBanner {
          0%, 100% { box-shadow: 0 8px 25px rgba(234, 88, 12, 0.35); }
          50% { box-shadow: 0 10px 32px rgba(255, 111, 0, 0.6); }
        }

        .alert-pulse-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .alert-text-body {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex-grow: 1;
          font-size: 0.95rem;
        }

        .alert-actions-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .alert-dismiss-btn {
          color: #ffffff;
          font-size: 1.2rem;
          opacity: 0.8;
          padding: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
        }

        /* KPI Section */
        .kpi-section {
          padding: 1.75rem 0 1rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .kpi-card {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
        }

        .kpi-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bg-blue-subtle { background: #eff6ff; }
        .bg-amber-subtle { background: #fffbeb; }
        .bg-emerald-subtle { background: #ecfdf5; }
        .bg-orange-subtle { background: #fff7ed; }

        .text-blue { color: #2563eb; }
        .text-amber { color: #d97706; }
        .text-emerald { color: #059669; }
        .text-orange { color: #ea580c; }

        .kpi-title {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          display: block;
          margin-bottom: 0.25rem;
        }

        .kpi-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        /* Dedicated 2 Primary Admin Tabs */
        .admin-nav-tabs-bar {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.75rem;
        }

        .admin-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.75rem 1.4rem;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-tab-btn:hover {
          background: #f8fafc;
          border-color: #ff6f00;
          color: #ff6f00;
        }

        .admin-tab-btn.active {
          background: linear-gradient(135deg, #ff6f00 0%, #ea580c 100%);
          color: #ffffff;
          border-color: #ff6f00;
          box-shadow: 0 4px 15px rgba(255, 111, 0, 0.35);
        }

        .tab-pending-badge {
          background: #fee2e2;
          color: #dc2626;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
        }

        .admin-tab-btn.active .tab-pending-badge {
          background: #ffffff;
          color: #dc2626;
        }

        /* Catalog Sub-tabs Switcher */
        .catalog-header-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .tab-heading {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.25rem;
        }

        .tab-sub {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        .catalog-top-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .catalog-subtab-switch {
          display: flex;
          background: #e2e8f0;
          padding: 3px;
          border-radius: 8px;
          gap: 3px;
        }

        .subtab-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          border: none;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .subtab-pill.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .catalog-actions-btns {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Filter and Search Bar */
        .table-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          margin-bottom: 1.25rem;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 320px;
          flex-grow: 1;
        }

        .search-icon {
          position: absolute;
          left: 0.85rem;
          color: #94a3b8;
        }

        .admin-search-input {
          width: 100%;
          padding: 0.65rem 2.2rem 0.65rem 2.5rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .admin-search-input:focus {
          border-color: #ff6f00;
        }

        .clear-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .status-filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
        }

        .admin-select {
          padding: 0.65rem 1rem;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        /* Table Styling */
        .table-container {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
        }

        .table-responsive-wrapper {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }

        .admin-table th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.85rem 0.65rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .admin-table td {
          padding: 0.75rem 0.65rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .admin-product-row:hover, .admin-order-row:hover {
          background: #f8fafc;
        }

        .col-sno {
          width: 44px;
        }

        .cart-sno-badge {
          display: inline-block;
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 800;
          background: #eff6ff;
          color: #1e40af;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }

        .code-badge {
          font-family: monospace;
          font-size: 0.78rem;
          font-weight: 800;
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .product-table-img-wrap {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 2px;
          margin: 0 auto;
        }

        .table-row-thumb {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .product-tamil-sub {
          display: block;
          color: #ea580c;
          font-weight: 600;
          font-size: 0.78rem;
        }

        /* Stock Status Badges */
        .stock-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.76rem;
          font-weight: 800;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .stock-badge:hover {
          transform: scale(1.05);
        }

        .stock-in {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .stock-low {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .stock-out {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .stock-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        /* Status Pills */
        .status-pill {
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          font-weight: 800;
          font-size: 0.75rem;
          border: none;
          outline: none;
          cursor: pointer;
        }

        .status-pending { background: #fffbeb; color: #b45309; }
        .status-processing { background: #eff6ff; color: #1e40af; }
        .status-completed { background: #ecfdf5; color: #065f46; }
        .status-cancelled { background: #fef2f2; color: #991b1b; }

        .order-actions-cell, .table-action-btns {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .action-icon-btn-sm {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .action-icon-btn-sm:hover {
          background: #f1f5f9;
          border-color: #ff6f00;
          color: #ff6f00;
          transform: scale(1.08);
        }

        .action-btn-delete:hover {
          background: #fee2e2;
          border-color: #ef4444;
          color: #ef4444;
        }

        /* CATEGORIES GRID VIEW */
        .categories-admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .category-admin-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .category-admin-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          border-color: #ff6f00;
        }

        .cat-card-media-box {
          position: relative;
          height: 140px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .cat-admin-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .cat-product-count-badge {
          position: absolute;
          top: 0.65rem;
          right: 0.65rem;
          background: rgba(10, 19, 41, 0.85);
          color: #ffd166;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
        }

        .cat-card-body-box {
          padding: 1rem 1.25rem;
        }

        .cat-slug-tag {
          font-family: monospace;
          font-size: 0.72rem;
          color: #94a3b8;
          margin-bottom: 0.25rem;
        }

        .cat-card-name-en {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .cat-card-name-ta {
          font-size: 0.85rem;
          color: #ea580c;
          font-weight: 600;
          margin-top: 0.15rem;
        }

        .cat-card-desc {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0.5rem 0 1rem;
          line-height: 1.4;
        }

        .cat-card-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.75rem;
        }

        /* =============================================================
           MODAL: REDESIGNED LUXURY EDIT / ADD PRODUCT MODAL
           ============================================================= */
        .modal-content-luxury {
          max-width: 760px;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 25px 60px rgba(5, 10, 24, 0.35);
          border: 1px solid rgba(255, 183, 3, 0.4);
          animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-content-category {
          max-width: 580px;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 25px 60px rgba(5, 10, 24, 0.35);
          animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalPop {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-luxury-header {
          position: relative;
          background: linear-gradient(135deg, #0a1329 0%, #162447 100%);
          color: #ffffff;
          padding: 1.5rem 2rem 1.25rem;
          border-bottom: 3px solid #ff6f00;
        }

        .modal-header-badge-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.45rem;
        }

        .modal-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255, 183, 3, 0.2);
          border: 1px solid rgba(255, 183, 3, 0.5);
          color: #ffd166;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
        }

        .modal-sku-tag {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 0.75rem;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
        }

        .modal-title-main {
          font-size: 1.45rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
          line-height: 1.2;
        }

        .modal-title-ta {
          font-size: 0.95rem;
          color: #ffd166;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .modal-luxury-close {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-luxury-close:hover {
          background: #d90429;
          transform: rotate(90deg);
        }

        .modal-luxury-body {
          padding: 1.5rem 2rem 2rem;
          max-height: 75vh;
          overflow-y: auto;
          background: #fdfdfd;
        }

        .form-card-section {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .form-sec-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.5rem;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .form-input {
          width: 100%;
          padding: 0.7rem 0.95rem;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
          font-size: 0.92rem;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          border-color: #ff6f00;
          box-shadow: 0 0 0 3px rgba(255, 111, 0, 0.15);
          background: #fffdfa;
        }

        .font-price {
          font-weight: 800;
          color: #d90429;
          font-size: 1.1rem;
        }

        .font-stock {
          font-weight: 800;
          color: #065f46;
          font-size: 1.1rem;
        }

        .font-tamil {
          font-weight: 600;
          color: #ea580c;
        }

        .font-mono {
          font-family: monospace;
          font-weight: 700;
        }

        .form-textarea {
          resize: vertical;
          min-height: 64px;
        }

        /* Stock Quantity Stepper & Presets */
        .stock-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .stock-unit-label {
          position: absolute;
          right: 0.85rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          pointer-events: none;
        }

        .stock-presets-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .preset-pill {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .preset-pill:hover {
          background: #ff6f00;
          color: #ffffff;
          border-color: #ff6f00;
        }

        /* Custom Animated Toggle Switch Card */
        .custom-toggle-card {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.25s ease;
          user-select: none;
        }

        .custom-toggle-card.is-active {
          background: #ecfdf5;
          border-color: #10b981;
        }

        .toggle-switch-indicator {
          width: 44px;
          height: 24px;
          border-radius: 999px;
          background: #cbd5e1;
          position: relative;
          transition: background 0.25s ease;
          flex-shrink: 0;
        }

        .custom-toggle-card.is-active .toggle-switch-indicator {
          background: #10b981;
        }

        .toggle-switch-knob {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.25s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }

        .custom-toggle-card.is-active .toggle-switch-knob {
          transform: translateX(20px);
        }

        /* Image Uploader Card & Device File Picker */
        .image-uploader-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: #f8fafc;
          border: 1.5px dashed #cbd5e1;
          padding: 1rem;
          border-radius: 12px;
          transition: all 0.25s ease;
        }

        .image-uploader-card:hover {
          border-color: #ff6f00;
          background: #fffaf5;
        }

        .image-thumb-preview-box {
          position: relative;
          width: 82px;
          height: 82px;
          border-radius: 12px;
          background: #ffffff;
          border: 2px solid #fed7aa;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          padding: 4px;
          cursor: pointer;
        }

        .image-thumb-preview-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transition: transform 0.2s ease;
        }

        .image-thumb-preview-box:hover img {
          transform: scale(1.08);
        }

        .thumb-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 700;
          opacity: 0;
          transition: opacity 0.2s ease;
          border-radius: 10px;
        }

        .image-thumb-preview-box:hover .thumb-hover-overlay {
          opacity: 1;
        }

        .uploader-btn-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-device-upload {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #1e293b;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
        }

        .btn-device-upload:hover {
          background: #ff6f00;
          border-color: #ff6f00;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 111, 0, 0.35);
        }

        .btn-device-upload.btn-sm {
          padding: 0.35rem 0.75rem;
          font-size: 0.78rem;
        }

        .upload-badge-note {
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .form-sublabel {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          display: block;
          margin-bottom: 3px;
        }

        .form-input-sm {
          font-size: 0.82rem;
          padding: 0.45rem 0.75rem;
          height: auto;
        }

        /* Live Savings Box */
        .live-savings-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
        }

        /* Category Preview Banner in Category Modal */
        .cat-preview-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cat-preview-banner:hover {
          border-color: #ff6f00;
          background: #fffaf5;
        }

        .cat-change-badge {
          font-size: 11px;
          font-weight: 700;
          color: #ff6f00;
          background: rgba(255, 111, 0, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .cat-preview-img-box {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          padding: 2px;
        }

        .cat-preview-img-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        /* Modal Luxury Footer Actions */
        .modal-luxury-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.85rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .modal-save-btn {
          background: linear-gradient(135deg, #ff6f00 0%, #d90429 100%);
          border: none;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(255, 111, 0, 0.35);
          font-weight: 700;
          padding: 0.75rem 1.6rem;
          border-radius: 8px;
        }

        .modal-save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(217, 4, 41, 0.4);
        }

        /* Toast Notifications */
        .admin-toast-banner {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #0f172a;
          color: #ffffff;
          padding: 0.85rem 1.35rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          z-index: 1050;
          font-size: 0.9rem;
          font-weight: 600;
          border-left: 4px solid #10b981;
          animation: slideInUp 0.25s ease-out;
        }

        .toast-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .retention-strip {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 10px;
        }

        .retention-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          flex-shrink: 0;
        }

        .retention-pill-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #065f46;
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-weight: 700;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .backup-archive-btn {
          font-size: 11px;
          padding: 4px 10px;
          background: #fffbeb;
          color: #b45309;
          border-color: #fde68a;
          font-weight: 700;
        }

        .retention-check-btn {
          font-size: 11px;
          padding: 4px 8px;
          color: #475569;
        }

        .retention-countdown-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          margin-top: 2px;
          width: fit-content;
        }

        .retention-ok {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .retention-warning {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .retention-expired {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        @media (max-width: 768px) {
          .form-grid-2, .form-grid-3 {
            grid-template-columns: 1fr;
          }
          .catalog-header-actions-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .catalog-top-controls {
            width: 100%;
            justify-content: space-between;
          }
          .kpi-grid {
            grid-template-columns: 1fr 1fr;
          }
          .admin-nav-tabs-bar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};
