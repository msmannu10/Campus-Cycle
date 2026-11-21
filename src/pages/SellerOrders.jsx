
import { useEffect, useState } from "react";

function SellerOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState(null);

    const fetchSellerOrders = async () => {
        try {
            const token = sessionStorage.getItem("campuscycleToken");

            const response = await fetch(
                "http://localhost:5000/api/seller-orders",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to fetch orders.");
            }

            setOrders(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellerOrders();
    }, []);

    const updateStatus = async (orderId, status) => {
        try {
            setUpdating(orderId);

            const token = sessionStorage.getItem("campuscycleToken");

            const response = await fetch(
                `http://localhost:5000/api/seller-orders/${orderId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Status update failed.");
            }

            await fetchSellerOrders();
            alert("Order status updated successfully!");
        } catch (err) {
            alert(err.message);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <p>Loading orders...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="seller-orders">
            <h1>Seller Orders</h1>

            {orders.length === 0 ? (
                <p>No orders received yet.</p>
            ) : (
                orders.map((order) => (
                    <div className="order-card" key={order.order_item_id}>
                        <h3>{order.product_name}</h3>

                        <p>Order ID: {order.order_id}</p>
                        <p>Buyer: {order.buyer_name}</p>
                        <p>Buyer Email: {order.buyer_email}</p>
                        <p>Price: ₹{Number(order.price).toFixed(2)}</p>
                        <p>Quantity: {order.quantity}</p>
                        <p>Status: {order.status}</p>

                        <label>Update Status: </label>
                        <select
    value={order.status}
    disabled={
        updating === order.order_id ||
        order.status === "Completed" ||
        order.status === "Cancelled"
    }
    onChange={(e) =>
        updateStatus(order.order_id, e.target.value)
    }
>
    {order.status === "Pending" && (
        <>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Cancelled">Cancelled</option>
        </>
    )}

    {order.status === "Accepted" && (
        <>
            <option value="Accepted">Accepted</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
        </>
    )}

    {order.status === "Completed" && (
        <option value="Completed">Completed</option>
    )}

    {order.status === "Cancelled" && (
        <option value="Cancelled">Cancelled</option>
    )}
</select>
                        

                        {updating === order.order_id && (
                            <p>Updating...</p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default SellerOrders;
