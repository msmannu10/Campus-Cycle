
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import "./MyOrders.css";

const API_URL = "https://campus-cycle-backend.onrender.com/api/my-orders";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = sessionStorage.getItem("campuscycleToken");

        const response = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load orders.");
        }

        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="my-orders-page">
      <Link to="/" className="orders-back">
        <ArrowLeft size={18} /> Back to Home
      </Link>

      <h1>My Orders</h1>
      <p className="orders-subtitle">
        Track the products you have ordered.
      </p>

      {loading && <p>Loading your orders...</p>}

      {error && <p className="orders-error">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-orders">
          <Package size={45} />
          <h2>No orders yet</h2>
          <p>Your placed orders will appear here.</p>
          <Link to="/">Explore Products</Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="orders-list">
          {orders.map((order) => (
            <div className="order-card" key={order.order_item_id}>
              <div>
                <h3>{order.product_name}</h3>
                <p>Order ID: {order.order_id}</p>
                <p>Product ID: {order.product_id}</p>
                <p>Quantity: {order.quantity}</p>
                <p>
                  Date:{" "}
                  {new Date(order.order_date).toLocaleDateString("en-IN")}
                </p>
              </div>

              <div className="order-right">
                <h3>₹{Number(order.price).toFixed(2)}</h3>
                <span className="order-status">{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyOrders;
