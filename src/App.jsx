
import SellerOrders from "./pages/SellerOrders";
import MyOrders from "./pages/MyOrders";
import Register from "./pages/Register";
import Login from "./pages/Login";

import { useState, useEffect, useCallback } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";

import "./App.css";

import SellItem from "./pages/SellItem";
import ItemDetails from "./pages/ItemDetails";
import EditItem from "./pages/EditItem";

// Backend API URL
const API_URL = "https://campus-cycle-backend.onrender.com/api/products";
// Remove duplicate products
function removeDuplicateProducts(data) {
  const uniqueMap = new Map();

  data.forEach((product) => {
    const productName = String(product.name || "")
      .trim()
      .toLowerCase();

    const sellerId = Number(product.seller_id);

    const category = String(
      product.category_id ??
      product.category_name ??
      ""
    )
      .trim()
      .toLowerCase();

    const key = `${productName}-${sellerId}-${category}`;

    const existing = uniqueMap.get(key);

    if (!existing) {
      uniqueMap.set(key, product);
      return;
    }

    const isPreferredEngineering =
      productName === "engineering mathematics" &&
      Number(product.price) === 250;

    const existingIsPreferredEngineering =
      productName === "engineering mathematics" &&
      Number(existing.price) === 250;

    // Keep Engineering Mathematics priced at ₹250
    if (
      isPreferredEngineering &&
      !existingIsPreferredEngineering
    ) {
      uniqueMap.set(key, product);
      return;
    }

    // If both have ₹250 price, keep the smaller product ID
    if (
      isPreferredEngineering &&
      existingIsPreferredEngineering &&
      Number(product.product_id) <
        Number(existing.product_id)
    ) {
      uniqueMap.set(key, product);
      return;
    }

    // For other duplicates, keep the smaller product ID
    if (
      !isPreferredEngineering &&
      !existingIsPreferredEngineering &&
      Number(product.product_id) <
        Number(existing.product_id)
    ) {
      uniqueMap.set(key, product);
    }
  });

  return [...uniqueMap.values()];
}

