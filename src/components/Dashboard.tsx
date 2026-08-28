import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import {
  isAdmin,
  signInWithGoogle,
  getOrderOwnerId,
  loadDeliveryDetails,
  saveDeliveryDetails,
  type DeliveryDetails,
} from "../utils/auth";
import {
  getPortions,
  hasPortions,
  startingPrice,
  lineId,
  type Portion,
} from "../utils/portions";
import { BrandMark } from "./Brand";
import { PortionPicker } from "./Portionpicker";
import { t, globalCss, inr, emojiFor } from "../theme";

/* =========================================================
   TYPES
========================================================= */

type FirestoreTimestamp = { seconds: number; nanoseconds: number };

type Food = {
  id: string;
  Name?: string;
  name?: string;
  description?: string;
  price: number;
  category?: string;
  available: boolean;
  emoji?: string;
  portions?: Portion[];
};

/* Half and Full of the same dish are separate tray lines, so
   the food id alone can't key the cart — lineKey does. */
type CartItem = Food & {
  quantity: number;
  lineKey: string;
  portionLabel?: string;
  unitPrice: number;
};

type OrderItem = {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
  portion?: string;
};

type Customer = {
  name: string;
  phone: string;
  address: string;
  landmark?: string;
};

type Order = {
  id: string;
  ownerId?: string;
  userName?: string;
  customer?: Customer;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt?: FirestoreTimestamp;
};

type OrderStatus = "Pending" | "Preparing" | "Ready" | "Delivered";
type ToastTone = "success" | "error";
type Toast = { message: string; tone: ToastTone };
type TimerId = ReturnType<typeof setTimeout>;

const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "Ready",
  "Delivered",
];

