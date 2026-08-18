import { useEffect, useState } from "react";
import {
    addDoc,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

function Admin() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("");
    const [available, setAvailable] = useState(true);
    const [foods, setFoods] = useState([]);
    const [orders, setOrders] = useState([]);
    const [editingId, setEditingId] = useState(null);


    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const foodData = {
                Name: name,
                description: description,
                price: Number(price),
                category: category,
                available: available,
            };

            if (editingId) {
                const foodRef = doc(db, "foods", editingId);

                await updateDoc(foodRef, foodData);

                alert("Food updated successfully!");
            } else {
                await addDoc(
                    collection(db, "foods"),
                    foodData
                );

                alert("Food added successfully!");
            }

            setName("");
            setDescription("");
            setPrice("");
            setCategory("");
            setAvailable(true);
            setEditingId(null);

            await fetchFoods();

        } catch (error) {
            console.error("Error saving food:", error);
            alert("Failed to save food.");
        }
    };
    const fetchFoods = async () => {
        try {
            const querySnapshot = await getDocs(
                collection(db, "foods")
            );

            const foodsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setFoods(foodsData);
        } catch (error) {
            console.error("Error fetching foods:", error);
        }
    };
    const fetchOrders = async () => {
        try {
            const querySnapshot = await getDocs(
                collection(db, "orders")
            );

            const ordersData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setOrders(ordersData);

        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const orderRef = doc(db, "orders", orderId);

            await updateDoc(orderRef, {
                status: newStatus,
            });

            await fetchOrders();

        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Failed to update order status.");
        }
    };
    const handleEdit = (food) => {
        setEditingId(food.id);

        setName(food.Name);
        setDescription(food.description);
        setPrice(String(food.price));
        setCategory(food.category);
        setAvailable(food.available);
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this food?"
        );

        if (!confirmDelete) {
            return;
        }

        try {
            await deleteDoc(doc(db, "foods", id));

            alert("Food deleted successfully!");

            await fetchFoods();
        } catch (error) {
            console.error("Error deleting food:", error);
            alert("Failed to delete food.");
        }
    };

    useEffect(() => {
        fetchFoods();
        fetchOrders();
    }, []);

    return (
        <div style={styles.page}>

            <header style={styles.header}>
                <div>
                    <h1 style={styles.logo}>
                        Hotel<span style={styles.logoOrange}>Kitchen</span>
                    </h1>

                    <p style={styles.subtitle}>
                        Admin Panel
                    </p>
                </div>
            </header>

            <main style={styles.container}>

                <div style={styles.titleSection}>
                    <h2 style={styles.title}>
                        Add New Food
                    </h2>

                    <p style={styles.subtitleText}>
                        Add a new food item to your hotel menu.
                    </p>
                </div>

                <form
                    style={styles.form}
                    onSubmit={handleSubmit}
                >

                    {/* NAME */}
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Food Name
                        </label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Butter Naan"
                            style={styles.input}
                        />
                    </div>


                    {/* DESCRIPTION */}
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Description
                        </label>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the food..."
                            style={styles.textarea}
                        />
                    </div>


                    {/* PRICE */}
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Price
                        </label>

                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="e.g. 60"
                            style={styles.input}
                        />
                    </div>


                    {/* CATEGORY */}
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Category
                        </label>

                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g. Indian Bread"
                            style={styles.input}
                        />
                    </div>


                    {/* AVAILABLE */}
                    <div style={styles.availableRow}>

                        <div>
                            <label style={styles.label}>
                                Available
                            </label>

                            <p style={styles.availableText}>
                                Can guests order this food?
                            </p>
                        </div>

                        <input
                            type="checkbox"
                            checked={available}
                            onChange={(e) => setAvailable(e.target.checked)}
                        />


                    </div>


                    <button
                        type="submit"
                        style={styles.button}
                    >
                        {editingId ? "Update Food" : "Add Food"}
                    </button>

                </form>
                <div style={styles.managementSection}>

                    <h2 style={styles.managementTitle}>
                        Food Management
                    </h2>

                    {foods.map((food) => (
                        <div
                            key={food.id}
                            style={styles.foodRow}
                        >

                            <div>
                                <h3 style={styles.foodName}>
                                    {food.Name}
                                </h3>

                                <p style={styles.foodCategory}>
                                    {food.category}
                                </p>
                            </div>

                            <strong>
                                ₹{food.price}
                            </strong>

                            <span>
                                {food.available ? "Available" : "Unavailable"}
                            </span>
                            <div style={styles.actions}>

                                <button
                                    style={styles.editButton}
                                    onClick={() => handleEdit(food)}
                                >
                                    Edit
                                </button>

                                <button
                                    style={styles.deleteButton}
                                    onClick={() => handleDelete(food.id)}
                                >
                                    Delete
                                </button>

                            </div>
                        </div>
                    ))}

                </div>
                <div style={styles.managementSection}>

                    <h2 style={styles.managementTitle}>
                        Orders
                    </h2>

                    {orders.length === 0 ? (

                        <p style={{ color: "#888888" }}>
                            No orders yet.
                        </p>

                    ) : (

                        orders.map((order) => (

                            <div
                                key={order.id}
                                style={styles.orderCard}
                            >

                                <div style={styles.orderHeader}>

                                    <div>
                                        <h3 style={styles.orderTitle}>
                                            Order #{order.id}
                                        </h3>

                                        <div style={styles.statusSection}>

                                            <label style={styles.statusLabel}>
                                                Order Status
                                            </label>

                                            <select
                                                value={order.status}
                                                onChange={(e) =>
                                                    updateOrderStatus(
                                                        order.id,
                                                        e.target.value
                                                    )
                                                }
                                                style={styles.statusSelect}
                                            >
                                                <option value="Pending">
                                                    Pending
                                                </option>

                                                <option value="Preparing">
                                                    Preparing
                                                </option>

                                                <option value="Ready">
                                                    Ready
                                                </option>

                                                <option value="Delivered">
                                                    Delivered
                                                </option>
                                            </select>

                                        </div>
                                    </div>

                                    <strong>
                                        ₹{order.total}
                                    </strong>

                                </div>


                                <div style={styles.orderItems}>

                                    {order.items.map((item) => (

                                        <div
                                            key={item.foodId}
                                            style={styles.orderItem}
                                        >

                                            <span>
                                                {item.name} × {item.quantity}
                                            </span>

                                            <span>
                                                ₹{item.price * item.quantity}
                                            </span>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        ))

                    )}

                </div>

            </main>

        </div>
    );
}


const styles = {
    statusSection: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    statusLabel: {
        fontSize: "12px",
        color: "#777777",
    },
    statusSelect: {
        padding: "8px 10px",
        border: "1px solid #dddddd",
        borderRadius: "7px",
        backgroundColor: "#ffffff",
        cursor: "pointer",
        fontSize: "13px",
    },

    orderCard: {
        border: "1px solid #eeeeee",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "15px",
        backgroundColor: "#fafafa",
    },
    orderHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "15px",
    },
    orderTitle: {
        margin: 0,
        fontSize: "16px",
    },
    orderStatus: {
        margin: "5px 0 0",
        color: "#d97706",
        fontSize: "13px",
        fontWeight: "600",
    },
    orderItems: {
        borderTop: "1px solid #eeeeee",
        paddingTop: "10px",
    },
    orderItem: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        fontSize: "14px",
    },

    actions: {
        display: "flex",
        gap: "8px",
    },

    deleteButton: {
        border: "1px solid #dc2626",
        backgroundColor: "#ffffff",
        color: "#dc2626",
        padding: "8px 14px",
        borderRadius: "7px",
        cursor: "pointer",
        fontWeight: "600",
    },

    editButton: {
        border: "1px solid #d97706",
        backgroundColor: "#ffffff",
        color: "#d97706",
        padding: "8px 14px",
        borderRadius: "7px",
        cursor: "pointer",
        fontWeight: "600",
    },

    managementSection: {
        marginTop: "30px",
        backgroundColor: "#ffffff",
        padding: "25px",
        borderRadius: "16px",
        border: "1px solid #eeeeee",
    },

    managementTitle: {
        marginTop: 0,
        marginBottom: "20px",
    },

    foodRow: {
        display: "grid",
        gridTemplateColumns: "1fr 100px 120px 150px",
        alignItems: "center",
        gap: "20px",
        padding: "15px 0",
        borderBottom: "1px solid #eeeeee",
    },

    foodName: {
        margin: 0,
        fontSize: "15px",
    },

    foodCategory: {
        margin: "5px 0 0",
        color: "#888888",
        fontSize: "12px",
    },

    page: {
        minHeight: "100vh",
        backgroundColor: "#f7f7f5",
        fontFamily: "Arial, sans-serif",
        color: "#202020",
    },

    header: {
        height: "80px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #eeeeee",
        display: "flex",
        alignItems: "center",
        padding: "0 45px",
    },

    logo: {
        margin: 0,
        fontSize: "25px",
        fontWeight: "700",
    },

    logoOrange: {
        color: "#d97706",
    },

    subtitle: {
        margin: "4px 0 0",
        color: "#888888",
        fontSize: "13px",
    },

    container: {
        maxWidth: "700px",
        margin: "40px auto",
        padding: "0 25px",
    },

    titleSection: {
        marginBottom: "25px",
    },

    title: {
        margin: 0,
        fontSize: "28px",
    },

    subtitleText: {
        color: "#888888",
        marginTop: "8px",
    },

    form: {
        backgroundColor: "#ffffff",
        padding: "30px",
        borderRadius: "16px",
        border: "1px solid #eeeeee",
    },

    field: {
        marginBottom: "20px",
    },

    label: {
        display: "block",
        fontSize: "14px",
        fontWeight: "600",
        marginBottom: "8px",
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px",
        border: "1px solid #dddddd",
        borderRadius: "8px",
        fontSize: "14px",
    },

    textarea: {
        width: "100%",
        boxSizing: "border-box",
        minHeight: "100px",
        padding: "12px",
        border: "1px solid #dddddd",
        borderRadius: "8px",
        fontSize: "14px",
        resize: "vertical",
    },

    availableRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "25px",
    },

    availableText: {
        margin: "4px 0 0",
        color: "#888888",
        fontSize: "12px",
    },

    button: {
        width: "100%",
        border: "none",
        backgroundColor: "#d97706",
        color: "#ffffff",
        padding: "14px",
        borderRadius: "9px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: "600",
    },

};

export default Admin;