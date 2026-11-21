
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./EditItem.css";

const API_URL = "http://127.0.0.1:5000/api/products";

function EditItem({ fetchProducts }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        category: "Books",
        price: "",
        condition: "Good condition",
        description: ""
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const getProduct = async () => {
            try {
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error("Unable to load products.");
                }

                const products = await response.json();

                const product = products.find(
                    (item) => Number(item.product_id) === Number(id)
                );

                if (!product) {
                    throw new Error("Product not found.");
                }

                setForm({
                    name: product.name,
                    category: product.category_name,
                    price: product.price,
                    condition: product.condition || "Good condition",
                    description: product.description || ""
                });

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getProduct();
    }, [id]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");

           const token = sessionStorage.getItem("campuscycleToken");

const response = await fetch(
  `http://127.0.0.1:5000/api/products/${id}`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(form),
  }
);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update product.");
            }

            await fetchProducts();

            navigate("/", {
                state: {
                    message: "Product updated successfully!"
                }
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p>Loading product...</p>;
    }

    return (
        <div className="edit-page">
            <div className="edit-container">
                <h1>Edit Product</h1>
                <p>Update your marketplace listing.</p>

                {error && (
                    <p className="edit-error">{error}</p>
                )}

                <form onSubmit={handleSubmit}>
                    <label>Product Name</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />

                    <label>Category</label>
                    <select
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

                    <label>Price (₹)</label>
                    <input
                        type="number"
                        name="price"
                        min="1"
                        value={form.price}
                        onChange={handleChange}
                        required
                    />

                    <label>Condition</label>
                    <select
                        name="condition"
                        value={form.condition}
                        onChange={handleChange}
                    >
                        <option>Like new</option>
                        <option>Good condition</option>
                        <option>Fair condition</option>
                    </select>

                    <label>Description</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows="4"
                    />

                    <button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                        type="button"
                        className="cancel-edit"
                        onClick={() => navigate("/")}
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}

export default EditItem;
