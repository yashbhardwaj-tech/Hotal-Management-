import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/* =========================================================
   TYPES
========================================================= */

type Food = {
  id: string;
  Name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  emoji?: string;
};

type OrderItem = {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  userId?: string;
  userName?: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
};

type OrderStatus =
  | "Pending"
  | "Preparing"
  | "Ready"
  | "Delivered";

/* =========================================================
   ADMIN COMPONENT
========================================================= */

function Admin() {
  /* =======================================================
     FORM STATE
  ======================================================= */

  const [name, setName] = useState<string>("");
  const [description, setDescription] =
    useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [available, setAvailable] =
    useState<boolean>(true);

  /* =======================================================
     DATA STATE
  ======================================================= */

  const [foods, setFoods] = useState<Food[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  /* =======================================================
     UI STATE
  ======================================================= */

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [loadingFoods, setLoadingFoods] =
    useState<boolean>(true);

  const [loadingOrders, setLoadingOrders] =
    useState<boolean>(true);

  const [savingFood, setSavingFood] =
    useState<boolean>(false);

  const [search, setSearch] = useState<string>("");

  const [selectedCategory, setSelectedCategory] =
    useState<string>("All");

  const [updatingOrder, setUpdatingOrder] =
    useState<string | null>(null);

  /* =======================================================
     FETCH FOODS
  ======================================================= */

  const fetchFoods = async (): Promise<void> => {
    try {
      setLoadingFoods(true);

      const querySnapshot = await getDocs(
        collection(db, "foods")
      );

      const foodsData: Food[] = querySnapshot.docs.map(
        (foodDoc) => {
          const data = foodDoc.data();

          return {
            id: foodDoc.id,
            Name: String(data.Name || ""),
            description: String(data.description || ""),
            price: Number(data.price || 0),
            category: String(data.category || ""),
            available: Boolean(data.available),
            emoji: data.emoji
              ? String(data.emoji)
              : undefined,
          };
        }
      );

      setFoods(foodsData);
    } catch (error) {
      console.error("Error fetching foods:", error);
    } finally {
      setLoadingFoods(false);
    }
  };

  /* =======================================================
     FETCH ORDERS
  ======================================================= */

  const fetchOrders = async (): Promise<void> => {
    try {
      setLoadingOrders(true);

      const querySnapshot = await getDocs(
        collection(db, "orders")
      );

      const ordersData: Order[] = querySnapshot.docs.map(
        (orderDoc) => {
          const data = orderDoc.data();

          const items: OrderItem[] = Array.isArray(data.items)
            ? data.items.map((item: unknown) => {
                const orderItem = item as Record<
                  string,
                  unknown
                >;

                return {
                  foodId: String(
                    orderItem.foodId || ""
                  ),
                  name: String(orderItem.name || ""),
                  price: Number(orderItem.price || 0),
                  quantity: Number(
                    orderItem.quantity || 0
                  ),
                };
              })
            : [];

          return {
            id: orderDoc.id,
            userId: data.userId
              ? String(data.userId)
              : undefined,
            userName: data.userName
              ? String(data.userName)
              : undefined,
            items,
            total: Number(data.total || 0),
            status: String(data.status || "Pending"),
            createdAt: data.createdAt
              ? {
                  seconds: Number(
                    data.createdAt.seconds || 0
                  ),
                  nanoseconds: Number(
                    data.createdAt.nanoseconds || 0
                  ),
                }
              : undefined,
          };
        }
      );

      ordersData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;

        return dateB - dateA;
      });

      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void fetchFoods();
    void fetchOrders();
  }, []);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        foods
          .map((food) => food.category)
          .filter((item) => item.trim() !== "")
      )
    );

    return ["All", ...uniqueCategories];
  }, [foods]);

  /* =======================================================
     FILTER FOODS
  ======================================================= */

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const matchesSearch =
        food.Name.toLowerCase().includes(
          search.toLowerCase()
        ) ||
        food.category
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        food.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [foods, search, selectedCategory]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const availableFoods = foods.filter(
    (food) => food.available
  ).length;

  const unavailableFoods = foods.length - availableFoods;

  const pendingOrders = orders.filter(
    (order) =>
      order.status === "Pending" ||
      order.status === "Preparing"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const totalRevenue = orders.reduce(
    (total, order) => total + Number(order.total || 0),
    0
  );

  /* =======================================================
     FORM SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!name.trim()) {
      alert("Please enter food name.");
      return;
    }

    if (!price || Number(price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    if (!category.trim()) {
      alert("Please select a category.");
      return;
    }

    try {
      setSavingFood(true);

      const foodData = {
        Name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category: category.trim(),
        available,
      };

      if (editingId) {
        await updateDoc(
          doc(db, "foods", editingId),
          foodData
        );

        alert("Food updated successfully!");
      } else {
        await addDoc(
          collection(db, "foods"),
          foodData
        );

        alert("Food added successfully!");
      }

      resetForm();

      await fetchFoods();
    } catch (error) {
      console.error("Error saving food:", error);

      alert("Failed to save food. Please try again.");
    } finally {
      setSavingFood(false);
    }
  };

  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetForm = (): void => {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setAvailable(true);
    setEditingId(null);
  };

  /* =======================================================
     EDIT FOOD
  ======================================================= */

  const handleEdit = (food: Food): void => {
    setEditingId(food.id);

    setName(food.Name);
    setDescription(food.description);
    setPrice(String(food.price));
    setCategory(food.category);
    setAvailable(food.available);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     DELETE FOOD
  ======================================================= */

  const handleDelete = async (
    id: string
  ): Promise<void> => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this food item?"
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

  /* =======================================================
     UPDATE ORDER STATUS
  ======================================================= */

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus
  ): Promise<void> => {
    try {
      setUpdatingOrder(orderId);

      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
      });

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
              }
            : order
        )
      );
    } catch (error) {
      console.error(
        "Error updating order status:",
        error
      );

      alert("Failed to update order status.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatDate = (
    timestamp:
      | {
          seconds: number;
          nanoseconds: number;
        }
      | undefined
  ): string => {
    if (!timestamp?.seconds) {
      return "Just now";
    }

    const date = new Date(timestamp.seconds * 1000);

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div style={styles.page}>
      {/* ===================================================
          HEADER
      =================================================== */}

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <div style={styles.logoIcon}>H</div>

            <div>
              <h1 style={styles.logo}>
                Hotel
                <span style={styles.logoOrange}>
                  Kitchen
                </span>
              </h1>

              <p style={styles.headerSubtitle}>
                Administration Dashboard
              </p>
            </div>
          </div>

          <div style={styles.adminBadge}>
            <div style={styles.adminBadgeIcon}>
              ⚙
            </div>

            <div>
              <span style={styles.adminLabel}>
                PANEL
              </span>

              <strong>Administrator</strong>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main style={styles.container}>
        {/* PAGE TITLE */}

        <section style={styles.pageHeading}>
          <div>
            <span style={styles.eyebrow}>
              HOTEL MANAGEMENT
            </span>

            <h2 style={styles.pageTitle}>
              Dashboard Overview
            </h2>

            <p style={styles.pageDescription}>
              Manage your menu and monitor guest orders
              from one place.
            </p>
          </div>
        </section>

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <section style={styles.statsGrid}>
          <StatCard
            icon="🍽️"
            label="Total Foods"
            value={foods.length}
            subtext={`${availableFoods} currently available`}
          />

          <StatCard
            icon="🛎️"
            label="Active Orders"
            value={pendingOrders}
            subtext={`${orders.length} total orders`}
          />

          <StatCard
            icon="✓"
            label="Delivered"
            value={deliveredOrders}
            subtext="Successfully completed"
          />

          <StatCard
            icon="₹"
            label="Revenue"
            value={`₹${totalRevenue.toLocaleString(
              "en-IN"
            )}`}
            subtext="From all orders"
          />
        </section>

        {/* =================================================
            ADD / EDIT FOOD
        ================================================= */}

        <section style={styles.formSection}>
          <div style={styles.formHeader}>
            <div style={styles.formHeaderIcon}>
              {editingId ? "✎" : "+"}
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                {editingId
                  ? "Edit Food Item"
                  : "Add New Food"}
              </h2>

              <p style={styles.sectionDescription}>
                {editingId
                  ? "Update the selected menu item."
                  : "Add a delicious item to your hotel menu."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              {/* NAME */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Food Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Butter Naan"
                  style={styles.input}
                />
              </div>

              {/* PRICE */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Price
                </label>

                <div style={styles.inputWithIcon}>
                  <span style={styles.inputIcon}>₹</span>

                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value)
                    }
                    placeholder="60"
                    style={styles.priceInput}
                  />
                </div>
              </div>

              {/* CATEGORY */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Category
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  style={styles.input}
                >
                  <option value="">
                    Select category
                  </option>

                  <option value="Main Course">
                    Main Course
                  </option>

                  <option value="Rice">Rice</option>

                  <option value="Breads">
                    Breads
                  </option>

                  <option value="Drinks">
                    Drinks
                  </option>

                  <option value="Desserts">
                    Desserts
                  </option>

                  <option value="Starters">
                    Starters
                  </option>

                  <option value="Breakfast">
                    Breakfast
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* AVAILABLE */}

              <div style={styles.availabilityField}>
                <div>
                  <label style={styles.label}>
                    Menu Availability
                  </label>

                  <p style={styles.availabilityDescription}>
                    Allow guests to order this item.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAvailable((current) => !current)
                  }
                  style={{
                    ...styles.toggle,
                    ...(available
                      ? styles.toggleActive
                      : styles.toggleInactive),
                  }}
                >
                  <span
                    style={{
                      ...styles.toggleCircle,
                      ...(available
                        ? styles.toggleCircleActive
                        : styles.toggleCircleInactive),
                    }}
                  />

                  <span style={styles.toggleText}>
                    {available
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </button>
              </div>
            </div>

            {/* DESCRIPTION */}

            <div style={styles.field}>
              <label style={styles.label}>
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Describe the food, ingredients or serving style..."
                style={styles.textarea}
                rows={4}
              />
            </div>

            {/* BUTTONS */}

            <div style={styles.formActions}>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={savingFood}
                style={{
                  ...styles.primaryButton,
                  ...(savingFood
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {savingFood
                  ? "Saving..."
                  : editingId
                  ? "Update Food"
                  : "Add Food"}

                {!savingFood && (
                  <span>→</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* =================================================
            FOOD MANAGEMENT
        ================================================= */}

        <section style={styles.managementSection}>
          <div style={styles.managementHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Food Management
              </h2>

              <p style={styles.sectionDescription}>
                Manage all items available on your menu.
              </p>
            </div>

            <span style={styles.itemBadge}>
              {foods.length} items
            </span>
          </div>

          {/* SEARCH */}

          <div style={styles.filterBar}>
            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>⌕</span>

              <input
                type="text"
                placeholder="Search food..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                style={styles.searchInput}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
              style={styles.filterSelect}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* FOOD LIST */}

          {loadingFoods ? (
            <LoadingState text="Loading menu..." />
          ) : filteredFoods.length === 0 ? (
            <EmptyState
              icon="🍽️"
              title="No food items found"
              text="Try changing your search or add a new food item."
            />
          ) : (
            <div style={styles.foodList}>
              {filteredFoods.map((food) => (
                <FoodManagementCard
                  key={food.id}
                  food={food}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* =================================================
            ORDERS
        ================================================= */}

        <section style={styles.managementSection}>
          <div style={styles.managementHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Order Management
              </h2>

              <p style={styles.sectionDescription}>
                View incoming orders and update their
                status.
              </p>
            </div>

            <span style={styles.itemBadge}>
              {orders.length} orders
            </span>
          </div>

          {loadingOrders ? (
            <LoadingState text="Loading orders..." />
          ) : orders.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="No orders yet"
              text="Customer orders will appear here."
            />
          ) : (
            <div style={styles.ordersList}>
              {orders.map((order) => (
                <OrderManagementCard
                  key={order.id}
                  order={order}
                  updating={updatingOrder === order.id}
                  onStatusChange={updateOrderStatus}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

type StatCardProps = {
  icon: string;
  label: string;
  value: string | number;
  subtext: string;
};

function StatCard({
  icon,
  label,
  value,
  subtext,
}: StatCardProps) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <div style={styles.statIcon}>{icon}</div>

        <span style={styles.statLabel}>{label}</span>
      </div>

      <strong style={styles.statValue}>{value}</strong>

      <span style={styles.statSubtext}>
        {subtext}
      </span>
    </div>
  );
}

/* =========================================================
   FOOD MANAGEMENT CARD
========================================================= */

type FoodManagementCardProps = {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (id: string) => Promise<void>;
};

function FoodManagementCard({
  food,
  onEdit,
  onDelete,
}: FoodManagementCardProps) {
  return (
    <div style={styles.foodManagementCard}>
      <div style={styles.foodManagementIcon}>
        {food.emoji || "🍽️"}
      </div>

      <div style={styles.foodManagementInfo}>
        <div style={styles.foodNameRow}>
          <h3 style={styles.foodName}>
            {food.Name}
          </h3>

          <span
            style={{
              ...styles.availabilityBadge,
              ...(food.available
                ? styles.availableBadge
                : styles.unavailableBadge),
            }}
          >
            {food.available
              ? "● Available"
              : "● Unavailable"}
          </span>
        </div>

        <p style={styles.foodDescription}>
          {food.description ||
            "No description added."}
        </p>

        <span style={styles.foodCategory}>
          {food.category || "Uncategorized"}
        </span>
      </div>

      <div style={styles.foodPrice}>
        ₹{food.price.toLocaleString("en-IN")}
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={() => onEdit(food)}
          style={styles.editButton}
        >
          ✎ Edit
        </button>

        <button
          type="button"
          onClick={() => void onDelete(food.id)}
          style={styles.deleteButton}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   ORDER CARD
========================================================= */

type OrderManagementCardProps = {
  order: Order;
  updating: boolean;
  onStatusChange: (
    orderId: string,
    status: OrderStatus
  ) => Promise<void>;
  formatDate: (
    timestamp:
      | {
          seconds: number;
          nanoseconds: number;
        }
      | undefined
  ) => string;
};

function OrderManagementCard({
  order,
  updating,
  onStatusChange,
  formatDate,
}: OrderManagementCardProps) {
  const status = order.status as OrderStatus;

  return (
    <div style={styles.orderCard}>
      {/* HEADER */}

      <div style={styles.orderHeader}>
        <div>
          <div style={styles.orderNumberRow}>
            <span style={styles.orderNumber}>
              ORDER #
              {order.id.slice(-6).toUpperCase()}
            </span>

            <span style={styles.orderDate}>
              {formatDate(order.createdAt)}
            </span>
          </div>

          <h3 style={styles.orderCustomer}>
            {order.userName || "Hotel Guest"}
          </h3>

          <span style={styles.orderRoom}>
            Room service order
          </span>
        </div>

        <div style={styles.orderRight}>
          <strong style={styles.orderAmount}>
            ₹{order.total.toLocaleString("en-IN")}
          </strong>

          <select
            value={status}
            disabled={updating}
            onChange={(event) =>
              void onStatusChange(
                order.id,
                event.target.value as OrderStatus
              )
            }
            style={{
              ...styles.statusSelect,
              ...getStatusStyle(status),
            }}
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

      {/* ITEMS */}

      <div style={styles.orderItems}>
        {order.items.map((item, index) => (
          <div
            key={`${item.foodId}-${index}`}
            style={styles.orderItem}
          >
            <div style={styles.orderItemLeft}>
              <span style={styles.quantityBadge}>
                {item.quantity}×
              </span>

              <span>{item.name}</span>
            </div>

            <strong>
              ₹
              {(
                item.price * item.quantity
              ).toLocaleString("en-IN")}
            </strong>
          </div>
        ))}
      </div>

      {/* FOOTER */}

      <div style={styles.orderFooter}>
        <span>
          {order.items.length}{" "}
          {order.items.length === 1
            ? "item"
            : "items"}
        </span>

        <span style={styles.orderTotalLabel}>
          Total: ₹
          {order.total.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING STATE
========================================================= */

type LoadingStateProps = {
  text: string;
};

function LoadingState({
  text,
}: LoadingStateProps) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.spinner}></div>

      <p style={styles.emptyTitle}>{text}</p>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

type EmptyStateProps = {
  icon: string;
  title: string;
  text: string;
};

function EmptyState({
  icon,
  title,
  text,
}: EmptyStateProps) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>

      <h3 style={styles.emptyTitle}>{title}</h3>

      <p style={styles.emptyText}>{text}</p>
    </div>
  );
}

/* =========================================================
   STATUS STYLE
========================================================= */

function getStatusStyle(
  status: OrderStatus
): React.CSSProperties {
  switch (status) {
    case "Preparing":
      return {
        backgroundColor: "#eff6ff",
        color: "#2563eb",
        borderColor: "#bfdbfe",
      };

    case "Ready":
      return {
        backgroundColor: "#ecfdf5",
        color: "#059669",
        borderColor: "#a7f3d0",
      };

    case "Delivered":
      return {
        backgroundColor: "#f0fdf4",
        color: "#15803d",
        borderColor: "#bbf7d0",
      };

    default:
      return {
        backgroundColor: "#fff7ed",
        color: "#d97706",
        borderColor: "#fed7aa",
      };
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles: Record<string, React.CSSProperties> = {
  /* ================= PAGE ================= */

  page: {
    minHeight: "100vh",
    backgroundColor: "#f6f7f5",
    color: "#1f2937",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  /* ================= HEADER ================= */

  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  headerInner: {
    maxWidth: "1500px",
    minHeight: "76px",
    margin: "0 auto",
    padding: "0 35px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logoIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "800",
  },

  logo: {
    margin: 0,
    fontSize: "21px",
    fontWeight: "800",
  },

  logoOrange: {
    color: "#d97706",
    marginLeft: "4px",
  },

  headerSubtitle: {
    margin: "3px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  adminBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "10px",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
  },

  adminBadgeIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "#fff7ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  adminLabel: {
    display: "block",
    fontSize: "8px",
    color: "#9ca3af",
    letterSpacing: "1px",
  },

  /* ================= CONTAINER ================= */

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "35px",
  },

  pageHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  eyebrow: {
    color: "#d97706",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1.5px",
  },

  pageTitle: {
    margin: "7px 0 5px",
    fontSize: "29px",
    letterSpacing: "-0.7px",
  },

  pageDescription: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "13px",
  },

  /* ================= STATISTICS ================= */

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },

  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e7e5",
    borderRadius: "15px",
    padding: "19px",
  },

  statTop: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "15px",
  },

  statIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    backgroundColor: "#fff7ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
  },

  statLabel: {
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: "600",
  },

  statValue: {
    display: "block",
    fontSize: "25px",
    marginBottom: "5px",
  },

  statSubtext: {
    color: "#9ca3af",
    fontSize: "10px",
  },

  /* ================= SECTIONS ================= */

  formSection: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e7e5",
    borderRadius: "17px",
    padding: "25px",
    marginBottom: "25px",
  },

  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "25px",
  },

  formHeaderIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#fff7ed",
    color: "#d97706",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: "750",
  },

  sectionDescription: {
    margin: "4px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  /* ================= FORM ================= */

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },

  field: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#374151",
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #dfe3e8",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    outline: "none",
  },

  inputWithIcon: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #dfe3e8",
    borderRadius: "9px",
    overflow: "hidden",
  },

  inputIcon: {
    paddingLeft: "12px",
    color: "#9ca3af",
    fontSize: "13px",
  },

  priceInput: {
    width: "100%",
    border: "none",
    outline: "none",
    padding: "11px 8px",
    fontSize: "13px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dfe3e8",
    borderRadius: "9px",
    padding: "11px 12px",
    fontSize: "13px",
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
  },

  availabilityField: {
    marginBottom: "18px",
    padding: "11px 13px",
    borderRadius: "10px",
    backgroundColor: "#f9fafb",
    border: "1px solid #eef0f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  availabilityDescription: {
    margin: "-3px 0 0",
    color: "#9ca3af",
    fontSize: "10px",
  },

  toggle: {
    minWidth: "115px",
    height: "38px",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    gap: "7px",
    transition: "all 0.2s ease",
  },

  toggleActive: {
    backgroundColor: "#ecfdf5",
    color: "#059669",
  },

  toggleInactive: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },

  toggleCircle: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  toggleCircleActive: {
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },

  toggleCircleInactive: {
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },

  toggleText: {
    fontSize: "10px",
    fontWeight: "700",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "5px",
  },

  cancelButton: {
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    color: "#6b7280",
    padding: "11px 18px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "12px",
  },

  primaryButton: {
    minWidth: "145px",
    border: "none",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  /* ================= MANAGEMENT ================= */

  managementSection: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e7e5",
    borderRadius: "17px",
    padding: "25px",
    marginBottom: "25px",
  },

  managementHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },

  itemBadge: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    padding: "7px 11px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: "700",
  },

  /* ================= FILTER ================= */

  filterBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "18px",
  },

  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: "9px",
    padding: "0 11px",
  },

  searchIcon: {
    color: "#9ca3af",
    fontSize: "18px",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    padding: "10px",
    fontSize: "12px",
  },

  filterSelect: {
    border: "1px solid #e5e7eb",
    borderRadius: "9px",
    padding: "0 12px",
    backgroundColor: "#ffffff",
    color: "#374151",
    fontSize: "12px",
    minWidth: "150px",
  },

  /* ================= FOOD LIST ================= */

  foodList: {
    display: "flex",
    flexDirection: "column",
  },

  foodManagementCard: {
    display: "grid",
    gridTemplateColumns:
      "55px minmax(0, 1fr) 100px auto",
    gap: "15px",
    alignItems: "center",
    padding: "15px 0",
    borderBottom: "1px solid #f0f0ee",
  },

  foodManagementIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "11px",
    backgroundColor: "#f8f2e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
  },

  foodManagementInfo: {
    minWidth: 0,
  },

  foodNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  foodName: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
  },

  availabilityBadge: {
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: "800",
  },

  availableBadge: {
    color: "#059669",
    backgroundColor: "#ecfdf5",
  },

  unavailableBadge: {
    color: "#dc2626",
    backgroundColor: "#fef2f2",
  },

  foodDescription: {
    margin: "5px 0",
    color: "#9ca3af",
    fontSize: "10px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  foodCategory: {
    color: "#d97706",
    fontSize: "9px",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  foodPrice: {
    fontWeight: "800",
    fontSize: "14px",
    textAlign: "right",
  },

  actions: {
    display: "flex",
    gap: "7px",
  },

  editButton: {
    border: "1px solid #fed7aa",
    backgroundColor: "#fff7ed",
    color: "#d97706",
    padding: "8px 11px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "10px",
  },

  deleteButton: {
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "8px 11px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "10px",
  },

  /* ================= ORDERS ================= */

  ordersList: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  orderCard: {
    border: "1px solid #e7e7e5",
    borderRadius: "14px",
    padding: "18px",
    backgroundColor: "#ffffff",
  },

  orderHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
  },

  orderNumberRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  orderNumber: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#374151",
  },

  orderDate: {
    color: "#9ca3af",
    fontSize: "9px",
  },

  orderCustomer: {
    margin: "6px 0 2px",
    fontSize: "15px",
  },

  orderRoom: {
    color: "#9ca3af",
    fontSize: "10px",
  },

  orderRight: {
    display: "flex",
    alignItems: "flex-end",
    flexDirection: "column",
    gap: "8px",
  },

  orderAmount: {
    fontSize: "18px",
  },

  statusSelect: {
    border: "1px solid",
    borderRadius: "8px",
    padding: "7px 9px",
    fontSize: "10px",
    fontWeight: "700",
    cursor: "pointer",
    outline: "none",
  },

  orderItems: {
    borderTop: "1px solid #f0f0ee",
    marginTop: "15px",
    paddingTop: "10px",
  },

  orderItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "7px 0",
    fontSize: "12px",
  },

  orderItemLeft: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  quantityBadge: {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
    padding: "4px 7px",
    borderRadius: "5px",
    fontSize: "9px",
    fontWeight: "800",
  },

  orderFooter: {
    borderTop: "1px solid #f0f0ee",
    marginTop: "8px",
    paddingTop: "12px",
    display: "flex",
    justifyContent: "space-between",
    color: "#9ca3af",
    fontSize: "10px",
  },

  orderTotalLabel: {
    color: "#374151",
    fontWeight: "700",
  },

  /* ================= EMPTY ================= */

  emptyState: {
    padding: "50px 20px",
    textAlign: "center",
    border: "1px dashed #d1d5db",
    borderRadius: "12px",
  },

  spinner: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "3px solid #e5e7eb",
    borderTopColor: "#d97706",
    margin: "0 auto 12px",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "8px",
  },

  emptyTitle: {
    margin: "0 0 5px",
    fontSize: "14px",
    fontWeight: "700",
  },

  emptyText: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "11px",
  },
};

export default Admin;