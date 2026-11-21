
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import "./SellItem.css";

const initialForm = {
  name: "",
  category: "Books",
  price: "",
  condition: "Good condition",
  description: "",
  image: "",
};

function SellItem({ onAdd }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((previous) => ({
        ...previous,
        image: reader.result,
      }));
      setError("");
    };

    reader.onerror = () => {
      setError("Unable to read the image. Please try another file.");
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const price = Number(form.price);

    if (!form.name.trim()) {
      setError("Please enter the product name.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please describe your product.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price greater than ₹0.");
      return;
    }

    const emoji =
      form.category === "Books" ? "📚" :
      form.category === "Electronics" ? "🧮" :
      form.category === "Study Material" ? "📝" :
      form.category === "Stationery" ? "📐" : "🎒";

    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("campuscycleToken");

if (!token) {
  throw new Error("Please login first.");
}

const response = await fetch(
  "http://localhost:5000/api/products",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: form.name.trim(),
      category: form.category,
      price: price,
      condition: form.condition,
      description: form.description.trim(),
    }),
  }
);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to publish item.");
      }

      onAdd({
        ...form,
        id: data.product_id,
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        emoji,
      });

      navigate("/", {
        state: {
          message: "Your item has been listed successfully!",
        },
      });
    } catch (error) {
      setError(
        error.message || "Server connection failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const categoryEmoji =
    form.category === "Books" ? "📚" :
    form.category === "Electronics" ? "🧮" :
    form.category === "Study Material" ? "📝" :
    form.category === "Stationery" ? "📐" : "🎒";

  return (
    <div className="sell-page">
      <nav className="navbar">
        <Link className="logo" to="/">
          <span className="logo-icon">S</span>
          Campus<span className="logo-highlight">Cycle</span>
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/#products">Marketplace</Link>
        </div>

        <span className="sell-nav-label">Sell an item</span>
      </nav>

      <main className="sell-container">
        <Link to="/" className="back-link">
          ← Back to marketplace
        </Link>

        <div className="sell-heading">
          <span className="eyebrow">GIVE IT A NEW STORY</span>
          <h1>List your item.</h1>
          <p>
            Someone on campus might need exactly what you no longer use.
          </p>
        </div>

        <div className="sell-layout">
          <form className="sell-form" onSubmit={handleSubmit}>
            <div className="form-section-title">
              <span className="form-number">01</span>
              <div>
                <h2>Item details</h2>
                <p>Tell buyers what you are selling.</p>
              </div>
            </div>

            <label htmlFor="name">Product name *</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Engineering Mathematics textbook"
              maxLength={100}
              required
            />

            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option>Books</option>
              <option>Electronics</option>
              <option>Study Material</option>
              <option>Stationery</option>
              <option>Other</option>
            </select>

            <label htmlFor="condition">Item condition *</label>
            <select
              id="condition"
              name="condition"
              value={form.condition}
              onChange={handleChange}
            >
              <option>Like new</option>
              <option>Good condition</option>
              <option>Lightly used</option>
              <option>Acceptable condition</option>
            </select>

            <label htmlFor="price">Selling price (₹) *</label>
            <input
              id="price"
              name="price"
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={handleChange}
              placeholder="Enter your price"
              required
            />

            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Mention the item's features, age, or any wear and tear."
              rows="4"
              maxLength={500}
              required
            />

            <label htmlFor="product-image">
              Product photo (optional)
            </label>

            <div className="image-upload-box">
              {form.image ? (
                <div className="image-upload-preview">
                  <img src={form.image} alt="Selected product" />

                  <button
                    type="button"
                    className="remove-image-button"
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        image: "",
                      }))
                    }
                    aria-label="Remove selected image"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label
                  className="image-upload-label"
                  htmlFor="product-image"
                >
                  <ImagePlus size={30} />
                  <strong>Choose a product photo</strong>
                  <span>JPG, PNG, or WebP · Maximum 5 MB</span>
                </label>
              )}

              <input
                id="product-image"
                name="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="publish-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Publishing..." : "Publish listing"}
              <span>→</span>
            </button>

            <p className="form-footnote">
              Your product details will be saved in the CampusCycle database.
            </p>
          </form>

          <aside className="listing-preview">
            <span className="preview-label">LISTING PREVIEW</span>

            <div className="preview-art">
              {form.image ? (
                <img
                  src={form.image}
                  alt="Product preview"
                  className="preview-product-image"
                />
              ) : (
                <span>{categoryEmoji}</span>
              )}

              <small>CampusCycle</small>
            </div>

            <div className="preview-content">
              <span className="preview-category">{form.category}</span>

              <h3>{form.name || "Your product name"}</h3>

              <p>{form.condition}</p>

              <strong>
                {form.price && Number(form.price) > 0
                  ? `₹${Number(form.price).toLocaleString("en-IN")}`
                  : "₹—"}
              </strong>

              <div className="preview-divider" />

              <p className="preview-description">
                {form.description ||
                  "Your product description will appear here."}
              </p>
            </div>

            <div className="preview-note">
              <span>♻️</span>
              <p>Reuse more. Spend smarter. Keep good things moving.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default SellItem;
