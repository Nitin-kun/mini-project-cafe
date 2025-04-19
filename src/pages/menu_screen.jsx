import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
// Import all your images at the top of the file
import Cappuccino from './assets/Cappuccino.webp';
import Latte from './assets/late.jpg';
import Espresso from './assets/espresso.webp';
import Mocha from './assets/mocha.webp';
import ColdBrew from './assets/cold.jpg';
import BlueberryMuffin from './assets/Blueberry.jpg';
import Croissant from './assets/croissant.jpg';
import ChaiLatte from './assets/chai.webp';
import IcedCoffee from './assets/iced.jpg';
import AvocadoToast from './assets/avocado.jpg';

// Then update your menuItems array:

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Menu data
const menuItems = [
  { id: 1, name: 'Cappuccino', description: 'Espresso with steamed milk foam', price: 150, category: 'hot', popular: true, image: Cappuccino },
  { id: 2, name: 'Latte', description: 'Espresso with steamed milk', price: 140, category: 'hot', popular: true, image: Latte },
  { id: 3, name: 'Espresso', description: 'Strong and bold coffee shot', price: 100, category: 'hot', image: Espresso },
  { id: 4, name: 'Mocha', description: 'Chocolate flavored coffee', price: 160, category: 'hot', image: Mocha },
  { id: 5, name: 'Cold Brew', description: 'Cold coffee brew for 12 hours', price: 180, category: 'cold', popular: true, image: ColdBrew },
  { id: 6, name: 'Blueberry Muffin', description: 'Freshly baked with real blueberries', price: 90, category: 'food', image: BlueberryMuffin },
  { id: 7, name: 'Croissant', description: 'Buttery and flaky pastry', price: 80, category: 'food', popular: true, image: Croissant },
  { id: 8, name: 'Chai Latte', description: 'Spiced tea with steamed milk', price: 120, category: 'hot', image: ChaiLatte },
  { id: 9, name: 'Iced Coffee', description: 'Chilled coffee with milk', price: 130, category: 'cold', image: IcedCoffee },
  { id: 10, name: 'Avocado Toast', description: 'Sourdough with avocado spread', price: 150, category: 'food', image: AvocadoToast }
];

const categories = [
  { id: 'all', name: 'All Items', icon: '☕' },
  { id: 'hot', name: 'Hot Drinks', icon: '♨️' },
  { id: 'cold', name: 'Cold Drinks', icon: '❄️' },
  { id: 'food', name: 'Food', icon: '🥐' }
];