const emptyDetails: DeliveryDetails = {
  name: "",
  phone: "",
  address: "",
  landmark: "",
};

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const [foods, setFoods] = useState<Food[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("hk_cart");
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [loadingFoods, setLoadingFoods] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  /* Dish waiting on a size choice */
  const [pendingFood, setPendingFood] = useState<Food | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [details, setDetails] = useState<DeliveryDetails>(emptyDetails);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<TimerId | undefined>(undefined);

  /* Stable per-browser id so a guest can still track orders */
  const ownerId = useMemo(() => getOrderOwnerId(user), [user]);

  /* =====================================================
     TOAST
  ===================================================== */

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success"): void => {
      setToast({ message, tone });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3200);
    },
    [],
  );

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* =====================================================
     AUTH — observed, never required. Signing in is only
     needed to reach the admin panel.
  ===================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = loadDeliveryDetails();
    if (saved) setDetails(saved);
  }, []);

  /* Keep the tray across refreshes — a lost cart is a lost order. */
  useEffect(() => {
    try {
      localStorage.setItem("hk_cart", JSON.stringify(cart));
    } catch {
      /* Private mode or quota — not worth failing over */
    }
  }, [cart]);

  /* =====================================================
     FOODS
  ===================================================== */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "foods"),
      (snapshot) => {
        setFoods(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data();

            return {
              id: docSnap.id,
              Name: data.Name ? String(data.Name) : undefined,
              name: data.name ? String(data.name) : undefined,
              description: data.description
                ? String(data.description)
                : undefined,
              price: Number(data.price || 0),
              category: data.category ? String(data.category) : undefined,
              available: Boolean(data.available),
              emoji: data.emoji ? String(data.emoji) : undefined,
              portions: Array.isArray(data.portions)
                ? (data.portions as Portion[])
                : undefined,
            };
          }),
        );

        setLoadingFoods(false);
      },
      (error) => {
        console.error("Error loading foods:", error);
        setLoadingFoods(false);
        showToast("Couldn't load the menu. Try refreshing.", "error");
      },
    );

    return () => unsubscribe();
  }, [showToast]);

  /* =====================================================
     ORDERS — filed under ownerId, which is the uid when
     signed in and the guest id otherwise.
  ===================================================== */

  useEffect(() => {
    const ordersQuery = query(
      collection(db, "orders"),
      where("ownerId", "==", ownerId),
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data: Order[] = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data();

          const items: OrderItem[] = Array.isArray(raw.items)
            ? raw.items.map((entry: unknown) => {
              const item = entry as Record<string, unknown>;

              return {
                foodId: String(item.foodId || ""),
                name: String(item.name || ""),
                price: Number(item.price || 0),
                quantity: Number(item.quantity || 0),
                portion: item.portion ? String(item.portion) : undefined,
              };
            })
            : [];

          return {
            id: docSnap.id,
            ownerId: raw.ownerId ? String(raw.ownerId) : undefined,
            userName: raw.userName ? String(raw.userName) : undefined,
            customer: raw.customer as Customer | undefined,
            items,
            total: Number(raw.total || 0),
            status: String(raw.status || "Pending"),
            createdAt: raw.createdAt
              ? {
                seconds: Number(raw.createdAt.seconds || 0),
                nanoseconds: Number(raw.createdAt.nanoseconds || 0),
              }
              : undefined,
          };
        });

        data.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );

        setOrders(data);
        setLoadingOrders(false);
      },
      (error) => {
        console.error("Error listening to orders:", error);
        setLoadingOrders(false);
      },
    );

    return () => unsubscribe();
  }, [ownerId]);

  /* =====================================================
     DERIVED
  ===================================================== */

  const categories = useMemo<string[]>(() => {
    const unique = [
      ...new Set(
        foods
          .filter((food) => food.available)
          .map((food) => food.category)
          .filter((category): category is string => Boolean(category)),
      ),
    ].sort();

    return ["All", ...unique];
  }, [foods]);

  const filteredFoods = useMemo<Food[]>(() => {
    const term = search.trim().toLowerCase();

    return foods
      .filter((food) => food.available === true)
      .filter((food) =>
        selectedCategory === "All" ? true : food.category === selectedCategory,
      )
      .filter((food) => {
        if (!term) return true;

        const label = (food.Name || food.name || "").toLowerCase();

        return (
          label.includes(term) ||
          (food.category || "").toLowerCase().includes(term)
        );
      });
  }, [foods, selectedCategory, search]);

  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const activeOrder = useMemo<Order | undefined>(
    () => orders.find((order) => order.status && order.status !== "Delivered"),
    [orders],
  );

  /* =====================================================
     CART
  ===================================================== */

  const addToCart = (food: Food, portion?: Portion): void => {
    const key = lineId(food.id, portion?.label);
    const unitPrice = portion?.price ?? Number(food.price || 0);

    setCart((current) => {
      const existing = current.find((item) => item.lineKey === key);

      if (existing) {
        return current.map((item) =>
          item.lineKey === key
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          ...food,
          quantity: 1,
          lineKey: key,
          portionLabel: portion?.label,
          unitPrice,
        },
      ];
    });
  };

  /* Dishes with sizes ask first; everything else adds straight away. */
  const requestAdd = (food: Food): void => {
    if (hasPortions(food)) {
      setPendingFood(food);
      return;
    }

    addToCart(food);
  };

  const setQuantity = (key: string, delta: number): void => {
    setCart((current) =>
      current
        .map((item) =>
          item.lineKey === key
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (key: string): void => {
    setCart((current) => current.filter((item) => item.lineKey !== key));
  };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const errors = useMemo(() => {
    const next: Partial<Record<keyof DeliveryDetails, string>> = {};

    if (!details.name.trim()) {
      next.name = "Please enter your name";
    }

    const digits = details.phone.replace(/\D/g, "");

    if (!digits) {
      next.phone = "Phone number is required";
    } else if (digits.length < 10) {
      next.phone = "Enter a 10-digit mobile number";
    }

    if (!details.address.trim()) {
      next.address = "Delivery address is required";
    } else if (details.address.trim().length < 15) {
      next.address = "Add house/flat number, street and area";
    }

    return next;
  }, [details]);

  const isValid = Object.keys(errors).length === 0;

  const fieldError = (key: keyof DeliveryDetails): string | undefined =>
    touched[key] ? errors[key] : undefined;

  /* =====================================================
     CHECKOUT
  ===================================================== */

  const openCheckout = (): void => {
    if (cart.length === 0) {
      showToast("Add something to your tray first.", "error");
      return;
    }

    setTouched({});
    setCheckoutOpen(true);
  };

  const placeOrder = async (): Promise<void> => {
    setTouched({ name: true, phone: true, address: true });

    if (!isValid) return;

    setPlacingOrder(true);

    try {
      await addDoc(collection(db, "orders"), {
        ownerId,
        /* Present only when the person happens to be signed in */
        userId: user?.uid ?? null,
        userName: details.name.trim(),
        customer: {
          name: details.name.trim(),
          phone: details.phone.replace(/\D/g, ""),
          address: details.address.trim(),
          landmark: details.landmark.trim(),
        },
        items: cart.map((item) => ({
          foodId: item.id,
          name: item.Name || item.name || "Food Item",
          price: Number(item.unitPrice || 0),
          quantity: Number(item.quantity || 1),
          portion: item.portionLabel ?? null,
        })),
        total: totalPrice,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      saveDeliveryDetails(details);

      setCart([]);
      setCheckoutOpen(false);
      showToast(`Order placed — ${inr(totalPrice)}. We're on it.`);
    } catch (error) {
      console.error("Error placing order:", error);
      showToast("Couldn't place the order. Try again.", "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  /* =====================================================
     ADMIN
     Offered to everyone. Clicking signs the person in and
     then checks the isAdmin flag on their user document.
  ===================================================== */

  const handleAdminClick = async (): Promise<void> => {
    setCheckingAdmin(true);

    try {
      const current = user ?? (await signInWithGoogle());
      const allowed = await isAdmin(current);

      if (allowed) {
        navigate("/admin");
      } else {
        showToast(
          "You're signed in, but this account doesn't have admin access yet.",
          "error",
        );
      }
    } catch (error) {
      const code = (error as { code?: string })?.code || "";

      if (code === "auth/popup-closed-by-user") {
        showToast("Sign-in was cancelled.", "error");
      } else if (code === "auth/popup-blocked") {
        showToast("Your browser blocked the sign-in window.", "error");
      } else {
        console.error("Admin sign-in failed:", error);
        showToast("Couldn't sign you in. Try again.", "error");
      }
    } finally {
      setCheckingAdmin(false);
    }
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  const statusIndex = (status: string): number => {
    const index = ORDER_STATUSES.indexOf(status as OrderStatus);
    return index === -1 ? 0 : index;
  };

  const formatDate = (timestamp: FirestoreTimestamp | undefined): string => {
    if (!timestamp?.seconds) return "Just now";

    return new Date(timestamp.seconds * 1000).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const displayName =
    details.name.trim().split(" ")[0] ||
    user?.displayName?.split(" ")[0] ||
    "there";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div style={s.page}>
      <style>{globalCss}</style>

      {/* ================= HEADER ================= */}

      <header style={s.header}>
        <div className="pad" style={s.headerInner}>
          <div style={s.brand}>
            <BrandMark />

            <div>
              <h1 style={s.wordmark}>hotel rao place</h1>
              <p style={s.wordmarkSub}>In-room dining</p>
            </div>
          </div>

          <div style={s.headerRight}>
            <button
              type="button"
              className="btn btn-ghost"
              style={s.adminButton}
              onClick={() => void handleAdminClick()}
              disabled={checkingAdmin}
            >
              {checkingAdmin ? (
                <span className="spin" style={s.miniSpinner} />
              ) : (
                <span style={s.adminDot} />
              )}
              Admin
            </button>

            {user && (
              <div style={s.userChip}>
                <div style={s.avatar}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={s.avatarImg} />
                  ) : (
                    (user.displayName || "G").charAt(0).toUpperCase()
                  )}
                </div>

                <div style={s.userText}>
                  <strong style={s.userName}>
                    {user.displayName?.split(" ")[0] || "Signed in"}
                  </strong>

                  <button
                    type="button"
                    onClick={() => void signOut(auth)}
                    style={s.signOut}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pad" style={s.main}>
        {/* ================= HERO ================= */}

        <section className="hero" style={s.hero}>
          <div style={{ maxWidth: 520 }}>
            <span style={s.heroEyebrow}>KITCHEN OPEN · 24 HOURS</span>

            <h2 style={s.heroTitle}>
              Good to see you, {displayName}.
              <br />
              <span style={s.heroItalic}>What shall we send up?</span>
            </h2>

            <p style={s.heroText}>
              Browse the menu and order — no account needed.
            </p>
          </div>

          {activeOrder ? (
            <div style={s.heroStatus}>
              <span style={s.heroStatusLabel}>ORDER IN PROGRESS</span>
              <strong style={s.heroStatusValue}>{activeOrder.status}</strong>
              <span style={s.heroStatusMeta}>
                #{activeOrder.id.slice(-6).toUpperCase()} ·{" "}
                {inr(activeOrder.total)}
              </span>
            </div>
          ) : (
            <div style={s.heroStatus}>
              <span style={s.heroStatusLabel}>YOUR TRAY</span>
              <strong style={s.heroStatusValue}>
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </strong>
              <span style={s.heroStatusMeta}>{inr(totalPrice)}</span>
            </div>
          )}
        </section>

        <div className="content-grid" style={s.contentGrid}>
          {/* ================= MENU ================= */}

          <section style={{ minWidth: 0 }}>
            <div style={s.sectionHead}>
              <div>
                <h2 style={s.sectionTitle}>The Menu</h2>

                <p style={s.sectionSub}>
                  {loadingFoods
                    ? "Fetching today's dishes"
                    : `${filteredFoods.length} available now`}
                </p>
              </div>

              <div style={s.searchBox}>
                <span style={s.searchIcon}>⌕</span>

                <input
                  className="inp"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search dishes"
                  style={s.searchInput}
                />
              </div>
            </div>

            <div className="thin" style={s.categories}>
              {categories.map((category) => {
                const active = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    className="btn"
                    onClick={() => setSelectedCategory(category)}
                    style={{ ...s.chip, ...(active ? s.chipActive : {}) }}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {loadingFoods ? (
              <div style={s.foodGrid}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div key={index} style={s.skelCard}>
                    <div className="skel" style={s.skelImage} />

                    <div style={{ padding: 16 }}>
                      <div className="skel" style={{ height: 9, width: "35%" }} />
                      <div
                        className="skel"
                        style={{ height: 15, width: "75%", marginTop: 10 }}
                      />
                      <div
                        className="skel"
                        style={{ height: 9, width: "100%", marginTop: 12 }}
                      />
                      <div
                        className="skel"
                        style={{ height: 34, width: "100%", marginTop: 18 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFoods.length === 0 ? (
              <EmptyState
                icon="🍽️"
                title={
                  search ? "Nothing matches that" : "Nothing on this section yet"
                }
                text={
                  search
                    ? "Try a different dish name, or clear the search."
                    : "Pick another category — the kitchen is still serving."
                }
                action={
                  search
                    ? { label: "Clear search", onClick: () => setSearch("") }
                    : undefined
                }
              />
            ) : (
              <div style={s.foodGrid}>
                {filteredFoods.map((food) => (
                  <FoodCard key={food.id} food={food} onAdd={requestAdd} />
                ))}
              </div>
            )}

            {/* ================= ORDERS ================= */}

            <section style={{ marginTop: 44 }}>
              <div style={s.sectionHead}>
                <div>
                  <h2 style={s.sectionTitle}>Your Orders</h2>
                  <p style={s.sectionSub}>Live status, updated automatically</p>
                </div>

                {orders.length > 0 && (
                  <span style={s.countPill}>{orders.length}</span>
                )}
              </div>

              {loadingOrders ? (
                <div className="skel" style={{ height: 120, borderRadius: t.rLg }} />
              ) : orders.length === 0 ? (
                <EmptyState
                  icon="🧾"
                  title="No orders yet"
                  text="Once you send something up, you'll be able to follow it here."
                />
              ) : (
                <div style={s.orderList}>
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      currentStep={statusIndex(order.status)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>

          {/* ================= TRAY ================= */}

          <aside className="cart-panel" style={s.tray}>
            <div style={s.trayHead}>
              <div>
                <h2 style={s.trayTitle}>Your Tray</h2>

                <p style={s.traySub}>
                  {totalItems === 0
                    ? "Nothing selected"
                    : `${totalItems} ${totalItems === 1 ? "item" : "items"} ready`}
                </p>
              </div>

              {totalItems > 0 && <span style={s.trayCount}>{totalItems}</span>}
            </div>

            {cart.length === 0 ? (
              <div style={s.trayEmpty}>
                <div style={s.trayEmptyMark}>🍽️</div>

                <h3 style={s.trayEmptyTitle}>Your tray is empty</h3>

                <p style={s.trayEmptyText}>
                  Add a dish from the menu and it will appear here, ready to
                  send to the kitchen.
                </p>
              </div>
            ) : (
              <>
                <div className="thin" style={s.trayItems}>
                  {cart.map((item) => (
                    <div key={item.lineKey} style={s.trayItem}>
                      <div style={s.trayIcon}>{emojiFor(item)}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={s.trayItemName}>
                          {item.Name || item.name || "Food Item"}
                        </h4>

                        <span style={s.trayItemPrice}>
                          {item.portionLabel && (
                            <span style={s.trayPortion}>
                              {item.portionLabel} ·{" "}
                            </span>
                          )}
                          {inr(item.unitPrice)} each
                        </span>

                        <div style={s.stepper}>
                          <button
                            type="button"
                            className="btn"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(item.lineKey, -1)}
                            style={s.stepBtn}
                          >
                            −
                          </button>

                          <span style={s.stepValue}>{item.quantity}</span>

                          <button
                            type="button"
                            className="btn"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(item.lineKey, 1)}
                            style={s.stepBtn}
                          >
                            +
                          </button>

                          <button
                            type="button"
                            className="btn"
                            onClick={() => removeItem(item.lineKey)}
                            style={s.removeBtn}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <strong style={s.trayItemTotal}>
                        {inr(item.unitPrice * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={s.bill}>
                  <div style={s.billRow}>
                    <span>Subtotal</span>
                    <strong style={{ color: t.text }}>{inr(totalPrice)}</strong>
                  </div>

                  <div style={s.billRow}>
                    <span>Delivery</span>
                    <span style={s.free}>FREE</span>
                  </div>

                  <div style={s.billLine} />

                  <div style={s.totalRow}>
                    <div>
                      <span style={s.totalLabel}>Total</span>
                      <small style={s.totalSub}>All charges included</small>
                    </div>

                    <strong style={s.totalAmount}>{inr(totalPrice)}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCheckout}
                    style={s.placeButton}
                  >
                    <span>Continue to details</span>
                    <span style={{ fontSize: 17 }}>→</span>
                  </button>

                  <p style={s.trayNote}>
                    Name, phone and address needed at the next step
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      {/* ================= SIZE PICKER ================= */}

      <PortionPicker
        open={Boolean(pendingFood)}
        dishName={pendingFood?.Name || pendingFood?.name || ""}
        portions={getPortions(pendingFood ?? undefined)}
        onPick={(portion) => {
          if (pendingFood) {
            addToCart(pendingFood, portion);
            showToast(
              `${pendingFood.Name || pendingFood.name} (${portion.label}) added`,
            );
          }
          setPendingFood(null);
        }}
        onClose={() => setPendingFood(null)}
      />

      {/* ================= CHECKOUT ================= */}

      {checkoutOpen && (
        <div
          style={s.backdrop}
          role="presentation"
          onClick={() => !placingOrder && setCheckoutOpen(false)}
        >
          <div
            className="fade-up thin"
            style={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={s.modalHead}>
              <div>
                <h3 id="checkout-title" style={s.modalTitle}>
                  Delivery details
                </h3>

                <p style={s.modalSub}>
                  We need these to get your food to the right door.
                </p>
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => setCheckoutOpen(false)}
                style={s.modalClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={s.modalBody}>
              <Field label="Full name" error={fieldError("name")} required>
                <input
                  className="inp"
                  type="text"
                  value={details.name}
                  onChange={(event) =>
                    setDetails({ ...details, name: event.target.value })
                  }
                  onBlur={() => setTouched({ ...touched, name: true })}
                  placeholder="Yash Bharadwaj"
                  style={{
                    ...s.input,
                    ...(fieldError("name") ? s.inputError : {}),
                  }}
                />
              </Field>

              <Field
                label="Phone number"
                error={fieldError("phone")}
                required
                hint="We'll call if the driver can't find you"
              >
                <div
                  style={{
                    ...s.phoneWrap,
                    ...(fieldError("phone") ? s.inputError : {}),
                  }}
                >
                  <span style={s.phonePrefix}>+91</span>

                  <input
                    className="inp"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={details.phone}
                    onChange={(event) =>
                      setDetails({
                        ...details,
                        phone: event.target.value.replace(/\D/g, ""),
                      })
                    }
                    onBlur={() => setTouched({ ...touched, phone: true })}
                    placeholder="98765 43210"
                    style={s.phoneInput}
                  />
                </div>
              </Field>

              <Field
                label="Full home address"
                error={fieldError("address")}
                required
                hint="House/flat number, street, area, city and PIN"
              >
                <textarea
                  className="inp"
                  rows={4}
                  value={details.address}
                  onChange={(event) =>
                    setDetails({ ...details, address: event.target.value })
                  }
                  onBlur={() => setTouched({ ...touched, address: true })}
                  placeholder={
                    "Flat 402, Ashray Residency\nCollege Road, Tilakwadi\nBelagavi, Karnataka 590006"
                  }
                  style={{
                    ...s.textarea,
                    ...(fieldError("address") ? s.inputError : {}),
                  }}
                />
              </Field>

              <Field label="Landmark" hint="Optional, but it helps">
                <input
                  className="inp"
                  type="text"
                  value={details.landmark}
                  onChange={(event) =>
                    setDetails({ ...details, landmark: event.target.value })
                  }
                  placeholder="Opposite the water tank"
                  style={s.input}
                />
              </Field>

              <div style={s.summaryBox}>
                <span style={s.summaryLabel}>
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>

                <strong style={s.summaryTotal}>{inr(totalPrice)}</strong>
              </div>
            </div>

            <div style={s.modalFoot}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCheckoutOpen(false)}
                disabled={placingOrder}
                style={s.secondaryButton}
              >
                Back to tray
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void placeOrder()}
                disabled={placingOrder}
                style={s.confirmButton}
              >
                {placingOrder ? (
                  <>
                    <span className="spin" style={s.btnSpinner} />
                    Placing order…
                  </>
                ) : (
                  <>
                    <span>Place order · {inr(totalPrice)}</span>
                    <span style={{ fontSize: 16 }}>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST ================= */}

      {toast && (
        <div
          className="toast"
          role="status"
          style={{
            ...s.toast,
            background: toast.tone === "error" ? t.red : t.ink,
          }}
        >
          <span style={s.toastMark}>{toast.tone === "error" ? "!" : "✓"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>
        {label}
        {required && <span style={s.required}> *</span>}
      </span>

      {children}

      {error ? (
        <span style={s.fieldError}>{error}</span>
      ) : hint ? (
        <span style={s.fieldHint}>{hint}</span>
      ) : null}
    </label>
  );
}

/* =========================================================
   FOOD CARD
========================================================= */

type FoodCardProps = { food: Food; onAdd: (food: Food) => void };

function FoodCard({ food, onAdd }: FoodCardProps) {
  const [added, setAdded] = useState(false);
  const timer = useRef<TimerId | undefined>(undefined);

  const sizes = getPortions(food);
  const sized = sizes.length > 0;

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleAdd = (): void => {
    onAdd(food);

    /* Sized dishes open a picker, so the tick would be a lie —
       the item isn't in the tray until a size is chosen. */
    if (sized) return;

    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1100);
  };

  return (
    <article className="lift" style={s.foodCard}>
      <div style={s.foodImage}>
        <span style={s.foodEmoji}>{emojiFor(food)}</span>
        <span style={s.foodTag}>{food.category || "Chef's pick"}</span>
      </div>

      <div style={s.foodBody}>
        <h3 style={s.foodName}>{food.Name || food.name || "Dish"}</h3>

        <p style={s.foodDesc}>
          {food.description || "Freshly prepared with quality ingredients."}
        </p>

        {sized && (
          <div style={s.sizeRow}>
            {sizes.map((size) => (
              <span key={size.label} style={s.sizeChip}>
                {size.label}
              </span>
            ))}
          </div>
        )}

        <div style={s.foodFoot}>
          <div>
            {sized && <span style={s.fromLabel}>from</span>}
            <strong style={s.foodPrice}>{inr(startingPrice(food))}</strong>
          </div>

          <button
            type="button"
            className={`btn ${added ? "" : "btn-brass"}`}
            onClick={handleAdd}
            style={{ ...s.addBtn, ...(added ? s.addBtnDone : {}) }}
          >
            {added ? "✓ Added" : sized ? "Choose" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   ORDER CARD
========================================================= */

type OrderCardProps = {
  order: Order;
  currentStep: number;
  formatDate: (timestamp: FirestoreTimestamp | undefined) => string;
};

function OrderCard({ order, currentStep, formatDate }: OrderCardProps) {
  return (
    <article style={s.orderCard}>
      <div style={s.orderTop}>
        <div>
          <div style={s.orderMeta}>
            <span style={s.orderNo}>#{order.id.slice(-6).toUpperCase()}</span>
            <span style={s.orderDate}>{formatDate(order.createdAt)}</span>
          </div>

          <h3 style={s.orderTotal}>{inr(order.total)}</h3>
        </div>

        <span style={{ ...s.statusBadge, ...statusTone(order.status) }}>
          {order.status || "Pending"}
        </span>
      </div>

      <div style={s.orderItems}>
        {(order.items || []).map((item, index) => (
          <div key={`${item.foodId}-${index}`} style={s.orderItem}>
            <span style={s.orderQty}>{item.quantity}×</span>

            <span style={{ flex: 1 }}>
              {item.name}
              {item.portion && (
                <span style={s.itemPortion}> · {item.portion}</span>
              )}
            </span>

            <strong>
              {inr(Number(item.price || 0) * Number(item.quantity || 0))}
            </strong>
          </div>
        ))}
      </div>

      {order.customer?.address && (
        <p style={s.orderAddress}>Delivering to {order.customer.address}</p>
      )}

      <div style={s.track}>
        {ORDER_STATUSES.map((status, index) => {
          const done = index <= currentStep;
          const last = index === ORDER_STATUSES.length - 1;

          return (
            <div key={status} style={s.trackSeg}>
              <div style={s.trackStep}>
                <div style={{ ...s.trackDot, ...(done ? s.trackDotOn : {}) }}>
                  {done ? "✓" : index + 1}
                </div>

                <span
                  style={{ ...s.trackLabel, ...(done ? s.trackLabelOn : {}) }}
                >
                  {status}
                </span>
              </div>

              {!last && (
                <div
                  style={{
                    ...s.trackLine,
                    ...(index < currentStep ? s.trackLineOn : {}),
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  text: string;
  action?: { label: string; onClick: () => void };
};

function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>{icon}</div>
      <h3 style={s.emptyTitle}>{title}</h3>
      <p style={s.emptyText}>{text}</p>

      {action && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={action.onClick}
          style={s.emptyAction}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* =========================================================
   STATUS TONE
========================================================= */

function statusTone(status: string): CSSProperties {
  switch (status) {
    case "Preparing":
      return { background: t.blueSoft, color: t.blue };
    case "Ready":
      return { background: t.greenSoft, color: t.green };
    case "Delivered":
      return { background: "#EDEFEC", color: t.muted };
    default:
      return { background: t.amberSoft, color: t.amber };
  }
}

/* =========================================================
   STYLES
========================================================= */

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: t.cream,
    color: t.text,
    fontFamily: t.body,
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    background: "rgba(247,244,237,.88)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: `1px solid ${t.line}`,
  },

  headerInner: {
    maxWidth: 1440,
    margin: "0 auto",
    minHeight: 72,
    padding: "0 34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  brand: { display: "flex", alignItems: "center", gap: 12 },

  wordmark: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 19,
    letterSpacing: "-0.01em",
    color: t.ink,
    textTransform: "capitalize",
  },

  wordmarkSub: {
    margin: "1px 0 0",
    fontSize: 10,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: t.faint,
  },

  headerRight: { display: "flex", alignItems: "center", gap: 14 },

  adminButton: {
    height: 36,
    padding: "0 15px",
    borderRadius: 10,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  adminDot: { width: 6, height: 6, borderRadius: "50%", background: t.brass },

  miniSpinner: {
    width: 11,
    height: 11,
    borderRadius: "50%",
    border: `2px solid ${t.line}`,
    borderTopColor: t.brass,
  },

  userChip: { display: "flex", alignItems: "center", gap: 10 },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: t.ink,
    color: t.brass,
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    fontSize: 14,
    overflow: "hidden",
  },

  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },

  userText: { display: "flex", flexDirection: "column", lineHeight: 1.25 },

  userName: { fontSize: 13, color: t.text },

  signOut: {
    border: "none",
    background: "none",
    padding: 0,
    textAlign: "left",
    fontSize: 11,
    color: t.faint,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  main: { maxWidth: 1440, margin: "0 auto", padding: "30px 34px 70px" },

  hero: {
    background: t.ink,
    borderRadius: t.rLg,
    padding: "36px 40px",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 30,
    marginBottom: 34,
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.24em",
    color: t.brass,
  },

  heroTitle: {
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 34,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    margin: "14px 0 12px",
  },

  heroItalic: { fontStyle: "italic", color: "rgba(255,255,255,.62)" },

  heroText: { margin: 0, fontSize: 13.5, color: "rgba(255,255,255,.6)" },

  heroStatus: {
    minWidth: 190,
    padding: "18px 20px",
    borderRadius: t.r,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  heroStatusLabel: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "rgba(255,255,255,.5)",
  },

  heroStatusValue: { fontFamily: t.display, fontSize: 24, fontWeight: 400 },

  heroStatusMeta: { fontSize: 11, color: t.brass },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 360px",
    gap: 30,
    alignItems: "start",
  },

  sectionHead: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },

  sectionTitle: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 25,
    letterSpacing: "-0.015em",
    color: t.ink,
  },

  sectionSub: { margin: "4px 0 0", fontSize: 12.5, color: t.faint },

  countPill: {
    padding: "5px 11px",
    borderRadius: 20,
    background: t.surface,
    border: `1px solid ${t.line}`,
    fontSize: 11,
    fontWeight: 700,
    color: t.muted,
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    padding: "0 12px",
    width: 220,
  },

  searchIcon: { color: t.faint, fontSize: 16 },

  searchInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    background: "none",
    padding: "9px 0",
    fontSize: 13,
    color: t.text,
  },

  categories: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
    marginBottom: 20,
  },

  chip: {
    flexShrink: 0,
    padding: "8px 16px",
    borderRadius: 9,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 12.5,
  },

  chipActive: { background: t.ink, borderColor: t.ink, color: "#fff" },

  foodGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(228px, 1fr))",
    gap: 18,
  },

  foodCard: {
    background: t.surface,
    border: `1px solid ${t.lineSoft}`,
    borderRadius: t.r,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  foodImage: {
    height: 128,
    position: "relative",
    background: `radial-gradient(circle at 50% 40%, #FFFDF7, ${t.brassSoft})`,
    display: "grid",
    placeItems: "center",
  },

  foodEmoji: { fontSize: 52 },

  foodTag: {
    position: "absolute",
    top: 11,
    left: 11,
    padding: "4px 8px",
    borderRadius: 6,
    background: "rgba(255,255,255,.9)",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: t.brass,
  },

  foodBody: { padding: 16, display: "flex", flexDirection: "column", flex: 1 },

  foodName: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 17.5,
    color: t.ink,
  },

  foodDesc: {
    margin: "7px 0 0",
    fontSize: 12,
    lineHeight: 1.55,
    color: t.faint,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  sizeRow: { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" },

  sizeChip: {
    padding: "3px 9px",
    borderRadius: 20,
    background: t.brassSoft,
    color: t.brass,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.03em",
  },

  foodFoot: {
    marginTop: "auto",
    paddingTop: 16,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },

  fromLabel: {
    display: "block",
    fontSize: 9.5,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: t.faint,
    marginBottom: 1,
  },

  foodPrice: { fontFamily: t.display, fontSize: 19, color: t.ink },

  addBtn: {
    padding: "9px 16px",
    borderRadius: 9,
    background: t.brass,
    color: "#fff",
    fontSize: 12.5,
    whiteSpace: "nowrap",
  },

  addBtnDone: { background: t.green },

  skelCard: {
    background: t.surface,
    border: `1px solid ${t.lineSoft}`,
    borderRadius: t.r,
    overflow: "hidden",
  },

  skelImage: { height: 128, borderRadius: 0 },

  orderList: { display: "flex", flexDirection: "column", gap: 14 },

  orderCard: {
    background: t.surface,
    border: `1px solid ${t.lineSoft}`,
    borderRadius: t.r,
    padding: 20,
  },

  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },

  orderMeta: { display: "flex", alignItems: "center", gap: 9 },

  orderNo: {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: t.muted,
  },

  orderDate: { fontSize: 10.5, color: t.faint },

  orderTotal: {
    margin: "8px 0 0",
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 22,
    color: t.ink,
  },

  statusBadge: {
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  orderItems: {
    margin: "16px 0",
    padding: "12px 0",
    borderTop: `1px solid ${t.lineSoft}`,
    borderBottom: `1px solid ${t.lineSoft}`,
  },

  orderItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "5px 0",
    fontSize: 12.5,
  },

  orderQty: {
    padding: "3px 7px",
    borderRadius: 5,
    background: t.surfaceAlt,
    border: `1px solid ${t.lineSoft}`,
    fontSize: 10,
    fontWeight: 800,
    color: t.muted,
  },

  itemPortion: { color: t.brass, fontWeight: 600 },

  orderAddress: {
    margin: "0 0 16px",
    fontSize: 11.5,
    lineHeight: 1.5,
    color: t.faint,
  },

  track: { display: "flex", alignItems: "flex-start" },

  trackSeg: { display: "flex", alignItems: "flex-start", flex: 1 },

  trackStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    minWidth: 56,
  },

  trackDot: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: t.lineSoft,
    color: t.faint,
    display: "grid",
    placeItems: "center",
    fontSize: 9,
    fontWeight: 800,
  },

  trackDotOn: { background: t.brass, color: "#fff" },

  trackLabel: { fontSize: 8.5, color: t.faint, letterSpacing: "0.04em" },

  trackLabelOn: { color: t.brass, fontWeight: 700 },

  trackLine: { flex: 1, height: 2, marginTop: 11, background: t.lineSoft },

  trackLineOn: { background: t.brass },

  tray: {
    position: "sticky",
    top: 96,
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: t.rLg,
    overflow: "hidden",
    boxShadow: "0 10px 34px rgba(18,36,30,.06)",
  },

  trayHead: {
    padding: "20px 22px",
    borderBottom: `1px solid ${t.lineSoft}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  trayTitle: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 21,
    color: t.ink,
  },

  traySub: { margin: "3px 0 0", fontSize: 11.5, color: t.faint },

  trayCount: {
    minWidth: 24,
    height: 24,
    padding: "0 7px",
    borderRadius: 20,
    background: t.brass,
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 800,
  },

  trayEmpty: { padding: "48px 26px", textAlign: "center" },

  trayEmptyMark: {
    width: 64,
    height: 64,
    margin: "0 auto 16px",
    borderRadius: "50%",
    background: t.brassSoft,
    display: "grid",
    placeItems: "center",
    fontSize: 26,
  },

  trayEmptyTitle: {
    margin: "0 0 8px",
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 17,
    color: t.ink,
  },

  trayEmptyText: {
    margin: "0 auto",
    maxWidth: 230,
    fontSize: 12,
    lineHeight: 1.6,
    color: t.faint,
  },

  trayItems: { maxHeight: 340, overflowY: "auto", padding: "4px 22px" },

  trayItem: {
    display: "flex",
    gap: 11,
    padding: "15px 0",
    borderBottom: `1px solid ${t.lineSoft}`,
  },

  trayIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 11,
    background: t.brassSoft,
    display: "grid",
    placeItems: "center",
    fontSize: 21,
  },

  trayItemName: {
    margin: 0,
    fontSize: 12.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  trayItemPrice: {
    display: "block",
    marginTop: 3,
    fontSize: 10.5,
    color: t.faint,
  },

  trayPortion: { color: t.brass, fontWeight: 700 },

  stepper: { display: "flex", alignItems: "center", gap: 7, marginTop: 8 },

  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.text,
    fontSize: 13,
    lineHeight: 1,
  },

  stepValue: {
    minWidth: 16,
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: 800,
  },

  removeBtn: {
    marginLeft: 2,
    padding: 0,
    background: "none",
    color: t.faint,
    fontSize: 10.5,
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },

  trayItemTotal: { fontSize: 12, whiteSpace: "nowrap" },

  bill: {
    padding: "18px 22px 22px",
    background: t.surfaceAlt,
    borderTop: `1px solid ${t.lineSoft}`,
  },

  billRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
    fontSize: 12.5,
    color: t.muted,
  },

  free: {
    fontSize: 10,
    fontWeight: 800,
    color: t.green,
    letterSpacing: "0.06em",
  },

  billLine: { height: 1, background: t.line, margin: "14px 0" },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: { display: "block", fontSize: 13, fontWeight: 700, color: t.text },

  totalSub: { display: "block", marginTop: 2, fontSize: 9.5, color: t.faint },

  totalAmount: { fontFamily: t.display, fontSize: 25, color: t.ink },

  placeButton: {
    width: "100%",
    marginTop: 18,
    padding: 15,
    borderRadius: 12,
    background: t.ink,
    color: "#fff",
    fontSize: 13.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  btnSpinner: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,.3)",
    borderTopColor: "#fff",
  },

  trayNote: {
    margin: "11px 0 0",
    textAlign: "center",
    fontSize: 10,
    letterSpacing: "0.04em",
    color: t.faint,
  },

  /* ---------- Checkout ---------- */

  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    background: "rgba(18,36,30,.45)",
    backdropFilter: "blur(3px)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    background: t.surface,
    borderRadius: t.rLg,
    boxShadow: "0 24px 70px rgba(0,0,0,.3)",
    overflow: "hidden",
  },

  modalHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "22px 24px 16px",
    borderBottom: `1px solid ${t.lineSoft}`,
  },

  modalTitle: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 22,
    color: t.ink,
  },

  modalSub: { margin: "4px 0 0", fontSize: 12.5, color: t.faint },

  modalClose: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: 9,
    background: t.surfaceAlt,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 12,
  },

  modalBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },

  field: { display: "block", marginBottom: 16 },

  fieldLabel: {
    display: "block",
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: t.muted,
  },

  required: { color: t.red },

  fieldHint: { display: "block", marginTop: 5, fontSize: 10.5, color: t.faint },

  fieldError: {
    display: "block",
    marginTop: 5,
    fontSize: 10.5,
    fontWeight: 600,
    color: t.red,
  },

  input: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: `1px solid ${t.line}`,
    background: t.surface,
    fontSize: 13.5,
    color: t.text,
  },

  inputError: { borderColor: t.red },

  phoneWrap: {
    display: "flex",
    alignItems: "center",
    borderRadius: 10,
    border: `1px solid ${t.line}`,
    background: t.surface,
    overflow: "hidden",
  },

  phonePrefix: {
    paddingLeft: 13,
    paddingRight: 9,
    fontSize: 13.5,
    color: t.faint,
    borderRight: `1px solid ${t.lineSoft}`,
  },

  phoneInput: {
    width: "100%",
    border: "none",
    background: "none",
    padding: "11px 13px",
    fontSize: 13.5,
    color: t.text,
    letterSpacing: "0.04em",
  },

  textarea: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: `1px solid ${t.line}`,
    background: t.surface,
    fontSize: 13.5,
    lineHeight: 1.6,
    resize: "vertical",
    fontFamily: "inherit",
    color: t.text,
  },

  summaryBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    padding: "13px 16px",
    borderRadius: 12,
    background: t.surfaceAlt,
    border: `1px solid ${t.lineSoft}`,
  },

  summaryLabel: { fontSize: 12, color: t.muted },

  summaryTotal: { fontFamily: t.display, fontSize: 20, color: t.ink },

  modalFoot: {
    display: "flex",
    gap: 10,
    padding: "16px 24px",
    borderTop: `1px solid ${t.lineSoft}`,
    background: t.surfaceAlt,
  },

  secondaryButton: {
    padding: "13px 18px",
    borderRadius: 11,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  confirmButton: {
    flex: 1,
    padding: "13px 18px",
    borderRadius: 11,
    background: t.ink,
    color: "#fff",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  /* ---------- Empty / toast ---------- */

  empty: {
    background: t.surface,
    border: `1px dashed ${t.line}`,
    borderRadius: t.rLg,
    padding: "52px 24px",
    textAlign: "center",
  },

  emptyIcon: { fontSize: 34, marginBottom: 12 },

  emptyTitle: {
    margin: "0 0 7px",
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 18,
    color: t.ink,
  },

  emptyText: {
    margin: "0 auto",
    maxWidth: 300,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: t.faint,
  },

  emptyAction: {
    marginTop: 18,
    padding: "9px 18px",
    borderRadius: 9,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 12.5,
  },

  toast: {
    position: "fixed",
    left: "50%",
    bottom: 28,
    transform: "translateX(-50%)",
    zIndex: 90,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "13px 20px",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13,
    boxShadow: "0 14px 40px rgba(0,0,0,.24)",
    maxWidth: "calc(100vw - 40px)",
  },

  toastMark: {
    width: 19,
    height: 19,
    flexShrink: 0,
    borderRadius: "50%",
    background: "rgba(255,255,255,.16)",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 800,
  },
};

export default Dashboard;