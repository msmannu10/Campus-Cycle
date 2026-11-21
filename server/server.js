
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// =====================================
// JWT AUTHENTICATION MIDDLEWARE
// =====================================

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.student = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token. Please login again."
        });
    }
}

// =====================================
// MYSQL CONNECTION
// =====================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// =====================================
// HOME ROUTE
// =====================================

app.get("/", (req, res) => {
    res.send("CampusCycle Backend is Running!");
});

// =====================================
// DATABASE HEALTH CHECK
// =====================================

app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            message: "CampusCycle connected to MySQL successfully!"
        });

    } catch (error) {
        console.error("Database Error:", error);

        res.status(500).json({
            message: "Database connection failed."
        });
    }
});

// =====================================
// STUDENT REGISTRATION
// =====================================

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (
            !cleanName ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: "Please enter a valid name and email."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const [existingStudent] = await db.query(
            "SELECT student_id FROM STUDENT WHERE email = ?",
            [cleanEmail]
        );

        if (existingStudent.length > 0) {
            return res.status(409).json({
                message: "This email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO STUDENT (name, email, password)
             VALUES (?, ?, ?)`,
            [cleanName, cleanEmail, hashedPassword]
        );

        res.status(201).json({
            message: "Student registered successfully!",
            student_id: result.insertId
        });

    } catch (error) {
        console.error("Registration Error:", error);

        res.status(500).json({
            message: "Unable to register student."
        });
    }
});

// =====================================
// STUDENT LOGIN
// =====================================

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const [students] = await db.query(
            `SELECT student_id, name, email, password
             FROM STUDENT
             WHERE email = ?`,
            [cleanEmail]
        );

        if (students.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const student = students[0];

        const passwordMatch = await bcrypt.compare(
            password,
            student.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { student_id: student.student_id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful!",
            token: token,
            student: {
                student_id: student.student_id,
                name: student.name,
                email: student.email
            }
        });

    } catch (error) {
        console.error("Login Error:", error);

        res.status(500).json({
            message: "Unable to login."
        });
    }
});

// =====================================
// GET ALL PRODUCTS
// =====================================

app.get("/api/products", async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT
                p.product_id,
                p.seller_id,
                p.name,
                p.description,
                p.price,
                p.condition,
                c.category_name
             FROM PRODUCT p
             JOIN CATEGORY c
                ON p.category_id = c.category_id
             ORDER BY p.product_id DESC`
        );

        res.json(products);

    } catch (error) {
        console.error("Fetch Products Error:", error);

        res.status(500).json({
            message: "Unable to fetch products."
        });
    }
});

// =====================================
// GET LOGGED-IN STUDENT'S ORDERS
// =====================================

app.get("/api/my-orders", verifyToken, async (req, res) => {
    try {
        const studentId = req.student.student_id;

        const [orders] = await db.query(
            `SELECT
                o.order_id,
                oi.product_id,
                p.name AS product_name,
                oi.quantity,
                oi.price,
                o.order_date,
                o.status
             FROM ORDERS o
             JOIN ORDER_ITEM oi
                ON o.order_id = oi.order_id
             JOIN PRODUCT p
                ON oi.product_id = p.product_id
             WHERE o.buyer_id = ?
             ORDER BY o.order_date DESC`,
            [studentId]
        );

        res.json(orders);

    } catch (error) {
        console.error("My Orders Error:", error);

        res.status(500).json({
            message: "Failed to fetch orders."
        });
    }
});

// =====================================
// GET ORDERS FOR LOGGED-IN SELLER
// =====================================

app.get("/api/seller-orders", verifyToken, async (req, res) => {
    try {
        const sellerId = req.student.student_id;

        const [orders] = await db.query(
            `SELECT
                o.order_id,
                buyer.name AS buyer_name,
                buyer.email AS buyer_email,
                p.name AS product_name,
                oi.quantity,
                oi.price,
                o.order_date,
                o.status
             FROM ORDERS o
             JOIN ORDER_ITEM oi
                ON o.order_id = oi.order_id
             JOIN PRODUCT p
                ON oi.product_id = p.product_id
             JOIN STUDENT buyer
                ON o.buyer_id = buyer.student_id
             WHERE p.seller_id = ?
             ORDER BY o.order_date DESC`,
            [sellerId]
        );

        res.json(orders);

    } catch (error) {
        console.error("Seller Orders Error:", error);

        res.status(500).json({
            message: "Unable to fetch seller orders."
        });
    }
});

// =====================================
// UPDATE ORDER STATUS - SELLER ONLY
// =====================================

app.patch(
    "/api/seller-orders/:orderId/status",
    verifyToken,
    async (req, res) => {
        try {
            const sellerId = req.student.student_id;
            const orderId = Number(req.params.orderId);
            const { status } = req.body;

            const allowedTransitions = {
                Pending: ["Accepted", "Cancelled"],
                Accepted: ["Completed", "Cancelled"],
                Completed: [],
                Cancelled: []
            };

            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    message: "Invalid order ID."
                });
            }

            if (
                !Object.prototype.hasOwnProperty.call(
                    allowedTransitions,
                    status
                )
            ) {
                return res.status(400).json({
                    message: "Invalid order status."
                });
            }

            const [orders] = await db.query(
                `SELECT o.status
                 FROM ORDERS o
                 JOIN ORDER_ITEM oi
                    ON o.order_id = oi.order_id
                 JOIN PRODUCT p
                    ON oi.product_id = p.product_id
                 WHERE o.order_id = ?
                   AND p.seller_id = ?
                 LIMIT 1`,
                [orderId, sellerId]
            );

            if (orders.length === 0) {
                return res.status(404).json({
                    message: "Order not found for this seller."
                });
            }

            const currentStatus = orders[0].status;

            if (!allowedTransitions[currentStatus].includes(status)) {
                return res.status(400).json({
                    message: `Cannot change status from ${currentStatus} to ${status}.`
                });
            }

            await db.query(
                "UPDATE ORDERS SET status = ? WHERE order_id = ?",
                [status, orderId]
            );

            res.json({
                message: "Order status updated successfully.",
                status: status
            });

        } catch (error) {
            console.error("Update Order Status Error:", error);

            res.status(500).json({
                message: "Unable to update order status."
            });
        }
    }
);

