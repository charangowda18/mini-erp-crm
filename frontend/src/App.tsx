import React, { useState, useEffect } from 'react';
import { 
  Users, Package, FileText, AlertTriangle, LogOut, Search, Plus, 
  ArrowUpDown, Check, Trash2, Calendar, ShoppingBag, Eye, X, Shield, Printer
} from 'lucide-react';

const API_BASE = "https://mini-erp-crm-api-t9uv.onrender.com/api";

// Roles & Permissions Mapping
const PERMISSIONS = {
  Admin: {
    customers: ['view', 'create', 'edit'],
    products: ['view', 'create', 'edit'],
    challans: ['view', 'create', 'confirm', 'cancel'],
    stock: ['view', 'create']
  },
  Sales: {
    customers: ['view', 'create', 'edit'],
    products: ['view'],
    challans: ['view', 'create', 'confirm'],
    stock: ['view']
  },
  Warehouse: {
    customers: ['view'],
    products: ['view', 'create', 'edit'],
    challans: ['view'],
    stock: ['view', 'create']
  },
  Accounts: {
    customers: ['view'],
    products: ['view'],
    challans: ['view'],
    stock: ['view']
  }
};

function App() {
  // Navigation & Auth State
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'customers' | 'products' | 'challans'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number, text: string, type: 'success' | 'error' | 'info' }>>([]);
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('admin@erp.com');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Detail Modal States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);

  // Form Modal States
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showChallanForm, setShowChallanForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);

  // Editing items
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form Inputs
  const [customerForm, setCustomerForm] = useState({
    name: '', mobile: '', email: '', business_name: '', gst_number: '', customer_type: 'Retail', address: '', status: 'Lead', follow_up_date: '', notes: ''
  });
  const [productForm, setProductForm] = useState({
    name: '', sku: '', category: '', unit_price: 0, current_stock: 0, min_stock_alert: 0, location_warehouse: ''
  });
  const [movementForm, setMovementForm] = useState({
    quantity_changed: 1, movement_type: 'IN', reason: ''
  });
  const [challanForm, setChallanForm] = useState<{
    customer_id: string,
    status: 'Draft' | 'Confirmed',
    items: Array<{ product_id: string, quantity: number }>
  }>({
    customer_id: '',
    status: 'Draft',
    items: [{ product_id: '', quantity: 1 }]
  });
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpNextDate, setFollowUpNextDate] = useState('');

  // Data Lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [customerPagination, setCustomerPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [challanPagination, setChallanPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Detail View Data
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [productDetail, setProductDetail] = useState<any>(null);
  const [challanDetail, setChallanDetail] = useState<any>(null);

  // Search & Filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [challanStatusFilter, setChallanStatusFilter] = useState('');

  // Toast notifier helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Auth Hook
  useEffect(() => {
    const storedToken = localStorage.getItem('erp_token');
    const storedUser = localStorage.getItem('erp_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Fetch data depending on currently selected tab
  useEffect(() => {
    if (token) {
      if (currentTab === 'dashboard') {
        fetchDashboardStats();
      } else if (currentTab === 'customers') {
        fetchCustomers();
      } else if (currentTab === 'products') {
        fetchProducts();
      } else if (currentTab === 'challans') {
        fetchChallans();
      }
    }
  }, [currentTab, token, customerSearch, productSearch, productCategoryFilter, challanStatusFilter, customerPagination.page, productPagination.page, challanPagination.page]);

  // Auth Functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
      localStorage.setItem('erp_token', data.token);
      localStorage.setItem('erp_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      showToast("Logged in successfully!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
    showToast("Logged out successfully", "info");
  };

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    const role = user.role;
    return PERMISSIONS[role as keyof typeof PERMISSIONS]?.[module as keyof typeof PERMISSIONS['Admin']]?.includes(action) ?? false;
  };

  // API Call helper
  const apiCall = async (url: string, method = 'GET', body: any = null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API_BASE}${url}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  // Fetch Services
  const fetchDashboardStats = async () => {
    try {
      const lowStock = await apiCall('/products/low-stock');
      setLowStockProducts(lowStock);
      
      const cRes = await apiCall('/customers?limit=1');
      const pRes = await apiCall('/products?limit=1');
      const chRes = await apiCall('/challans?limit=1');
      
      setCustomerPagination(prev => ({ ...prev, total: cRes.pagination.total }));
      setProductPagination(prev => ({ ...prev, total: pRes.pagination.total }));
      setChallanPagination(prev => ({ ...prev, total: chRes.pagination.total }));
    } catch (err: any) {
      showToast("Error loading statistics: " + err.message, "error");
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiCall(`/customers?page=${customerPagination.page}&limit=10&search=${customerSearch}`);
      setCustomers(data.data);
      setCustomerPagination(prev => ({ ...prev, total: data.pagination.total }));
    } catch (err: any) {
      showToast("Error loading customers", "error");
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiCall(`/products?page=${productPagination.page}&limit=10&search=${productSearch}&category=${productCategoryFilter}`);
      setProducts(data.data);
      setProductPagination(prev => ({ ...prev, total: data.pagination.total }));
    } catch (err: any) {
      showToast("Error loading products", "error");
    }
  };

  const fetchChallans = async () => {
    try {
      const data = await apiCall(`/challans?page=${challanPagination.page}&limit=10&status=${challanStatusFilter}`);
      setChallans(data.data);
      setChallanPagination(prev => ({ ...prev, total: data.pagination.total }));
    } catch (err: any) {
      showToast("Error loading challans", "error");
    }
  };

  const loadCustomerDetail = async (id: string) => {
    try {
      const data = await apiCall(`/customers/${id}`);
      setCustomerDetail(data);
      setSelectedCustomerId(id);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const loadProductDetail = async (id: string) => {
    try {
      const data = await apiCall(`/products/${id}`);
      setProductDetail(data);
      setSelectedProductId(id);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const loadChallanDetail = async (id: string) => {
    try {
      const data = await apiCall(`/challans/${id}`);
      setChallanDetail(data);
      setSelectedChallanId(id);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Submit Operations
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await apiCall(`/customers/${editingCustomer.id}`, 'PUT', customerForm);
        showToast("Customer updated successfully!", "success");
      } else {
        await apiCall('/customers', 'POST', customerForm);
        showToast("Customer created successfully!", "success");
      }
      setShowCustomerForm(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await apiCall(`/products/${editingProduct.id}`, 'PUT', productForm);
        showToast("Product updated successfully!", "success");
      } else {
        await apiCall('/products', 'POST', productForm);
        showToast("Product created successfully!", "success");
      }
      setShowProductForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpNote) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiCall(`/customers/${selectedCustomerId}/follow-ups`, 'POST', {
        notes: followUpNote,
        next_follow_up_date: followUpNextDate || null
      });
      showToast("Follow-up note added!", "success");
      setFollowUpNote('');
      setFollowUpNextDate('');
      loadCustomerDetail(selectedCustomerId!);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiCall(`/products/${selectedProductId}/stock-movements`, 'POST', movementForm);
      showToast("Stock movement recorded!", "success");
      setShowMovementForm(false);
      setMovementForm({ quantity_changed: 1, movement_type: 'IN', reason: '' });
      loadProductDetail(selectedProductId!);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic verification
    if (!challanForm.customer_id) {
      showToast("Please select a customer", "error");
      return;
    }
    const invalidItem = challanForm.items.some(item => !item.product_id || item.quantity < 1);
    if (invalidItem) {
      showToast("Please ensure all products and quantities are valid", "error");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiCall('/challans', 'POST', challanForm);
      showToast(`Challan created as ${challanForm.status}!`, "success");
      setShowChallanForm(false);
      setChallanForm({ customer_id: '', status: 'Draft', items: [{ product_id: '', quantity: 1 }] });
      fetchChallans();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Challan confirmations / cancellations
  const handleConfirmChallan = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data = await apiCall(`/challans/${id}/confirm`, 'PATCH');
      showToast("Challan confirmed successfully!", "success");
      setChallanDetail(data); // Refresh detail
      fetchChallans(); // Refresh table
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelChallan = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this challan? This cannot be undone.")) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data = await apiCall(`/challans/${id}/cancel`, 'PATCH');
      showToast("Challan cancelled.", "info");
      setChallanDetail(data); // Refresh detail
      fetchChallans(); // Refresh table
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (loading) {
    return <div className="login-container"><div className="loader">Loading ERP portal...</div></div>;
  }

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">Mini ERP + CRM</div>
          <div className="login-subtitle">Operations Portal Log In</div>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                required 
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Log In
            </button>
          </form>

          <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Demo Logins:</p>
            <p>Admin: admin@erp.com / password123</p>
            <p>Sales: sales@erp.com / password123</p>
            <p>Warehouse: warehouse@erp.com / password123</p>
            <p>Accounts: accounts@erp.com / password123</p>
          </div>
        </div>
        
        {/* Toast Notifier */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notifier */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ShoppingBag size={24} />
          <span>Mini ERP Portal</span>
        </div>
        
        <nav className="sidebar-menu">
          <button 
            className={`sidebar-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('dashboard'); setSelectedCustomerId(null); setSelectedProductId(null); setSelectedChallanId(null); }}
          >
            <ArrowUpDown size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`sidebar-item ${currentTab === 'customers' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('customers'); setSelectedCustomerId(null); setSelectedProductId(null); setSelectedChallanId(null); }}
          >
            <Users size={18} />
            <span>Customers CRM</span>
          </button>
          <button 
            className={`sidebar-item ${currentTab === 'products' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('products'); setSelectedCustomerId(null); setSelectedProductId(null); setSelectedChallanId(null); }}
          >
            <Package size={18} />
            <span>Product & Inventory</span>
          </button>
          <button 
            className={`sidebar-item ${currentTab === 'challans' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('challans'); setSelectedCustomerId(null); setSelectedProductId(null); setSelectedChallanId(null); }}
          >
            <FileText size={18} />
            <span>Sales Challans</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="sidebar-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="main-wrapper">
        <header className="main-header">
          <h1 className="page-title" style={{ textTransform: 'capitalize' }}>
            {selectedCustomerId && "Customer Profile"}
            {selectedProductId && "Product Specification"}
            {selectedChallanId && "Challan Detail"}
            {!selectedCustomerId && !selectedProductId && !selectedChallanId && currentTab}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Shield size={16} className="text-primary" />
            <span>Role: <strong>{user?.role}</strong></span>
          </div>
        </header>

        <main className="main-content">
          {/* =================================================================== */}
          {/* CUSTOMER DETAIL VIEW */}
          {/* =================================================================== */}
          {selectedCustomerId && customerDetail && (
            <div className="detail-grid">
              <div className="detail-card-left">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2>{customerDetail.name}</h2>
                  <span className={`badge ${
                    customerDetail.status === 'Active' ? 'badge-success' : 
                    customerDetail.status === 'Lead' ? 'badge-warning' : 'badge-danger'
                  }`}>{customerDetail.status}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Business Name</span>
                  <span className="detail-value">{customerDetail.business_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Mobile</span>
                  <span className="detail-value">{customerDetail.mobile}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{customerDetail.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">GST Number</span>
                  <span className="detail-value">{customerDetail.gst_number || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Customer Type</span>
                  <span className="detail-value">{customerDetail.customer_type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{customerDetail.address}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Next Follow-up</span>
                  <span className="detail-value">
                    {customerDetail.follow_up_date ? new Date(customerDetail.follow_up_date).toLocaleDateString() : "No follow-up planned"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Initial Notes</span>
                  <span className="detail-value">{customerDetail.notes || "No initial notes"}</span>
                </div>

                <button className="btn btn-secondary" style={{ marginTop: '24px' }} onClick={() => setSelectedCustomerId(null)}>
                  Back to List
                </button>
              </div>

              <div className="detail-card-right">
                <div className="card">
                  <h3>CRM History & Notes</h3>
                  
                  {hasPermission('customers', 'edit') && (
                    <form onSubmit={handleFollowUpSubmit} style={{ marginTop: '16px', marginBottom: '24px' }}>
                      <div className="form-group">
                        <label className="form-label">Add follow-up notes</label>
                        <textarea 
                          className="form-control" 
                          rows={3} 
                          value={followUpNote} 
                          onChange={(e) => setFollowUpNote(e.target.value)} 
                          placeholder="Type notes from your conversation here..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Next Follow-up Date (Optional)</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          value={followUpNextDate} 
                          onChange={(e) => setFollowUpNextDate(e.target.value)} 
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Save Follow-up Note
                      </button>
                    </form>
                  )}

                  <div className="timeline">
                    <h4>Timeline Notes</h4>
                    {customerDetail.recent_follow_ups && customerDetail.recent_follow_ups.length > 0 ? (
                      customerDetail.recent_follow_ups.map((note: any) => (
                        <div className="timeline-item" key={note.id}>
                          <div className="timeline-meta">
                            <span>Logged by {note.created_by_name || 'System'}</span>
                            <span>{new Date(note.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="timeline-notes">{note.notes}</p>
                          {note.next_follow_up_date && (
                            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--warning)' }}>
                              <Calendar size={12} /> Next follow-up: {new Date(note.next_follow_up_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>No timeline notes recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* PRODUCT DETAIL VIEW */}
          {/* =================================================================== */}
          {selectedProductId && productDetail && (
            <div className="detail-grid">
              <div className="detail-card-left">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2>{productDetail.name}</h2>
                  <span className={`badge ${productDetail.current_stock <= productDetail.min_stock_alert ? 'badge-danger' : 'badge-success'}`}>
                    Stock: {productDetail.current_stock}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">SKU / Code</span>
                  <span className="detail-value">{productDetail.sku}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{productDetail.category}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Unit Price</span>
                  <span className="detail-value">₹ {productDetail.unit_price}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Minimum Stock Alert</span>
                  <span className="detail-value">{productDetail.min_stock_alert} units</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Warehouse Location</span>
                  <span className="detail-value">{productDetail.location_warehouse}</span>
                </div>

                <button className="btn btn-secondary" style={{ marginTop: '24px' }} onClick={() => setSelectedProductId(null)}>
                  Back to List
                </button>
              </div>

              <div className="detail-card-right">
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Stock Ledger Log</h3>
                    {hasPermission('stock', 'create') && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowMovementForm(true)}>
                        <Plus size={14} /> Log Entry
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {productDetail.recent_stock_movements && productDetail.recent_stock_movements.length > 0 ? (
                      <table className="table" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productDetail.recent_stock_movements.map((move: any) => (
                            <tr key={move.id}>
                              <td>{new Date(move.created_at).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${move.movement_type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                                  {move.movement_type}
                                </span>
                              </td>
                              <td>{move.quantity_changed}</td>
                              <td>{move.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No stock logs recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* CHALLAN DETAIL VIEW */}
          {/* =================================================================== */}
          {selectedChallanId && challanDetail && (
            <div className="detail-card-left" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Challan {challanDetail.challan_number}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Created: {new Date(challanDetail.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${
                  challanDetail.status === 'Confirmed' ? 'badge-success' : 
                  challanDetail.status === 'Draft' ? 'badge-info' : 'badge-danger'
                }`} style={{ fontSize: '14px', padding: '6px 14px' }}>{challanDetail.status}</span>
              </div>

              <div className="form-row" style={{ marginBottom: '32px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Customer Details</p>
                  <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{challanDetail.customer_name}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{challanDetail.customer_business}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Ph: {challanDetail.customer_mobile}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Delivery Address</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{challanDetail.customer_address}</p>
                </div>
              </div>

              <h3>Products Snapshot Included</h3>
              <div className="table-wrapper" style={{ marginTop: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challanDetail.items.map((item: any) => (
                      <tr key={item.id}>
                        <td>{item.product_name_snapshot}</td>
                        <td><code>{item.product_sku_snapshot}</code></td>
                        <td style={{ textAlign: 'right' }}>₹ {item.product_price_snapshot}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}><strong>₹ {item.line_total}</strong></td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: 'var(--bg-app)' }}>
                      <td colSpan={3} style={{ fontWeight: 700 }}>Totals</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{challanDetail.total_quantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>₹ {challanDetail.total_amount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedChallanId(null)}>
                  Back to List
                </button>

                <button className="btn btn-secondary" onClick={() => window.print()}>
                  <Printer size={16} /> Export PDF / Print
                </button>
                
                {challanDetail.status === 'Draft' && hasPermission('challans', 'confirm') && (
                  <button className="btn btn-primary" onClick={() => handleConfirmChallan(challanDetail.id)}>
                    <Check size={16} /> Confirm & Dispatch Stock
                  </button>
                )}

                {challanDetail.status !== 'Cancelled' && hasPermission('challans', 'cancel') && (
                  <button className="btn btn-danger" onClick={() => handleCancelChallan(challanDetail.id)}>
                    Cancel Challan
                  </button>
                )}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* DASHBOARD TAB VIEW */}
          {/* =================================================================== */}
          {!selectedCustomerId && !selectedProductId && !selectedChallanId && currentTab === 'dashboard' && (
            <div>
              <div className="card-grid">
                <div className="card" onClick={() => setCurrentTab('customers')} style={{ cursor: 'pointer' }}>
                  <div className="card-summary">
                    <div className="card-info">
                      <h3>Total Customers</h3>
                      <p>{customerPagination.total}</p>
                    </div>
                    <div className="card-icon"><Users size={20} /></div>
                  </div>
                </div>

                <div className="card" onClick={() => setCurrentTab('products')} style={{ cursor: 'pointer' }}>
                  <div className="card-summary">
                    <div className="card-info">
                      <h3>Total Catalog Products</h3>
                      <p>{productPagination.total}</p>
                    </div>
                    <div className="card-icon"><Package size={20} /></div>
                  </div>
                </div>

                <div className="card card-danger" onClick={() => setCurrentTab('products')} style={{ cursor: 'pointer' }}>
                  <div className="card-summary">
                    <div className="card-info">
                      <h3>Low Stock Warnings</h3>
                      <p>{lowStockProducts.length}</p>
                    </div>
                    <div className="card-icon"><AlertTriangle size={20} /></div>
                  </div>
                </div>

                <div className="card" onClick={() => setCurrentTab('challans')} style={{ cursor: 'pointer' }}>
                  <div className="card-summary">
                    <div className="card-info">
                      <h3>Total Invoices / Challans</h3>
                      <p>{challanPagination.total}</p>
                    </div>
                    <div className="card-icon"><FileText size={20} /></div>
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                {/* Low Stock Alerts table list */}
                <div className="detail-card-left" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <AlertTriangle color="var(--danger)" size={18} />
                    <h3 className="section-title">Critical Low Stock Alerts</h3>
                  </div>
                  {lowStockProducts.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>SKU</th>
                            <th>Alert Qty</th>
                            <th>Current Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockProducts.map((prod: any) => (
                            <tr key={prod.id} className="low-stock-row">
                              <td>{prod.name}</td>
                              <td><code>{prod.sku}</code></td>
                              <td>{prod.min_stock_alert}</td>
                              <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{prod.current_stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>All product stocks are at healthy quantities. No stock alerts active.</p>
                  )}
                </div>

                <div className="detail-card-right">
                  <div className="card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><Shield size={18} /> Roles & Authorization Guide</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>This portal implements role-based route constraints:</p>
                    <ul style={{ fontSize: '13px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li><strong>Admin:</strong> View all modules, edit CRM, edit products, confirm/cancel challans.</li>
                      <li><strong>Sales:</strong> View modules, add/edit Customers, create/confirm Challans.</li>
                      <li><strong>Warehouse:</strong> View modules, update Products inventory catalog, log manual stock entries.</li>
                      <li><strong>Accounts:</strong> Read-only lookup permissions on all portal modules.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* CUSTOMERS CRM TAB VIEW */}
          {/* =================================================================== */}
          {!selectedCustomerId && currentTab === 'customers' && (
            <div>
              <div className="section-header">
                <h2>Customer Directory</h2>
                {hasPermission('customers', 'create') && (
                  <button className="btn btn-primary" onClick={() => {
                    setCustomerForm({ name: '', mobile: '', email: '', business_name: '', gst_number: '', customer_type: 'Retail', address: '', status: 'Lead', follow_up_date: '', notes: '' });
                    setEditingCustomer(null);
                    setShowCustomerForm(true);
                  }}>
                    <Plus size={16} /> Add Customer
                  </button>
                )}
              </div>

              <div className="search-bar-container">
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search by name, business, email, mobile..." 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Business</th>
                      <th>Mobile</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Next Follow-up</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((cust: any) => (
                      <tr key={cust.id}>
                        <td><strong>{cust.name}</strong></td>
                        <td>{cust.business_name}</td>
                        <td>{cust.mobile}</td>
                        <td>{cust.customer_type}</td>
                        <td>
                          <span className={`badge ${
                            cust.status === 'Active' ? 'badge-success' : 
                            cust.status === 'Lead' ? 'badge-warning' : 'badge-danger'
                          }`}>{cust.status}</span>
                        </td>
                        <td>{cust.follow_up_date ? new Date(cust.follow_up_date).toLocaleDateString() : "—"}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => loadCustomerDetail(cust.id)}>
                              <Eye size={12} /> View
                            </button>
                            {hasPermission('customers', 'edit') && (
                              <button className="btn btn-secondary btn-sm" onClick={() => {
                                setEditingCustomer(cust);
                                setCustomerForm({
                                  name: cust.name, mobile: cust.mobile, email: cust.email, business_name: cust.business_name,
                                  gst_number: cust.gst_number || '', customer_type: cust.customer_type, address: cust.address,
                                  status: cust.status, follow_up_date: cust.follow_up_date ? cust.follow_up_date.slice(0,10) : '', notes: cust.notes || ''
                                });
                                setShowCustomerForm(true);
                              }}>
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-container">
                <span className="pagination-text">Showing {customers.length} of {customerPagination.total} customers</span>
                <div className="pagination-buttons">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={customerPagination.page === 1}
                    onClick={() => setCustomerPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Prev
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={customerPagination.page * 10 >= customerPagination.total}
                    onClick={() => setCustomerPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* PRODUCTS TAB VIEW */}
          {/* =================================================================== */}
          {!selectedProductId && currentTab === 'products' && (
            <div>
              <div className="section-header">
                <h2>Product Catalog & Inventory</h2>
                {hasPermission('products', 'create') && (
                  <button className="btn btn-primary" onClick={() => {
                    setProductForm({ name: '', sku: '', category: '', unit_price: 0, current_stock: 0, min_stock_alert: 0, location_warehouse: '' });
                    setEditingProduct(null);
                    setShowProductForm(true);
                  }}>
                    <Plus size={16} /> Add Product
                  </button>
                )}
              </div>

              <div className="search-bar-container">
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search by product name, SKU..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div style={{ width: '200px' }}>
                  <select 
                    className="form-control" 
                    value={productCategoryFilter} 
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="Grains">Grains</option>
                    <option value="Pulses">Pulses</option>
                    <option value="Oils">Oils</option>
                    <option value="Essentials">Essentials</option>
                  </select>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Stock Qty</th>
                      <th>Warehouse</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod: any) => {
                      const isLowStock = prod.current_stock <= prod.min_stock_alert;
                      return (
                        <tr key={prod.id} className={isLowStock ? 'low-stock-row' : ''}>
                          <td><strong>{prod.name}</strong></td>
                          <td><code>{prod.sku}</code></td>
                          <td>{prod.category}</td>
                          <td>₹ {prod.unit_price}</td>
                          <td style={{ fontWeight: isLowStock ? 700 : 'normal', color: isLowStock ? 'var(--danger)' : 'inherit' }}>
                            {prod.current_stock} 
                            {isLowStock && <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>Low</span>}
                          </td>
                          <td>{prod.location_warehouse}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => loadProductDetail(prod.id)}>
                                <Eye size={12} /> View
                              </button>
                              {hasPermission('products', 'edit') && (
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                  setEditingProduct(prod);
                                  setProductForm({
                                    name: prod.name, sku: prod.sku, category: prod.category, unit_price: Number(prod.unit_price),
                                    current_stock: prod.current_stock, min_stock_alert: prod.min_stock_alert, location_warehouse: prod.location_warehouse
                                  });
                                  setShowProductForm(true);
                                }}>
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination-container">
                <span className="pagination-text">Showing {products.length} of {productPagination.total} products</span>
                <div className="pagination-buttons">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={productPagination.page === 1}
                    onClick={() => setProductPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Prev
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={productPagination.page * 10 >= productPagination.total}
                    onClick={() => setProductPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* CHALLANS TAB VIEW */}
          {/* =================================================================== */}
          {!selectedChallanId && currentTab === 'challans' && (
            <div>
              <div className="section-header">
                <h2>Sales Challans Ledger</h2>
                {hasPermission('challans', 'create') && (
                  <button className="btn btn-primary" onClick={() => {
                    // Populate initial forms dependencies
                    apiCall('/customers?limit=100').then(data => setCustomers(data.data));
                    apiCall('/products?limit=100').then(data => setProducts(data.data));
                    setChallanForm({ customer_id: '', status: 'Draft', items: [{ product_id: '', quantity: 1 }] });
                    setShowChallanForm(true);
                  }}>
                    <Plus size={16} /> Create Challan
                  </button>
                )}
              </div>

              <div className="search-bar-container">
                <div style={{ width: '200px' }}>
                  <select 
                    className="form-control" 
                    value={challanStatusFilter} 
                    onChange={(e) => setChallanStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Challan Number</th>
                      <th>Customer</th>
                      <th>Total Qty</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map((ch: any) => (
                      <tr key={ch.id}>
                        <td><strong>{ch.challan_number}</strong></td>
                        <td>
                          <div>{ch.customer_name}</div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ch.customer_business}</span>
                        </td>
                        <td>{ch.total_quantity}</td>
                        <td>₹ {ch.total_amount}</td>
                        <td>
                          <span className={`badge ${
                            ch.status === 'Confirmed' ? 'badge-success' : 
                            ch.status === 'Draft' ? 'badge-info' : 'badge-danger'
                          }`}>{ch.status}</span>
                        </td>
                        <td>{ch.created_by_name}</td>
                        <td>{new Date(ch.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => loadChallanDetail(ch.id)}>
                            <Eye size={12} /> Open Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-container">
                <span className="pagination-text">Showing {challans.length} of {challanPagination.total} challans</span>
                <div className="pagination-buttons">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={challanPagination.page === 1}
                    onClick={() => setChallanPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Prev
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={challanPagination.page * 10 >= challanPagination.total}
                    onClick={() => setChallanPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* CUSTOMER FORM MODAL */}
      {/* =================================================================== */}
      {showCustomerForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCustomer ? 'Update CRM Customer' : 'Add New CRM Lead/Customer'}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowCustomerForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input type="text" className="form-control" required value={customerForm.name} onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input type="text" className="form-control" required value={customerForm.business_name} onChange={(e) => setCustomerForm(prev => ({ ...prev, business_name: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input type="tel" className="form-control" required value={customerForm.mobile} onChange={(e) => setCustomerForm(prev => ({ ...prev, mobile: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control" required value={customerForm.email} onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GST Number (Optional)</label>
                  <input type="text" className="form-control" value={customerForm.gst_number} onChange={(e) => setCustomerForm(prev => ({ ...prev, gst_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Classification</label>
                  <select className="form-control" value={customerForm.customer_type} onChange={(e) => setCustomerForm(prev => ({ ...prev, customer_type: e.target.value }))}>
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows={2} required value={customerForm.address} onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CRM Status</label>
                  <select className="form-control" value={customerForm.status} onChange={(e) => setCustomerForm(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="Lead">Lead</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Follow-up Target</label>
                  <input type="date" className="form-control" value={customerForm.follow_up_date} onChange={(e) => setCustomerForm(prev => ({ ...prev, follow_up_date: e.target.value }))} />
                </div>
              </div>
              {!editingCustomer && (
                <div className="form-group">
                  <label className="form-label">Initial Notes</label>
                  <textarea className="form-control" rows={2} value={customerForm.notes} onChange={(e) => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRODUCT FORM MODAL */}
      {/* =================================================================== */}
      {showProductForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Update Product Details' : 'Add New Inventory Product'}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowProductForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-control" required value={productForm.name} onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU / Unique Code</label>
                  <input type="text" className="form-control" required disabled={!!editingProduct} value={productForm.sku} onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input type="text" className="form-control" required placeholder="e.g. Grains, Pulses" value={productForm.category} onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (INR)</label>
                  <input type="number" step="0.01" className="form-control" required value={productForm.unit_price} onChange={(e) => setProductForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Minimum Stock Alert Threshold</label>
                  <input type="number" className="form-control" required value={productForm.min_stock_alert} onChange={(e) => setProductForm(prev => ({ ...prev, min_stock_alert: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Warehouse Rack Location</label>
                  <input type="text" className="form-control" required placeholder="e.g. Warehouse A - Rack 3" value={productForm.location_warehouse} onChange={(e) => setProductForm(prev => ({ ...prev, location_warehouse: e.target.value }))} />
                </div>
              </div>
              {!editingProduct && (
                <div className="form-group">
                  <label className="form-label">Initial Stock Quantity</label>
                  <input type="number" className="form-control" required value={productForm.current_stock} onChange={(e) => setProductForm(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))} />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STOCK MOVEMENT ENTRY FORM MODAL */}
      {/* =================================================================== */}
      {showMovementForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Log Stock Movement</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowMovementForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStockMovementSubmit}>
              <div className="form-group">
                <label className="form-label">Movement Type</label>
                <select className="form-control" value={movementForm.movement_type} onChange={(e) => setMovementForm(prev => ({ ...prev, movement_type: e.target.value }))}>
                  <option value="IN">IN (Add Stock)</option>
                  <option value="OUT">OUT (Reduce Stock)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Changed</label>
                <input type="number" min="1" required className="form-control" value={movementForm.quantity_changed} onChange={(e) => setMovementForm(prev => ({ ...prev, quantity_changed: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Reason / Reference</label>
                <input type="text" placeholder="e.g. Restocked from supplier, Damaged waste" required className="form-control" value={movementForm.reason} onChange={(e) => setMovementForm(prev => ({ ...prev, reason: e.target.value }))} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMovementForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CREATE SALES CHALLAN FORM MODAL */}
      {/* =================================================================== */}
      {showChallanForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Sales Challan (Dispatch Order)</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowChallanForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChallanSubmit}>
              <div className="form-group">
                <label className="form-label">Select Customer</label>
                <select className="form-control" required value={challanForm.customer_id} onChange={(e) => setChallanForm(prev => ({ ...prev, customer_id: e.target.value }))}>
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.business_name})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '24px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Select Products Dispatch Items</h4>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChallanForm(prev => ({ ...prev, items: [...prev.items, { product_id: '', quantity: 1 }] }))}>
                  <Plus size={12} /> Add Item Row
                </button>
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
                {challanForm.items.map((item, idx) => {
                  const selectedProd = products.find(p => p.id === item.product_id);
                  return (
                    <div className="item-row" key={idx}>
                      <div>
                        <select className="form-control" required value={item.product_id} onChange={(e) => {
                          const newItems = [...challanForm.items];
                          newItems[idx].product_id = e.target.value;
                          setChallanForm(prev => ({ ...prev, items: newItems }));
                        }}>
                          <option value="">-- Choose Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input type="number" min="1" className="form-control" placeholder="Qty" required value={item.quantity} onChange={(e) => {
                          const newItems = [...challanForm.items];
                          newItems[idx].quantity = parseInt(e.target.value) || 1;
                          setChallanForm(prev => ({ ...prev, items: newItems }));
                        }} />
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        Unit: {selectedProd ? `₹${selectedProd.unit_price}` : "—"}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
                        Total: {selectedProd ? `₹${Number(selectedProd.unit_price) * item.quantity}` : "—"}
                      </div>
                      <div>
                        <button type="button" className="btn btn-danger btn-sm" disabled={challanForm.items.length === 1} onClick={() => {
                          const newItems = challanForm.items.filter((_, i) => i !== idx);
                          setChallanForm(prev => ({ ...prev, items: newItems }));
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Save Status Option</label>
                  <select className="form-control" value={challanForm.status} onChange={(e: any) => setChallanForm(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="Draft">Save as Draft (No stock change)</option>
                    <option value="Confirmed">Confirm & Dispatch (Instantly reduces stock)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Grand Total Item Count: {challanForm.items.reduce((acc, curr) => acc + curr.quantity, 0)}</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                    Grand Price: ₹ {challanForm.items.reduce((acc, curr) => {
                      const p = products.find(prod => prod.id === curr.product_id);
                      return acc + (p ? Number(p.unit_price) * curr.quantity : 0);
                    }, 0)}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowChallanForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate Challan Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