// Homepage
function Home({
  products,
  loading,
  fetchError,
  fetchProducts,
  student,
  onLogout,
}) {
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Search and category filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" ||
      product.category === category;

    return matchesSearch && matchesCategory;
  });

  // Check product ownership
  const isOwner = (product) => {
    return (
      student &&
      Number(student.student_id) ===
        Number(product.sellerId)
    );
  };

  // Delete product
  const handleDelete = async (productId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
      const token = sessionStorage.getItem(
        "campuscycleToken"
      );

      if (!token) {
        throw new Error("Please login first.");
      }

      const response = await fetch(
        `${API_URL}/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to delete product."
        );
      }

      alert("Product deleted successfully!");

      fetchProducts();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="home-page">
      <h1>CampusCycle</h1>

      <p>
        Buy and sell second-hand items within your campus.
      </p>

      {/* Login / Logout / Orders */}
      {student ? (
        <div className="user-section">
          <p>Welcome, {student.name}!</p>

          <Link to="/my-orders">My Orders</Link>

          <Link to="/seller-orders">Seller Orders</Link>

          <button onClick={onLogout}>Logout</button>
        </div>
      ) : (
        <div className="user-section">
          <Link to="/login">Login</Link>
          {" | "}
          <Link to="/register">Register</Link>
        </div>
      )}

      {/* Success message */}
      {location.state?.message && (
        <p className="success-message">
          {location.state.message}
        </p>
      )}

      {/* Search and category */}
      <div className="home-controls">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Books">Books</option>
          <option value="Electronics">Electronics</option>
          <option value="Study Material">
            Study Material
          </option>
          <option value="Stationery">Stationery</option>
          <option value="Other">Other</option>
        </select>

        {student && (
          <Link to="/sell" className="sell-button">
            Sell Item
          </Link>
        )}
      </div>

      {/* Loading and error */}
      {loading && <p>Loading products...</p>}

      {fetchError && <p>{fetchError}</p>}

      {/* Product list */}
      <div className="product-grid">
        {filteredProducts.map((product) => (
          <div
            className="product-card"
            key={product.id}
          >
            <div className="product-emoji">
              {product.emoji || "📦"}
            </div>

            <h3>{product.name}</h3>

            <p>Category: {product.category}</p>

            <p>Condition: {product.condition}</p>

            <h3>₹{product.price}</h3>

            <Link
              to={`/item/${product.id}`}
              className="view-button"
            >
              View Details
            </Link>

            {isOwner(product) && (
              <Link
                className="edit-button"
                to={`/edit/${product.id}`}
              >
                Edit Item
              </Link>
            )}

            {isOwner(product) && (
              <button
                className="delete-button"
                onClick={() =>
                  handleDelete(product.id)
                }
              >
                Delete Item
              </button>
            )}
          </div>
        ))}
      </div>

      {!loading && filteredProducts.length === 0 && (
        <p>No products found.</p>
      )}
    </div>
  );
}

// Protected Edit Page
function ProtectedEdit({
  student,
  products,
  loading,
  fetchProducts,
}) {
  const { id } = useParams();

  if (!student) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <p>Checking product ownership...</p>;
  }

  const product = products.find(
    (item) => Number(item.id) === Number(id)
  );

  if (!product) {
    return <Navigate to="/" replace />;
  }

  if (
    Number(product.sellerId) !==
    Number(student.student_id)
  ) {
    return <Navigate to="/" replace />;
  }

  return <EditItem fetchProducts={fetchProducts} />;
}

// Main App Routes
function AppRoutes() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Restore logged-in student
  const [student, setStudent] = useState(() => {
    try {
      const savedStudent = sessionStorage.getItem(
        "campuscycleStudent"
      );

      return savedStudent
        ? JSON.parse(savedStudent)
        : null;
    } catch {
      return null;
    }
  });

  // Fetch products from backend
  const fetchProducts = useCallback(async (signal) => {
    try {
      setLoading(true);
      setFetchError("");

      const response = await fetch(API_URL, { signal });

      if (!response.ok) {
        throw new Error("Unable to load products.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid products data received."
        );
      }

      // Remove duplicate records
      const uniqueProducts =
        removeDuplicateProducts(data);

      console.log(
        "Products received:",
        data.map((product) => ({
          id: product.product_id,
          name: product.name,
          price: product.price,
        }))
      );

      console.log(
        "Products after duplicate removal:",
        uniqueProducts.map((product) => ({
          id: product.product_id,
          name: product.name,
          price: product.price,
        }))
      );

      // Format products for frontend
      const formattedProducts = uniqueProducts.map(
        (product) => ({
          id: product.product_id,
          sellerId: Number(product.seller_id),
          name: product.name,
          category: product.category_name,
          price: Number(product.price),
          condition: product.condition,
          description: product.description,
          emoji: "📦",
        })
      );

      setProducts(formattedProducts);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error(
        "Product fetching error:",
        error
      );

      setFetchError(
        "Unable to load products. Please check the server."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Load products when app starts
  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProducts]);

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem("campuscycleStudent");
    sessionStorage.removeItem("campuscycleToken");

    setStudent(null);

    alert("Logged out successfully!");
  };

  return (
    <Routes>
      {/* Homepage */}
      <Route
        path="/"
        element={
          <Home
            products={products}
            loading={loading}
            fetchError={fetchError}
            fetchProducts={fetchProducts}
            student={student}
            onLogout={handleLogout}
          />
        }
      />

      {/* Sell Item */}
      <Route
        path="/sell"
        element={
          student ? (
            <SellItem onAdd={fetchProducts} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Product Details */}
      <Route
        path="/item/:id"
        element={
          <ItemDetails
            products={products}
            student={student}
          />
        }
      />

      {/* My Orders */}
      <Route
        path="/my-orders"
        element={
          student ? (
            <MyOrders />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Seller Orders */}
      <Route
        path="/seller-orders"
        element={
          student ? (
            <SellerOrders />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Edit Item */}
      <Route
        path="/edit/:id"
        element={
          <ProtectedEdit
            student={student}
            products={products}
            loading={loading}
            fetchProducts={fetchProducts}
          />
        }
      />

      {/* Login */}
      <Route
        path="/login"
        element={<Login onLogin={setStudent} />}
      />

      {/* Register */}
      <Route
        path="/register"
        element={<Register />}
      />

      {/* Invalid route */}
      <Route
        path="*"
        element={<h2>Page Not Found</h2>}
      />
    </Routes>
  );
}

// Main App
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