// =====================================
// ADD PRODUCT - LOGIN REQUIRED
// =====================================

app.post("/api/products", verifyToken, async (req, res) => {
    try {
        const {
            name,
            category,
            price,
            condition,
            description
        } = req.body;

        if (
            !name ||
            !name.trim() ||
            !category ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0
        ) {
            return res.status(400).json({
                message: "Please enter valid product details."
            });
        }

        const [categories] = await db.query(
            "SELECT category_id FROM CATEGORY WHERE category_name = ?",
            [category]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                message: "Category not found."
            });
        }

        const sellerId = req.student.student_id;
        const categoryId = categories[0].category_id;

        const [result] = await db.query(
            `INSERT INTO PRODUCT
             (seller_id, category_id, name, description, price, \`condition\`)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                sellerId,
                categoryId,
                name.trim(),
                description || "",
                Number(price),
                condition || "Good condition"
            ]
        );

        res.status(201).json({
            message: "Product added successfully!",
            product_id: result.insertId
        });

    } catch (error) {
        console.error("Add Product Error:", error);

        res.status(500).json({
            message: "Unable to add product."
        });
    }
});

// =====================================
// UPDATE PRODUCT - OWNER ONLY
// =====================================

app.put("/api/products/:id", verifyToken, async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const studentId = req.student.student_id;

        const {
            name,
            category,
            price,
            condition,
            description
        } = req.body;

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        if (
            !name ||
            !name.trim() ||
            !category ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0
        ) {
            return res.status(400).json({
                message: "Please enter valid product details."
            });
        }

        const [products] = await db.query(
            `SELECT seller_id
             FROM PRODUCT
             WHERE product_id = ?`,
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        if (Number(products[0].seller_id) !== Number(studentId)) {
            return res.status(403).json({
                message: "You can only edit your own products."
            });
        }

        const [categories] = await db.query(
            "SELECT category_id FROM CATEGORY WHERE category_name = ?",
            [category]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                message: "Category not found."
            });
        }

        await db.query(
            `UPDATE PRODUCT
             SET name = ?,
                 category_id = ?,
                 price = ?,
                 \`condition\` = ?,
                 description = ?
             WHERE product_id = ? AND seller_id = ?`,
            [
                name.trim(),
                categories[0].category_id,
                Number(price),
                condition || "Good condition",
                description || "",
                productId,
                studentId
            ]
        );

        res.json({
            message: "Product updated successfully!"
        });

    } catch (error) {
        console.error("Update Product Error:", error);

        res.status(500).json({
            message: "Unable to update product."
        });
    }
});

// =====================================
// DELETE PRODUCT - OWNER ONLY
// =====================================

app.delete("/api/products/:id", verifyToken, async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const studentId = req.student.student_id;

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const [products] = await db.query(
            `SELECT seller_id
             FROM PRODUCT
             WHERE product_id = ?`,
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        if (Number(products[0].seller_id) !== Number(studentId)) {
            return res.status(403).json({
                message: "You can only delete your own products."
            });
        }

        const [result] = await db.query(
            `DELETE FROM PRODUCT
             WHERE product_id = ? AND seller_id = ?`,
            [productId, studentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        res.json({
            message: "Product deleted successfully!"
        });

    } catch (error) {
        console.error("Delete Product Error:", error);

        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "This product is linked to an order and cannot be deleted."
            });
        }

        res.status(500).json({
            message: "Unable to delete product."
        });
    }
});

// =====================================
// PLACE ORDER - LOGIN REQUIRED
// =====================================

app.post("/api/orders", verifyToken, async (req, res) => {
    let connection;

    try {
        const buyerId = req.student.student_id;
        const productId = Number(req.body.product_id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        connection = await db.getConnection();

        await connection.beginTransaction();

        const [products] = await connection.query(
            `SELECT product_id, seller_id, price
             FROM PRODUCT
             WHERE product_id = ?
             FOR UPDATE`,
            [productId]
        );

        if (products.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Product not found."
            });
        }

        const product = products[0];

        if (Number(product.seller_id) === Number(buyerId)) {
            await connection.rollback();

            return res.status(400).json({
                message: "You cannot order your own product."
            });
        }

        const [orderResult] = await connection.query(
            `INSERT INTO ORDERS
             (buyer_id, order_date, status)
             VALUES (?, NOW(), ?)`,
            [buyerId, "Pending"]
        );

        const orderId = orderResult.insertId;

        await connection.query(
            `INSERT INTO ORDER_ITEM
             (order_id, product_id, quantity, price)
             VALUES (?, ?, ?, ?)`,
            [
                orderId,
                productId,
                1,
                product.price
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: "Order placed successfully!",
            order_id: orderId,
            product_id: productId,
            price: Number(product.price),
            status: "Pending"
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Place Order Error:", error);

        res.status(500).json({
            message: "Unable to place order."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`CampusCycle server running on port ${PORT}`);
});
