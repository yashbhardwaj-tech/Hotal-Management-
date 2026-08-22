import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { isAdmin } from "../utils/auth";

function Dashboard() {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [foods, setFoods] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const user = auth.currentUser;

  /* =====================================================
     FETCH FOODS
  ===================================================== */

  useEffect(() => {
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
        console.error("FIRESTORE ERROR:", error);
      }
    };

    const checkAdmin = async () => {
      const result = await isAdmin();

      console.log("Is current user admin?", result);
    };

    fetchFoods();
    checkAdmin();
  }, []);

  /* =====================================================
     LISTEN TO ORDERS
  ===================================================== */

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        ordersData.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;

          return dateB - dateA;
        });

        setOrders(ordersData);
      },
      (error) => {
        console.error("Error listening to orders:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     CATEGORIES
  ===================================================== */

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        foods
          .map((food) => food.category)
          .filter((category) => category)
      ),
    ];

    return ["All", ...uniqueCategories];
  }, [foods]);

  /* =====================================================
     FILTER FOODS
  ===================================================== */

  const filteredFoods = useMemo(() => {
    const availableFoods = foods.filter(
      (food) => food.available === true
    );

    if (selectedCategory === "All") {
      return availableFoods;
    }

    return availableFoods.filter(
      (food) => food.category === selectedCategory
    );
  }, [foods, selectedCategory]);

  /* =====================================================
     CART FUNCTIONS
  ===================================================== */

  const addToCart = (food) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === food.id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === food.id
            ? {
              ...item,
              quantity: item.quantity + 1,
            }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...food,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity: item.quantity + 1,
          }
          : item
      )
    );
  };

  const decreaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
              ...item,
              quantity: item.quantity - 1,
            }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /* =====================================================
     TOTALS
  ===================================================== */

  const totalItems = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const totalPrice = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  /* =====================================================
     PLACE ORDER
  ===================================================== */

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert("Please add some food to your cart.");
      return;
    }

    if (!auth.currentUser) {
      alert("Please login before placing an order.");
      return;
    }

    try {
      setPlacingOrder(true);

      const orderData = {
        userId: auth.currentUser.uid,

        userName:
          auth.currentUser.displayName ||
          auth.currentUser.email ||
          "Guest",

        items: cart.map((item) => ({
          foodId: item.id,
          name: item.Name || item.name || "Food Item",
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
        })),

        total: totalPrice,

        status: "Pending",

        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "orders"), orderData);

      alert(
        `Order placed successfully!\nTotal: ₹${totalPrice}`
      );

      setCart([]);
    } catch (error) {
      console.error("Error placing order:", error);

      alert("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  /* =====================================================
     ORDER STATUS
  ===================================================== */

  const orderStatuses = [
    "Pending",
    "Preparing",
    "Ready",
    "Delivered",
  ];

  const getStatusIndex = (status) => {
    const index = orderStatuses.indexOf(status);

    return index === -1 ? 0 : index;
  };

  /* =====================================================
     USER INFO
  ===================================================== */

  const userName =
    user?.displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Guest";

  const userInitial =
    userName?.charAt(0)?.toUpperCase() || "G";

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatOrderDate = (timestamp) => {
    if (!timestamp?.seconds) {
      return "Just now";
    }

    const date = new Date(timestamp.seconds * 1000);

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div style={styles.page}>
      {/* =================================================
          HEADER
      ================================================= */}

      <header style={styles.header}>
        <div style={styles.headerInner}>
          {/* LOGO */}

          <div style={styles.brand}>
            <div style={styles.logoIcon}>H</div>

            <div>
              <h1 style={styles.logo}>
                Hotel
                <span style={styles.logoAccent}>
                  Kitchen
                </span>
              </h1>

              <p style={styles.logoSubtitle}>
                In-room dining
              </p>
            </div>
          </div>

          {/* HEADER RIGHT */}

          <div style={styles.headerRight}>
            <div style={styles.roomBadge}>
              <span style={styles.roomIcon}>⌂</span>

              <div>
                <span style={styles.roomLabel}>
                  ROOM
                </span>

                <strong>204</strong>
              </div>
            </div>

            <div style={styles.userSection}>
              <div style={styles.avatar}>
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    style={styles.avatarImage}
                  />
                ) : (
                  userInitial
                )}
              </div>

              <div style={styles.userInfo}>
                <strong>Hi, {userName}</strong>

                <span style={styles.userWelcome}>
                  Welcome back
                </span>
              </div>
            </div>

            <button
              style={styles.menuButton}
              onClick={() => navigate("/admin")}
              title="Admin Panel"
            >
              <span style={styles.menuDot}></span>
              <span style={styles.menuDot}></span>
              <span style={styles.menuDot}></span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main style={styles.main}>
        {/* =================================================
            HERO
        ================================================= */}

        <section style={styles.hero}>
          <div>
            <span style={styles.heroEyebrow}>
              ✦ ROOM SERVICE
            </span>

            <h2 style={styles.heroTitle}>
              What are you craving today?
            </h2>

            <p style={styles.heroText}>
              Freshly prepared favourites, delivered right
              to your room.
            </p>
          </div>

          <div style={styles.heroCart}>
            <div style={styles.heroCartIcon}>🛒</div>

            <div style={styles.heroCartInfo}>
              <strong>{totalItems} items</strong>

              <span>
                ₹{totalPrice.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </section>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div style={styles.contentGrid}>
          {/* =================================================
              MENU
          ================================================= */}

          <section style={styles.menuSection}>
            {/* MENU HEADER */}

            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Our Menu
                </h2>

                <p style={styles.sectionSubtitle}>
                  Choose something delicious
                </p>
              </div>

              <span style={styles.foodCount}>
                {filteredFoods.length} items
              </span>
            </div>

            {/* CATEGORIES */}

            <div style={styles.categories}>
              {categories.map((category) => {
                const active =
                  selectedCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategory(category)
                    }
                    style={{
                      ...styles.categoryButton,
                      ...(active
                        ? styles.activeCategory
                        : {}),
                    }}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* FOOD GRID */}

            {loadingFoods ? (
              <div style={styles.emptyState}>
                <div style={styles.loadingSpinner}></div>

                <h3 style={styles.emptyStateTitle}>
                  Loading our menu...
                </h3>

                <p style={styles.emptyStateText}>
                  Please wait while we prepare your menu.
                </p>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyFoodIcon}>
                  🍽️
                </div>

                <h3 style={styles.emptyStateTitle}>
                  No food available
                </h3>

                <p style={styles.emptyStateText}>
                  There are no available dishes in this
                  category right now.
                </p>
              </div>
            ) : (
              <div style={styles.foodGrid}>
                {filteredFoods.map((food) => (
                  <FoodCard
                    key={food.id}
                    food={food}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            )}

            {/* =================================================
                ORDERS
            ================================================= */}

            <section style={styles.ordersSection}>
              <div style={styles.ordersHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    Your Orders
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Track your recent room service orders
                  </p>
                </div>

                {orders.length > 0 && (
                  <span style={styles.orderCount}>
                    {orders.length} orders
                  </span>
                )}
              </div>

              {orders.length === 0 ? (
                <div style={styles.noOrders}>
                  <div style={styles.noOrdersIcon}>
                    🧾
                  </div>

                  <h3 style={styles.noOrdersTitle}>
                    No orders yet
                  </h3>

                  <p style={styles.noOrdersText}>
                    Your placed orders will appear here.
                  </p>
                </div>
              ) : (
                <div style={styles.orderList}>
                  {orders.map((order) => {
                    const currentStatus =
                      getStatusIndex(order.status);

                    return (
                      <div
                        key={order.id}
                        style={styles.orderCard}
                      >
                        {/* ORDER HEADER */}

                        <div style={styles.orderTop}>
                          <div>
                            <div
                              style={styles.orderNumberRow}
                            >
                              <span
                                style={styles.orderNumber}
                              >
                                #
                                {order.id
                                  .slice(-6)
                                  .toUpperCase()}
                              </span>

                              <span
                                style={styles.orderDate}
                              >
                                {formatOrderDate(
                                  order.createdAt
                                )}
                              </span>
                            </div>

                            <h3
                              style={styles.orderTotal}
                            >
                              ₹
                              {Number(
                                order.total || 0
                              ).toLocaleString("en-IN")}
                            </h3>
                          </div>

                          <span
                            style={{
                              ...styles.statusBadge,
                              ...getStatusStyle(
                                order.status
                              ),
                            }}
                          >
                            {order.status || "Pending"}
                          </span>
                        </div>

                        {/* ORDER ITEMS */}

                        <div style={styles.orderItems}>
                          {(order.items || []).map(
                            (item, index) => (
                              <div
                                key={`${item.foodId}-${index}`}
                                style={styles.orderItem}
                              >
                                <div
                                  style={
                                    styles.orderItemLeft
                                  }
                                >
                                  <span
                                    style={
                                      styles.orderQuantity
                                    }
                                  >
                                    {item.quantity}×
                                  </span>

                                  <span>
                                    {item.name}
                                  </span>
                                </div>

                                <strong>
                                  ₹
                                  {(
                                    Number(
                                      item.price || 0
                                    ) *
                                    Number(
                                      item.quantity || 0
                                    )
                                  ).toLocaleString("en-IN")}
                                </strong>
                              </div>
                            )
                          )}
                        </div>

                        {/* ORDER PROGRESS */}

                        <div
                          style={styles.orderProgressWrapper}
                        >
                          {orderStatuses.map(
                            (status, index) => {
                              const completed =
                                index <= currentStatus;

                              const isLast =
                                index ===
                                orderStatuses.length - 1;

                              return (
                                <div
                                  key={status}
                                  style={
                                    styles.progressContainer
                                  }
                                >
                                  <div
                                    style={
                                      styles.progressStep
                                    }
                                  >
                                    <div
                                      style={{
                                        ...styles.progressCircle,
                                        ...(completed
                                          ? styles.progressActive
                                          : {}),
                                      }}
                                    >
                                      {completed
                                        ? "✓"
                                        : index + 1}
                                    </div>

                                    <span
                                      style={{
                                        ...styles.progressLabel,
                                        ...(completed
                                          ? styles.progressLabelActive
                                          : {}),
                                      }}
                                    >
                                      {status}
                                    </span>
                                  </div>

                                  {!isLast && (
                                    <div
                                      style={{
                                        ...styles.progressLine,
                                        ...(index <
                                          currentStatus
                                          ? styles.progressLineActive
                                          : {}),
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          {/* =================================================
              CART
          ================================================= */}

          <aside style={styles.cart}>
            <div style={styles.cartHeader}>
              <div>
                <div style={styles.cartTitleRow}>
                  <h2 style={styles.cartTitle}>
                    Your Cart
                  </h2>

                  {totalItems > 0 && (
                    <span style={styles.cartCount}>
                      {totalItems}
                    </span>
                  )}
                </div>

                <p style={styles.cartSubtitle}>
                  Review your selected items
                </p>
              </div>

              <div style={styles.cartHeaderIcon}>
                🛒
              </div>
            </div>

            {/* EMPTY CART */}

            {cart.length === 0 ? (
              <div style={styles.emptyCart}>
                <div style={styles.emptyCartCircle}>
                  🛍️
                </div>

                <h3 style={styles.emptyCartTitle}>
                  Your cart is empty
                </h3>

                <p style={styles.emptyCartText}>
                  Add your favourite dishes from the menu
                  and place your order.
                </p>

                <div style={styles.emptyCartHint}>
                  ✦ Freshly prepared for you
                </div>
              </div>
            ) : (
              <>
                {/* CART ITEMS */}

                <div style={styles.cartItems}>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={styles.cartItem}
                    >
                      <div style={styles.cartFoodIcon}>
                        {item.emoji || "🍽️"}
                      </div>

                      <div style={styles.cartItemInfo}>
                        <h4 style={styles.cartItemName}>
                          {item.Name ||
                            item.name ||
                            "Food Item"}
                        </h4>

                        <span
                          style={styles.cartItemPrice}
                        >
                          ₹{Number(item.price || 0)}
                        </span>

                        <div
                          style={styles.quantityControls}
                        >
                          <button
                            onClick={() =>
                              decreaseQuantity(item.id)
                            }
                            style={styles.quantityButton}
                          >
                            −
                          </button>

                          <span
                            style={styles.quantityNumber}
                          >
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseQuantity(item.id)
                            }
                            style={styles.quantityButton}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <strong style={styles.itemTotal}>
                        ₹
                        {(
                          Number(item.price || 0) *
                          Number(item.quantity || 0)
                        ).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}
                </div>

                {/* BILL */}

                <div style={styles.bill}>
                  <div style={styles.billRow}>
                    <span>Subtotal</span>

                    <strong>
                      ₹
                      {totalPrice.toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div style={styles.billRow}>
                    <span>Room service</span>

                    <span style={styles.freeText}>
                      FREE
                    </span>
                  </div>

                  <div style={styles.divider}></div>

                  {/* TOTAL */}

                  <div style={styles.totalRow}>
                    <div>
                      <span style={styles.totalLabel}>
                        Total amount
                      </span>

                      <small
                        style={styles.totalSubtext}
                      >
                        Inclusive of all charges
                      </small>
                    </div>

                    <strong style={styles.totalAmount}>
                      ₹
                      {totalPrice.toLocaleString("en-IN")}
                    </strong>
                  </div>

                  {/* PLACE ORDER */}

                  <button
                    style={{
                      ...styles.orderButton,
                      ...(placingOrder
                        ? styles.orderButtonDisabled
                        : {}),
                    }}
                    onClick={placeOrder}
                    disabled={placingOrder}
                  >
                    {placingOrder ? (
                      <>
                        <span>Placing Order...</span>
                        <span>⏳</span>
                      </>
                    ) : (
                      <>
                        <span>Place Order</span>

                        <span style={styles.arrow}>
                          →
                        </span>
                      </>
                    )}
                  </button>

                  <p style={styles.checkoutNote}>
                    🔒 Secure order · Delivered to Room 204
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   FOOD CARD
========================================================= */

function FoodCard({ food, onAdd }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAdd(food);

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 900);
  };

  return (
    <article style={styles.foodCard}>
      <div style={styles.foodImage}>
        <div style={styles.foodImageOverlay}></div>

        <span style={styles.foodEmoji}>
          {food.emoji || "🍽️"}
        </span>

        <span style={styles.availableBadge}>
          ● Available
        </span>
      </div>

      <div style={styles.foodContent}>
        <span style={styles.foodCategory}>
          {food.category || "Chef's Special"}
        </span>

        <h3 style={styles.foodName}>
          {food.Name || food.name || "Delicious Food"}
        </h3>

        <p style={styles.foodDescription}>
          {food.description ||
            "Freshly prepared with quality ingredients."}
        </p>

        <div style={styles.foodBottom}>
          <div>
            <span style={styles.priceLabel}>
              Price
            </span>

            <strong style={styles.price}>
              ₹
              {Number(food.price || 0).toLocaleString(
                "en-IN"
              )}
            </strong>
          </div>

          <button
            style={{
              ...styles.addButton,
              ...(added ? styles.addedButton : {}),
            }}
            onClick={handleAdd}
          >
            {added ? "✓ Added" : "+ Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   STATUS STYLE
========================================================= */

function getStatusStyle(status) {
  switch (status) {
    case "Preparing":
      return {
        backgroundColor: "#eff6ff",
        color: "#2563eb",
      };

    case "Ready":
      return {
        backgroundColor: "#ecfdf5",
        color: "#059669",
      };

    case "Delivered":
      return {
        backgroundColor: "#f0fdf4",
        color: "#15803d",
      };

    default:
      return {
        backgroundColor: "#fff7ed",
        color: "#d97706",
      };
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  /* ================= PAGE ================= */

  page: {
    minHeight: "100vh",
    backgroundColor: "#f7f7f5",
    color: "#1f2937",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  /* ================= HEADER ================= */

  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e9e9e7",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },

  headerInner: {
    maxWidth: "1500px",
    margin: "0 auto",
    minHeight: "76px",
    padding: "0 35px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxSizing: "border-box",
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
    letterSpacing: "-0.5px",
  },

  logoAccent: {
    color: "#d97706",
    marginLeft: "4px",
  },

  logoSubtitle: {
    margin: "2px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  roomBadge: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "8px 12px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e5e7eb",
  },

  roomIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    backgroundColor: "#fff7ed",
    color: "#d97706",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  roomLabel: {
    display: "block",
    fontSize: "8px",
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: "1px",
  },

  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#d97706",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "13px",
  },

  userWelcome: {
    color: "#9ca3af",
    fontSize: "11px",
  },

  menuButton: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
  },

  menuDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    backgroundColor: "#374151",
  },

  /* ================= MAIN ================= */

  main: {
    maxWidth: "1500px",
    margin: "0 auto",
    padding: "30px 35px 60px",
    boxSizing: "border-box",
  },

  /* ================= HERO ================= */

  hero: {
    backgroundColor: "#1f2937",
    borderRadius: "20px",
    padding: "30px 35px",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "30px",
    boxSizing: "border-box",
  },

  heroEyebrow: {
    fontSize: "11px",
    letterSpacing: "1.5px",
    fontWeight: "700",
    color: "#fbbf24",
  },

  heroTitle: {
    margin: "9px 0 7px",
    fontSize: "30px",
    lineHeight: "1.2",
    letterSpacing: "-0.8px",
  },

  heroText: {
    margin: 0,
    color: "#d1d5db",
    fontSize: "14px",
  },

  heroCart: {
    minWidth: "190px",
    padding: "14px 17px",
    borderRadius: "14px",
    backgroundColor: "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  heroCartIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    backgroundColor: "#d97706",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  heroCartInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "12px",
  },

  /* ================= CONTENT ================= */

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 370px",
    gap: "30px",
    alignItems: "start",
  },

  menuSection: {
    minWidth: 0,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "750",
    letterSpacing: "-0.4px",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#9ca3af",
    fontSize: "13px",
  },

  foodCount: {
    color: "#6b7280",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    padding: "7px 11px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },

  /* ================= CATEGORIES ================= */

  categories: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },

  categoryButton: {
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    color: "#6b7280",
    padding: "9px 17px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  activeCategory: {
    backgroundColor: "#1f2937",
    color: "#ffffff",
    borderColor: "#1f2937",
  },

  /* ================= FOOD GRID ================= */

  foodGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "18px",
  },

  foodCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #e8e8e6",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },

  foodImage: {
    height: "145px",
    background:
      "linear-gradient(135deg, #f8f2e9, #eee7dc)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  foodImageOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at center, rgba(255,255,255,0.6), transparent 60%)",
  },

  foodEmoji: {
    fontSize: "58px",
    position: "relative",
    zIndex: 1,
  },

  availableBadge: {
    position: "absolute",
    top: "11px",
    right: "11px",
    backgroundColor: "rgba(255,255,255,0.92)",
    color: "#15803d",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "700",
  },

  foodContent: {
    padding: "16px",
  },

  foodCategory: {
    color: "#d97706",
    fontSize: "10px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
  },

  foodName: {
    margin: "6px 0 5px",
    fontSize: "17px",
    fontWeight: "750",
    color: "#1f2937",
  },

  foodDescription: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: "1.5",
    minHeight: "36px",
  },

  foodBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    marginTop: "16px",
  },

  priceLabel: {
    display: "block",
    color: "#9ca3af",
    fontSize: "9px",
    marginBottom: "2px",
  },

  price: {
    display: "block",
    fontSize: "17px",
    color: "#111827",
  },

  addButton: {
    border: "none",
    backgroundColor: "#d97706",
    color: "#ffffff",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "12px",
  },

  addedButton: {
    backgroundColor: "#059669",
  },

  /* ================= EMPTY ================= */

  emptyState: {
    backgroundColor: "#ffffff",
    border: "1px dashed #d1d5db",
    borderRadius: "16px",
    minHeight: "260px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  emptyStateTitle: {
    margin: "10px 0 5px",
    fontSize: "16px",
  },

  emptyStateText: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "13px",
  },

  emptyFoodIcon: {
    fontSize: "42px",
  },

  loadingSpinner: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    border: "3px solid #e5e7eb",
    borderTopColor: "#d97706",
  },

  /* ================= CART ================= */

  cart: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    border: "1px solid #e7e7e5",
    boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
    position: "sticky",
    top: "100px",
    overflow: "hidden",
  },

  cartHeader: {
    padding: "20px",
    borderBottom: "1px solid #eeeeec",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cartTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  cartTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: "750",
  },

  cartCount: {
    backgroundColor: "#d97706",
    color: "#ffffff",
    minWidth: "20px",
    height: "20px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "800",
  },

  cartSubtitle: {
    margin: "4px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  cartHeaderIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "#fff7ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ================= EMPTY CART ================= */

  emptyCart: {
    padding: "55px 25px",
    textAlign: "center",
  },

  emptyCartCircle: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "#f8fafc",
    margin: "0 auto 17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
  },

  emptyCartTitle: {
    margin: "0 0 7px",
    fontSize: "16px",
  },

  emptyCartText: {
    margin: "0 auto",
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: "1.6",
    maxWidth: "240px",
  },

  emptyCartHint: {
    marginTop: "18px",
    color: "#d97706",
    fontSize: "10px",
    fontWeight: "700",
  },

  /* ================= CART ITEMS ================= */

  cartItems: {
    maxHeight: "380px",
    overflowY: "auto",
    padding: "5px 20px",
  },

  cartItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "15px 0",
    borderBottom: "1px solid #f0f0ee",
  },

  cartFoodIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#f8f2e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },

  cartItemInfo: {
    flex: 1,
    minWidth: 0,
  },

  cartItemName: {
    margin: 0,
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  cartItemPrice: {
    display: "block",
    color: "#9ca3af",
    fontSize: "10px",
    marginTop: "3px",
  },

  quantityControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "7px",
  },

  quantityButton: {
    width: "24px",
    height: "24px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "700",
  },

  quantityNumber: {
    minWidth: "15px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "700",
  },

  itemTotal: {
    fontSize: "11px",
    whiteSpace: "nowrap",
  },

  /* ================= BILL ================= */

  bill: {
    padding: "18px 20px 20px",
    backgroundColor: "#fafaf9",
    borderTop: "1px solid #eeeeec",
  },

  billRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    color: "#6b7280",
    fontSize: "12px",
  },

  freeText: {
    color: "#059669",
    fontWeight: "700",
    fontSize: "10px",
  },

  divider: {
    height: "1px",
    backgroundColor: "#e5e7eb",
    margin: "14px 0",
  },

  /* IMPORTANT:
     Separate styles for span and small.
     Do NOT use "totalRow span" or "totalRow small".
  */

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "17px",
  },

  totalLabel: {
    display: "block",
    fontWeight: "700",
    color: "#1f2937",
  },

  totalSubtext: {
    display: "block",
    color: "#9ca3af",
    fontSize: "9px",
    fontWeight: "400",
    marginTop: "3px",
  },

  totalAmount: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#111827",
  },

  orderButton: {
    width: "100%",
    border: "none",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    padding: "14px",
    borderRadius: "10px",
    marginTop: "18px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },

  arrow: {
    fontSize: "18px",
  },

  checkoutNote: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "9px",
    margin: "10px 0 0",
  },

  /* ================= ORDERS ================= */

  ordersSection: {
    marginTop: "35px",
  },

  ordersHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },

  orderCount: {
    color: "#6b7280",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: "7px 10px",
    borderRadius: "8px",
  },

  noOrders: {
    backgroundColor: "#ffffff",
    border: "1px dashed #d1d5db",
    borderRadius: "16px",
    padding: "45px 20px",
    textAlign: "center",
  },

  noOrdersIcon: {
    fontSize: "38px",
    marginBottom: "8px",
  },

  noOrdersTitle: {
    margin: "0 0 5px",
    fontSize: "15px",
  },

  noOrdersText: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "12px",
  },

  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e8e8e6",
    padding: "19px",
  },

  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
  },

  orderNumberRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  orderNumber: {
    color: "#374151",
    fontSize: "11px",
    fontWeight: "800",
  },

  orderDate: {
    color: "#9ca3af",
    fontSize: "10px",
  },

  orderTotal: {
    margin: "7px 0 0",
    fontSize: "18px",
  },

  statusBadge: {
    padding: "7px 10px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "800",
  },

  orderItems: {
    marginTop: "15px",
    padding: "11px 0",
    borderTop: "1px solid #f0f0ee",
    borderBottom: "1px solid #f0f0ee",
  },

  orderItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "5px 0",
    fontSize: "12px",
  },

  orderItemLeft: {
    display: "flex",
    gap: "9px",
    alignItems: "center",
  },

  orderQuantity: {
    backgroundColor: "#f3f4f6",
    padding: "3px 6px",
    borderRadius: "5px",
    fontSize: "10px",
    fontWeight: "700",
  },

  /* ================= PROGRESS ================= */

  orderProgressWrapper: {
    display: "flex",
    alignItems: "flex-start",
    marginTop: "20px",
    width: "100%",
  },

  progressContainer: {
    display: "flex",
    alignItems: "flex-start",
    flex: 1,
  },

  progressStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    minWidth: "58px",
  },

  progressCircle: {
    width: "25px",
    height: "25px",
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "800",
  },

  progressActive: {
    backgroundColor: "#d97706",
    color: "#ffffff",
  },

  progressLabel: {
    color: "#9ca3af",
    fontSize: "8px",
    textAlign: "center",
  },

  progressLabelActive: {
    color: "#d97706",
    fontWeight: "700",
  },

  progressLine: {
    height: "2px",
    backgroundColor: "#e5e7eb",
    flex: 1,
    marginTop: "12px",
  },

  progressLineActive: {
    backgroundColor: "#d97706",
  },
};

export default Dashboard;