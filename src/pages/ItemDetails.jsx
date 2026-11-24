
import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Tag,
  ShieldCheck,
} from "lucide-react";

import "./ItemDetails.css";

const API_URL = "https://campus-cycle-backend.onrender.com/api/products";
const ORDER_API = "https://campus-cycle-backend.onrender.com/api/orders";

export default function ItemDetails({
  products = [],
  student,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(
    location.state?.product ||
    products.find((item) => String(item.id) === String(id)) ||
    null
  );

  const [loading, setLoading] = useState(!product);
  const [error, setError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    const existingProduct =
      location.state?.product ||
      products.find((item) => String(item.id) === String(id));

    if (existingProduct) {
      setProduct(existingProduct);
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Unable to fetch product details.");
        }

        const data = await response.json();

        const foundProduct = data.find(
          (item) => String(item.product_id) === String(id)
        );

        if (!foundProduct) {
          setProduct(null);
          return;
        }

        setProduct({
          id: foundProduct.product_id,
          sellerId: Number(foundProduct.seller_id),
          name: foundProduct.name,
          category: foundProduct.category_name,
          price: Number(foundProduct.price),
          condition: foundProduct.condition,
          description: foundProduct.description,
          emoji: "📦",
        });
      } catch (err) {
        console.error("Product details error:", err);
        setError("Unable to load product. Please check the server.");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id, products, location.state]);

  // Place order
  const handlePlaceOrder = async () => {
    if (!student) {
      alert("Please login before placing an order.");
      navigate("/login");
      return;
    }

    if (Number(student.student_id) === Number(product.sellerId)) {
      alert("You cannot order your own product.");
      return;
    }

    const confirmOrder = window.confirm(
      `Do you want to place an order for ${product.name} at ₹${product.price}?`
    );

    if (!confirmOrder) return;

    try {
      setOrdering(true);

      const token = sessionStorage.getItem("campuscycleToken");

      if (!token) {
        throw new Error("Please login again.");
      }

      const response = await fetch(ORDER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to place order.");
      }

      setOrderSuccess(data);

      alert(
        `Order placed successfully!\nOrder ID: ${data.order_id}`
      );
    } catch (err) {
      console.error("Order Error:", err);
      alert(err.message);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <main className="item-details-page">
        <p>Loading product details...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="item-details-page">
        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} /> Back to marketplace
        </button>

        <p>{error}</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="item-details-page">
        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} /> Back to marketplace
        </button>

        <h2>Item not found</h2>
        <p>This listing may no longer be available.</p>
      </main>
    );
  }

  const isOwner =
    student &&
    Number(student.student_id) === Number(product.sellerId);

  return (
    <main className="item-details-page">
      <button
        className="back-button"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={18} /> Back to marketplace
      </button>

      <section className="item-details-card">
        <div className="item-details-image">
          <span className="details-emoji">
            {product.emoji || "📦"}
          </span>

          <span>PRE-LOVED</span>
        </div>

        <div className="item-details-content">
          <span className="item-category">
            <Tag size={14} /> {product.category}
          </span>

          <h1>{product.name || product.title}</h1>

          <p className="item-price">
            ₹{Number(product.price || 0).toLocaleString("en-IN")}
          </p>

          <p className="item-condition">
            Condition: {product.condition || "Good condition"}
          </p>

          <div className="item-description">
            <h3>About this item</h3>

            <p>
              {product.description ||
                "No description has been added for this item."}
            </p>
          </div>

          <div className="item-trust-note">
            <ShieldCheck size={20} />

            <span>
              CampusCycle helps students reuse and resell items.
            </span>
          </div>

          {orderSuccess ? (
            <div className="success-message">
              <h3>Order placed successfully!</h3>
              <p>Order ID: {orderSuccess.order_id}</p>
              <p>Status: {orderSuccess.status}</p>
            </div>
          ) : isOwner ? (
            <p>You cannot order your own product.</p>
          ) : (
            <button
              className="contact-seller-button"
              onClick={handlePlaceOrder}
              disabled={ordering}
            >
              {ordering ? "Placing Order..." : "Place Order"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