const CafeMenu = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('menu');
  const [orderHistory, setOrderHistory] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Check mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        setShowAuthModal(false);
        fetchOrderHistory(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load Razorpay
  useEffect(() => {
    const loadRazorpay = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          setRazorpayLoaded(true);
          resolve();
        };
        script.onerror = () => {
          console.error('Failed to load Razorpay');
          resolve();
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpay();
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest('.user-info')) {
        setIsUserMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen]);

  // Fetch order history
  const fetchOrderHistory = (userId) => {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      setOrderHistory(orders);
    });
    
    return unsubscribe;
  };

  // Cart functions
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      return existing 
        ? prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i)
        : [...prev, {...item, quantity: 1}];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) removeFromCart(id);
    else setCart(prev => prev.map(item => item.id === id ? {...item, quantity} : item));
  };

  const getItemQuantity = (id) => cart.find(item => item.id === id)?.quantity || 0;

  const getTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter items by category and search
  const filteredItems = () => {
    let items = activeCategory === 'all' 
      ? menuItems 
      : menuItems.filter(item => item.category === activeCategory);
    
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return items;
  };

  // Auth functions
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
    setView('menu');
    setIsUserMenuOpen(false);
  };

  const navigateToAdminDashboard = () => {
    navigate('/admin');
    setIsUserMenuOpen(false);
  };

  // Payment functions
  const handleRazorpayPayment = () => {
    if (!razorpayLoaded) {
      alert('Payment gateway is still loading. Please try again.');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: getTotal() * 100,
      currency: 'INR',
      name: 'Bombardino Crocodilo\'s Café',
      description: 'Payment for your order',
      image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
      handler: function(response) {
        submitOrder(response.razorpay_payment_id);
      },
      prefill: {
        name: user?.displayName || '',
        email: user?.email || '',
        contact: ''
      },
      theme: {
        color: '#65451F'
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function(response) {
      alert(`Payment failed: ${response.error.description}`);
    });
    rzp.open();
  };

  const initiateCheckout = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    
    setView('payment');
    setIsCartOpen(false);
  };

  const submitOrder = async (paymentId = null) => {
    setIsLoading(true);
    try {
      const order = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        items: cart,
        total: getTotal(),
        paymentMethod,
        paymentId,
        status: paymentMethod === 'cash' ? 'pending' : 'paid',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), order);
      setCart([]);
      setView('history');
      alert('Order placed successfully!');
    } catch (error) {
      console.error("Error placing order:", error);
      alert('Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (paymentMethod === 'upi') {
      handleRazorpayPayment();
    } else {
      submitOrder();
    }
  };

  // View renderers
  const renderMenuView = () => (
    <div className="menu-view">
      <div className="category-nav">
        {categories.map(({id, name, icon}) => (
          <button
            key={id}
            className={`category-btn ${activeCategory === id ? 'active' : ''}`}
            onClick={() => setActiveCategory(id)}
          >
            <span className="category-icon">{icon}</span>
            <span className="category-name">{name}</span>
          </button>
        ))}
      </div>

      {filteredItems().length > 0 ? (
        <div className="menu-grid">
          {filteredItems().map(item => (
            <MenuItem 
              key={item.id} 
              item={item} 
              quantity={getItemQuantity(item.id)}
              onAdd={() => addToCart(item)}
              onUpdate={(qty) => updateQuantity(item.id, qty)}
            />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>No items found</p>
          <button onClick={() => {setSearchQuery(''); setActiveCategory('all')}} className="clear-search">
            Clear search
          </button>
        </div>
      )}
    </div>
  );

  const renderPaymentView = () => (
    <div className="payment-view">
      <div className="view-header">
        <button onClick={() => setView('menu')} className="back-btn">
          ← Back to Menu
        </button>
        <h2>Payment Details</h2>
      </div>
      
      <div className="order-summary">
        <h3>Order Summary</h3>
        <ul className="order-items">
          {cart.map(item => (
            <li key={item.id} className="order-item">
              <span className="item-name">{item.name} × {item.quantity}</span>
              <span className="item-price">₹{item.price * item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="order-total">
          <span>Total:</span>
          <span>₹{getTotal()}</span>
        </div>
      </div>
      
      <div className="payment-methods">
        <h3>Payment Method</h3>
        <div className="payment-options">
          <label className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              name="payment" 
              value="cash" 
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            />
            <div className="payment-icon">💵</div>
            <div className="payment-text">
              <span className="payment-title">Cash on counter</span>
              <span className="payment-desc">Pay when you receive your order</span>
            </div>
          </label>
          <label className={`payment-option ${paymentMethod === 'upi' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              name="payment" 
              value="upi" 
              checked={paymentMethod === 'upi'}
              onChange={() => setPaymentMethod('upi')}
            />
            <div className="payment-icon">📱</div>
            <div className="payment-text">
              <span className="payment-title">Online Payment</span>
              <span className="payment-desc">Secure payment via Razorpay</span>
            </div>
          </label>
        </div>
      </div>
      
      <div className="payment-actions">
        <button 
          onClick={handlePaymentSubmit} 
          disabled={isLoading} 
          className="confirm-btn"
        >
          {isLoading ? 'Processing...' : 'Confirm Order'}
        </button>
      </div>
    </div>
  );

  const renderHistoryView = () => (
    <div className="history-view">
      <div className="view-header">
        <button onClick={() => setView('menu')} className="back-btn">
          ← Back to Menu
        </button>
        <h2>Your Order History</h2>
      </div>
      
      {orderHistory.length === 0 ? (
        <div className="no-orders">
          <p>You haven't placed any orders yet.</p>
          <button onClick={() => setView('menu')} className="shop-now-btn">
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orderHistory.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-id">
                  <span>Order #{order.id.slice(0, 8)}</span>
                  <span className={`status ${order.status}`}>{order.status}</span>
                </div>
                <div className="order-date">
                  {order.createdAt?.toDate().toLocaleString()}
                </div>
              </div>
              
              <div className="order-details">
                <div className="payment-info">
                  <span className="payment-method">{order.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  {order.paymentId && <span className="payment-id">Transaction ID: {order.paymentId.slice(0, 10)}...</span>}
                </div>
                
                <ul className="order-items">
                  {order.items.map(item => (
                    <li key={item.id} className="order-item">
                      <span className="item-name">{item.name} × {item.quantity}</span>
                      <span className="item-price">₹{item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="order-total">
                  <span>Total:</span>
                  <span>₹{order.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="cafe-container">
      <header className="cafe-header">
        <div className="header-content">
          <div className="logo-container" onClick={() => setView('menu')}>
            <h1>Bombardino Crocodilo's Café</h1>
            <p className="tagline">Artisanal Coffee & Bakery</p>
          </div>
          
          <div className="header-actions">
            {!showSearchBar ? (
              <>
                {!isMobile && (
                  <div className="order-summary" onClick={() => setIsCartOpen(true)}>
                    <span className="order-count">{getTotalItems()} items</span>
                    <span className="order-total">₹{getTotal()}</span>
                  </div>
                )}
                
                <button 
                  onClick={() => setShowSearchBar(true)}
                  className="search-btn"
                  aria-label="Search"
                >
                  🔍
                </button>
                
                {user ? (
                  <div className="user-info">
                    <div 
                      className="avatar-container" 
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                      <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                    </div>
                    
                    {isUserMenuOpen && (
                      <div className="user-menu">
                        <div className="user-menu-header">
                          <img src={user.photoURL} alt={user.displayName} className="user-menu-avatar" />
                          <div className="user-menu-info">
                            <span className="user-name">{user.displayName}</span>
                            <span className="user-email">{user.email}</span>
                          </div>
                        </div>
                        <div className="user-menu-actions">
                          <button onClick={() => {setView('history'); setIsUserMenuOpen(false)}} className="history-btn">
                            Order History
                          </button>
                          {user.email === "to.nitinkumar01@gmail.com" && (
                            <button onClick={navigateToAdminDashboard} className="admin-btn">
                              Admin Dashboard
                            </button>
                          )}
                          <button onClick={handleSignOut} className="signout-btn">
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={signInWithGoogle} className="auth-btn">
                    Sign In
                  </button>
                )}
                
                <button 
                  onClick={() => setIsCartOpen(true)} 
                  className="cart-toggle-btn"
                  aria-label="Cart"
                >
                  🛒
                  {cart.length > 0 && <span className="cart-badge">{getTotalItems()}</span>}
                </button>
              </>
            ) : (
              <div className="search-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu..."
                  className="search-input"
                  autoFocus
                />
                <button 
                  onClick={() => {setSearchQuery(''); setShowSearchBar(false)}}
                  className="close-search-btn"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="menu-content">
        {view === 'menu' && renderMenuView()}
        {view === 'payment' && renderPaymentView()}
        {view === 'history' && renderHistoryView()}
      </main>

      {isCartOpen && (
        <CartSidebar 
          cart={cart}
          total={getTotal()}
          onClose={() => setIsCartOpen(false)}
          onUpdate={updateQuantity}
          onRemove={removeFromCart}
          onClear={() => setCart([])}
          onSubmit={initiateCheckout}
          isLoading={isLoading}
          user={user}
        />
      )}

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSignIn={signInWithGoogle}
        />
      )}

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          color: #333;
          background-color: #fcfaf7;
          line-height: 1.6;
          min-height: 100vh;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
        
        .cafe-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
        }
        
        /* Header Styles */
        .cafe-header {
          background-color: #fff;
          padding: 1rem;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        
        .logo-container {
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .logo-container:hover {
          transform: scale(1.02);
        }
        
        .logo-container h1 {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 1.8rem;
          color: #65451F;
          margin: 0;
        }
        
        .tagline {
          font-size: 0.85rem;
          color: #8B7355;
          margin-top: -5px;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        
        /* Search Styles */
        .search-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background-color 0.2s;
        }
        
        .search-btn:hover {
          background-color: #f0f0f0;
        }
        
        .search-container {
          display: flex;
          align-items: center;
          flex-grow: 1;
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 0.6rem 2.5rem 0.6rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 24px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .search-input:focus {
          border-color: #65451F;
          box-shadow: 0 0 0 2px rgba(101, 69, 31, 0.2);
        }
        
        .close-search-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #777;
        }
        
        /* User Menu Styles */
        .auth-btn {
          background-color: #65451F;
          color: white;
          border: none;
          border-radius: 24px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .auth-btn:hover {
          background-color: #553a1a;
        }
        
        .user-info {
          position: relative;
        }
        
        .avatar-container {
          cursor: pointer;
          border-radius: 50%;
          overflow: hidden;
          width: 40px;
          height: 40px;
          border: 2px solid #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .avatar-container:hover {
          transform: scale(1.05);
          box-shadow: 0 3px 7px rgba(0,0,0,0.15);
        }
        
        .user-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .user-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.15);
          width: 240px;
          overflow: hidden;
          z-index: 101;
        }
        
        .user-menu-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          background-color: #f9f5f0;
          border-bottom: 1px solid #efe8e0;
        }
        
        .user-menu-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 0.8rem;
          object-fit: cover;
        }
        
        .user-menu-info {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: #333;
        }
        
        .user-email {
          font-size: 0.8rem;
          color: #777;
          word-break: break-all;
        }
        
        .user-menu-actions {
          padding: 0.8rem;
        }
        
        .history-btn, .signout-btn, .admin-btn {
          width: 100%;
          text-align: left;
          padding: 0.7rem 1rem;
          margin-bottom: 0.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }
        
        .history-btn {
          background-color: #f0f0f0;
          color: #333;
        }
        
        .history-btn:hover {
          background-color: #e5e5e5;
        }
        
        .admin-btn {
          background-color: #e3f2fd;
          color: #1e88e5;
        }
        
        .admin-btn:hover {
          background-color: #bbdefb;
        }
        
        .signout-btn {
          background-color: #ffebeb;
          color: #d32f2f;
        }
        
        .signout-btn:hover {
          background-color: #ffd6d6;
        }
        
        /* Cart Button Styles */
        .cart-toggle-btn {
          position: relative;
          font-size: 1.2rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background-color 0.2s;
        }
        
        .cart-toggle-btn:hover {
          background-color: #f0f0f0;
        }
        
        .cart-badge {
          position: absolute;
          top: 0;
          right: 0;
          background-color: #ff5d5d;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        
        .order-summary {
          display: flex;
          align-items: center;
          background-color: #f9f5f0;
          border-radius: 24px;
          padding: 0.5rem 1rem;
          gap: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .order-summary:hover {
          background-color: #f2eae0;
        }
        
        .order-count {
          font-size: 0.8rem;
          color: #777;
        }
        
        .order-total {
          font-weight: 600;
          color: #65451F;
        }
        
        /* Main Content */
        .menu-content {
          flex: 1;
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        
        /* Category Navigation */
        .category-nav {
          display: flex;
          gap: 0.8rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        .category-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1.2rem;
          border: none;
          border-radius: 24px;
          background-color: #f0f0f0;
          color: #555;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .category-btn:hover {
          background-color: #e6e6e6;
        }
        
        .category-btn.active {
          background-color: #65451F;
          color: white;
        }
        
        .category-icon {
          font-size: 1.2rem;
        }
        
        /* Menu Grid */
        .menu-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }
        
        /* Menu Item Card */
        .menu-card {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .menu-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .item-image-container {
          position: relative;
          height: 200px;
          overflow: hidden;
        }
        
        .item-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s;
        }
        
        .menu-card:hover .item-image {
          transform: scale(1.05);
        }
        
        .popular-tag {
          position: absolute;
          top: 12px;
          right: 12px;
          background-color: #ff5d5d;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.3rem 0.6rem;
          border-radius: 12px;
          text-transform: uppercase;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .item-details {
          padding: 1.2rem;
        }
        
        .item-details h3 {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #333;
        }
        
        .item-details p {
          color: #777;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          height: 2.8rem;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .item-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }
        
        .item-actions span {
          font-weight: 600;
          font-size: 1.1rem;
          color: #65451F;
        }
        
        .add-btn {
          background-color: #65451F;
          color: white;
          border: none;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .add-btn:hover {
          background-color: #553a1a;
        }
        
        .quantity-control {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        
        .quantity-control button {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background-color: #f0f0f0;
          color: #333;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .quantity-control button:hover {
          background-color: #e0e0e0;
        }
        
        .quantity-control span {
          font-weight: 600;
          font-size: 1rem;
          color: #333;
        }
        
        /* Cart Sidebar */
        .cart-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: flex-end;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        
        .cart-sidebar {
          width: 90%;
          max-width: 400px;
          background-color: white;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: -5px 0 15px rgba(0,0,0,0.1);
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        .cart-header {
          padding: 1.5rem;
          border-bottom: 1px solid #efe8e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .cart-header h2 {
          font-weight: 600;
          color: #333;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #777;
          cursor: pointer;
          transition: color 0.2s;
        }
        
        .close-btn:hover {
          color: #333;
        }
        
        .empty-cart {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          color: #777;
          text-align: center;
          gap: 0.5rem;
        }
        
        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          list-style: none;
        }
        
        .cart-item {
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .cart-item h3 {
          font-weight: 500;
          color: #333;
          font-size: 1rem;
          margin-bottom: 0.2rem;
        }
        
        .cart-item p {
          color: #65451F;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .cart-item-actions button {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background-color: #f0f0f0;
          color: #333;
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .cart-item-actions button:hover {
          background-color: #e0e0e0;
        }
        
        .cart-footer {
          padding: 1.5rem;
          border-top: 1px solid #efe8e0;
        }
        
        .cart-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
        }
        
        .cart-total span:last-child {
          font-weight: 600;
          color: #65451F;
        }
        
        .cart-actions {
          display: flex;
          gap: 0.8rem;
        }
        
        .clear-btn {
          flex: 1;
          padding: 0.8rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: white;
          color: #777;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .clear-btn:hover {
          background-color: #f5f5f5;
          color: #555;
        }
        
        .checkout-btn {
          flex: 2;
          padding: 0.8rem;
          border: none;
          border-radius: 6px;
          background-color: #65451F;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .checkout-btn:hover {
          background-color: #553a1a;
        }
        
        .checkout-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        /* Auth Modal */
        .auth-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        
        .auth-modal {
          background-color: white;
          width: 90%;
          max-width: 400px;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 5px 20px rgba(0,0,0,0.15);
          position: relative;
          animation: zoomIn 0.3s ease-out;
        }
        
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .auth-modal h2 {
          margin-bottom: 1rem;
          color: #333;
        }
        
        .auth-modal p {
          margin-bottom: 1.5rem;
          color: #777;
        }
        
        .signin-btn {
          width: 100%;
          padding: 0.8rem;
          border: none;
          border-radius: 6px;
          background-color: #65451F;
          color: white;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 0.8rem;
          transition: background-color 0.2s;
        }
        
        .signin-btn:hover {
          background-color: #553a1a;
        }
        
        .cancel-btn {
          width: 100%;
          padding: 0.8rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: white;
          color: #777;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cancel-btn:hover {
          background-color: #f5f5f5;
          color: #555;
        }
        
        /* Payment View */
        .view-header {
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        
        .back-btn {
          background: none;
          border: none;
          color: #777;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        
        .back-btn:hover {
          color: #333;
        }
        
        .view-header h2 {
          font-weight: 600;
          font-size: 1.5rem;
          color: #333;
        }
        
        .payment-view {
          max-width: 600px;
          margin: 0 auto;
        }
        
        .order-summary, .payment-methods {
          background-color: white;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .order-summary h3, .payment-methods h3 {
          margin-bottom: 1rem;
          font-weight: 600;
          color: #333;
        }
        
        .order-items {
          list-style: none;
          margin-bottom: 1.5rem;
        }
        
        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .order-item:last-child {
          border-bottom: none;
        }
        
        .item-name {
          color: #333;
        }
        
        .item-price {
          font-weight: 500;
          color: #65451F;
        }
        
        .order-total {
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          font-size: 1.1rem;
          padding-top: 1rem;
          border-top: 1px solid #efe8e0;
        }
        
        .order-total span:last-child {
          color: #65451F;
        }
        
        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .payment-option {
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .payment-option:hover {
          border-color: #ccc;
          background-color: #f9f9f9;
        }
        
        .payment-option.selected {
          border-color: #65451F;
          background-color: #f9f5f0;
        }
        
        .payment-option input {
          position: absolute;
          opacity: 0;
        }
        
        .payment-icon {
          font-size: 1.5rem;
          margin-right: 1rem;
          margin-left: 0.5rem;
        }
        
        .payment-text {
          display: flex;
          flex-direction: column;
        }
        
        .payment-title {
          font-weight: 500;
          color: #333;
        }
        
        .payment-desc {
          font-size: 0.8rem;
          color: #777;
        }
        
        .payment-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .confirm-btn {
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 6px;
          background-color: #65451F;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .confirm-btn:hover {
          background-color: #553a1a;
        }
        
        .confirm-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        /* History View */
        .history-view {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .no-orders {
          background-color: white;
          border-radius: 10px;
          padding: 3rem;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .no-orders p {
          color: #777;
          margin-bottom: 1.5rem;
        }
        
        .shop-now-btn {
          display: inline-block;
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 6px;
          background-color: #65451F;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .shop-now-btn:hover {
          background-color: #553a1a;
        }
        
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .order-card {
          background-color: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .order-header {
          padding: 1rem;
          background-color: #f9f5f0;
          border-bottom: 1px solid #efe8e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .order-id {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        
        .status {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 0.3rem 0.6rem;
          border-radius: 12px;
        }
        
        .status.pending {
          background-color: #fff9c4;
          color: #ffa000;
        }
        
        .status.paid {
          background-color: #e8f5e9;
          color: #43a047;
        }
        
        .status.delivered {
          background-color: #e3f2fd;
          color: #1e88e5;
        }
        
        .order-date {
          font-size: 0.8rem;
          color: #777;
        }
        
        .order-details {
          padding: 1rem;
        }
        
        .payment-info {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #777;
        }
        
        .payment-method {
          display: inline-flex;
          align-items: center;
          padding: 0.3rem 0.6rem;
          background-color: #f0f0f0;
          border-radius: 12px;
        }
        
        .payment-id {
          font-size: 0.8rem;
        }
        
        /* No Results */
        .no-results {
          text-align: center;
          padding: 3rem;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .no-results p {
          color: #777;
          margin-bottom: 1.5rem;
        }
        
        .clear-search {
          display: inline-block;
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 6px;
          background-color: #65451F;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .clear-search:hover {
          background-color: #553a1a;
        }
        
        /* Responsive Styles */
        @media (max-width: 768px) {
          .menu-content {
            padding: 1rem;
          }
          
          .menu-grid {
            grid-template-columns: 1fr;
          }
          
          .category-btn {
            padding: 0.6rem 1rem;
          }
          
          .category-name {
            display: none;
          }
          
          .category-icon {
            font-size: 1.3rem;
          }
          
          .logo-container h1 {
            font-size: 1.5rem;
          }
          
          .tagline {
            font-size: 0.75rem;
          }
          
          .payment-option {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
          }
          
          .payment-icon {
            margin-bottom: 0.8rem;
            margin-left: 0;
          }
          
          .payment-info {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .menu-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1025px) {
          .menu-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

// Sub-components
const MenuItem = ({ item, quantity, onAdd, onUpdate }) => (
  <article className="menu-card">
    <div className="item-image-container">
      <img src={item.image} alt={item.name} className="item-image" />
      {item.popular && <div className="popular-tag">Popular</div>}
    </div>
    
    <div className="item-details">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      
      <div className="item-actions">
        <span>₹{item.price}</span>
        {quantity > 0 ? (
          <div className="quantity-control">
            <button onClick={() => onUpdate(quantity - 1)}>-</button>
            <span>{quantity}</span>
            <button onClick={() => onUpdate(quantity + 1)}>+</button>
          </div>
        ) : (
          <button onClick={onAdd} className="add-btn">Add</button>
        )}
      </div>
    </div>
  </article>
);

const CartSidebar = ({ cart, total, onClose, onUpdate, onRemove, onClear, onSubmit, isLoading, user }) => (
  <div className="cart-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="cart-sidebar">
      <div className="cart-header">
        <h2>Your Order</h2>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>
      
      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart feels lonely</p>
          <p>Add some delicious items</p>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {cart.map(item => (
              <li key={item.id} className="cart-item">
                <div>
                  <h3>{item.name}</h3>
                  <p>₹{item.price} × {item.quantity}</p>
                </div>
                <div className="cart-item-actions">
                  <button onClick={() => onUpdate(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onUpdate(item.id, item.quantity + 1)}>+</button>
                  <button onClick={() => onRemove(item.id)}>×</button>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>₹{total}</span>
            </div>
            
            <div className="cart-actions">
              <button onClick={onClear} className="clear-btn">Clear</button>
              <button 
                onClick={onSubmit} 
                disabled={isLoading}
                className="checkout-btn"
              >
                {isLoading ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);

const AuthModal = ({ onClose, onSignIn }) => (
  <div className="auth-modal-overlay">
    <div className="auth-modal">
      <button onClick={onClose} className="close-btn">&times;</button>
      <h2>Sign In Required</h2>
      <p>Please sign in to proceed with your order and view your order history</p>
      <button onClick={onSignIn} className="signin-btn">
        Sign In with Google
      </button>
      <button onClick={onClose} className="cancel-btn">Cancel</button>
    </div>
  </div>
);

export default CafeMenu;