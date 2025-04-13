import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase'; // Assuming you have a firebase.js file exporting these

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    completed: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  });

  // Check if user is authorized admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'to.nitinkumar01@gmail.com') {
        setUser(user);
        fetchOrders();
      } else {
        setUser(null);
        navigate('/'); // Redirect to main page if not authorized
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch and listen to orders
  const fetchOrders = () => {
    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      let totalRevenue = 0;
      let pendingCount = 0;
      let completedCount = 0;

      querySnapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        ordersData.push(order);
        totalRevenue += order.total;
        
        if (order.status === 'pending') {
          pendingCount++;
        } else if (order.status === 'paid' || order.status === 'completed') {
          completedCount++;
        }
      });

      setOrders(ordersData);
      setStats({
        totalOrders: ordersData.length,
        pending: pendingCount,
        completed: completedCount,
        totalRevenue,
        avgOrderValue: ordersData.length > 0 ? totalRevenue / ordersData.length : 0
      });
      setLoading(false);
    });

    return unsubscribe;
  };

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      console.error("Error updating order:", error);
      alert('Failed to update order status');
    }
  };

  // Filter orders by status
  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => 
        activeTab === 'pending' ? order.status === 'pending' : 
        (order.status === 'paid' || order.status === 'completed')
      );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Handle sign out
  const handleSignOut = () => {
    signOut(auth);
    navigate('/');
  };

  if (!user) {
    return (
      <div className="admin-container">
        <div className="auth-message">
          <h2>Loading admin dashboard...</h2>
          <p>Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Mama's Café Admin Dashboard</h1>
        <div className="admin-actions">
          <span>Welcome, {user.displayName || 'Admin'}</span>
          <button onClick={handleSignOut} className="signout-btn">Sign Out</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p>{stats.totalOrders}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Orders</h3>
            <p>{stats.pending}</p>
          </div>
          <div className="stat-card">
            <h3>Completed Orders</h3>
            <p>{stats.completed}</p>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p>{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="stat-card">
            <h3>Avg. Order Value</h3>
            <p>{formatCurrency(stats.avgOrderValue)}</p>
          </div>
        </div>

        <nav className="order-tabs">
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Orders
          </button>
          <button 
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed Orders
          </button>
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Orders
          </button>
        </nav>

        {loading ? (
          <div className="loading-message">
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-orders">
            <p>No {activeTab} orders found.</p>
          </div>
        ) : (
          <div className="orders-table">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id.slice(0, 8)}</td>
                    <td>
                      {order.userName}<br />
                      <small>{order.userEmail}</small>
                    </td>
                    <td>
                      <ul className="order-items-list">
                        {order.items.map(item => (
                          <li key={item.id}>
                            {item.name} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>
                      {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'}<br />
                      {order.paymentId && <small>{order.paymentId.slice(0, 8)}</small>}
                    </td>
                    <td>
                      {order.createdAt?.toDate().toLocaleDateString()}<br />
                      <small>{order.createdAt?.toDate().toLocaleTimeString()}</small>
                    </td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="complete-btn"
                        >
                          Mark Complete
                        </button>
                      )}
                      {order.status === 'paid' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="complete-btn"
                        >
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-container {
          font-family: 'Roboto', sans-serif;
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem;
          min-height: 100vh;
        }
        
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 2rem;
        }
        
        .admin-header h1 {
          color: #5D4037;
          font-size: 1.8rem;
        }
        
        .admin-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .signout-btn {
          background-color: #D32F2F;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .signout-btn:hover {
          background-color: #B71C1C;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          text-align: center;
        }
        
        .stat-card h3 {
          color: #5D4037;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .stat-card p {
          font-size: 1.5rem;
          font-weight: bold;
          color: #8D6E63;
        }
        
        .order-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 0.5rem;
        }
        
        .tab-btn {
          background: none;
          border: none;
          padding: 0.5rem 1.5rem;
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: all 0.3s;
        }
        
        .tab-btn.active {
          background-color: #8D6E63;
          color: white;
        }
        
        .tab-btn:hover:not(.active) {
          background-color: #D7CCC8;
        }
        
        .orders-table {
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }
        
        th {
          background-color: #8D6E63;
          color: white;
          font-weight: 500;
        }
        
        tr:hover {
          background-color: #FFF9F5;
        }
        
        .order-items-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .order-items-list li {
          padding: 0.2rem 0;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .status-badge.pending {
          background-color: #FFF9C4;
          color: #F57F17;
        }
        
        .status-badge.paid {
          background-color: #C8E6C9;
          color: #2E7D32;
        }
        
        .status-badge.completed {
          background-color: #BBDEFB;
          color: #0D47A1;
        }
        
        .complete-btn {
          background-color: #8D6E63;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
          font-size: 0.8rem;
        }
        
        .complete-btn:hover {
          background-color: #6D4C41;
        }
        
        .loading-message, .empty-orders, .auth-message {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          table {
            font-size: 0.9rem;
          }
          
          th, td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;