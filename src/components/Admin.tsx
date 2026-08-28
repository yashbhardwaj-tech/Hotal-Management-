import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { NewOrderAlert, type AlertOrder } from "./Neworderalert";
import { BrandMark } from "./Brand";
import { PortionEditor } from "./Portioneditor";
import { getPortions, type Portion } from "../utils/portions";
import { t, globalCss, inr, emojiFor, FOOD_CATEGORIES } from "../theme";

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
    portions?: Portion[];
};

type OrderItem = {
    foodId: string;
    name: string;
    price: number;
    quantity: number;
    portion?: string;
};

type Customer = {
    name?: string;
    phone?: string;
    address?: string;
    landmark?: string;
};

type Order = {
    id: string;
    userId?: string;
    userName?: string;
    customer?: Customer;
    items: OrderItem[];
    total: number;
    status: string;
    createdAt?: { seconds: number; nanoseconds: number };
};

type OrderStatus = "Pending" | "Preparing" | "Ready" | "Delivered";

type Toast = { message: string; tone: "success" | "error" };

type Tab = "menu" | "orders";

const ORDER_STATUSES: OrderStatus[] = [
    "Pending",
    "Preparing",
    "Ready",
    "Delivered",
];

/* =========================================================
   ADMIN
========================================================= */

function Admin() {
    const navigate = useNavigate();

    /* ---- form ---- */
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("");
    const [available, setAvailable] = useState(true);
    const [hasSizes, setHasSizes] = useState(false);
    const [portions, setPortions] = useState<Portion[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingFood, setSavingFood] = useState(false);
    const [formOpen, setFormOpen] = useState(false);

    /* ---- data ---- */
    const [foods, setFoods] = useState<Food[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingFoods, setLoadingFoods] = useState(true);
    const [loadingOrders, setLoadingOrders] = useState(true);

    /* ---- ui ---- */
    const [searchParams, setSearchParams] = useSearchParams();

    const tab: Tab = searchParams.get("tab") === "orders" ? "orders" : "menu";

    const setTab = useCallback(
        (next: Tab) => {
            const params = new URLSearchParams(searchParams);
            params.set("tab", next);
            setSearchParams(params, { replace: true });
        },
        [searchParams, setSearchParams],
    ); const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [orderFilter, setOrderFilter] = useState<"Active" | "All" | OrderStatus>(
        "Active",
    );
    const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Food | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    const [soundEnabled, setSoundEnabled] = useState(
        () => localStorage.getItem("hk_alert_sound") !== "off",
    );

    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const formRef = useRef<HTMLDivElement | null>(null);

    /* Orders already on the board when this tab opened must not
       set off the alarm — only genuinely new ones do. */

    const showToast = useCallback(
        (message: string, tone: Toast["tone"] = "success") => {
            setToast({ message, tone });
            clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), 2800);
        },
        [],
    );

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    /* =======================================================
       LIVE DATA — replaces the one-shot getDocs, so two staff
       members on two devices see the same board.
    ======================================================= */

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, "foods"),
            (snapshot) => {
                setFoods(
                    snapshot.docs.map((d) => {
                        const data = d.data();

                        return {
                            id: d.id,
                            Name: String(data.Name || ""),
                            description: String(data.description || ""),
                            price: Number(data.price || 0),
                            category: String(data.category || ""),
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
                showToast("Couldn't load the menu.", "error");
            },
        );

        return () => unsubscribe();
    }, [showToast]);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, "orders"),
            (snapshot) => {
                const data: Order[] = snapshot.docs.map((d) => {
                    const raw = d.data();

                    const items: OrderItem[] = Array.isArray(raw.items)
                        ? raw.items.map((entry: unknown) => {
                            const item = entry as Record<string, unknown>;

                            return {
                                foodId: String(item.foodId || ""),
                                name: String(item.name || ""),
                                price: Number(item.price || 0),
                                quantity: Number(item.quantity || 0),
                                portion: item.portion
                                    ? String(item.portion)
                                    : undefined,
                            };
                        })
                        : [];

                    return {
                        id: d.id,
                        userId: raw.userId ? String(raw.userId) : undefined,
                        userName: raw.userName ? String(raw.userName) : undefined,
                        customer: (raw.customer as Customer | undefined) ?? undefined,
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
                console.error("Error loading orders:", error);
                setLoadingOrders(false);
            },
        );

        return () => unsubscribe();
    }, []);

    /* =======================================================
       DERIVED
    ======================================================= */

    const categories = useMemo(() => {
        const unique = [
            ...new Set(foods.map((f) => f.category).filter((c) => c.trim() !== "")),
        ].sort();

        return ["All", ...unique];
    }, [foods]);

    const filteredFoods = useMemo(() => {
        const term = search.trim().toLowerCase();

        return foods
            .filter((f) =>
                selectedCategory === "All" ? true : f.category === selectedCategory,
            )
            .filter((f) =>
                !term
                    ? true
                    : f.Name.toLowerCase().includes(term) ||
                    f.category.toLowerCase().includes(term),
            );
    }, [foods, search, selectedCategory]);

    const filteredOrders = useMemo(() => {
        if (orderFilter === "All") return orders;

        if (orderFilter === "Active") {
            return orders.filter((o) => o.status !== "Delivered");
        }

        return orders.filter((o) => o.status === orderFilter);
    }, [orders, orderFilter]);

    const availableCount = foods.filter((f) => f.available).length;

    const activeOrders = orders.filter((o) => o.status !== "Delivered").length;

    const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;

    /* Revenue counts delivered orders only — billing for food that
       never left the kitchen inflates the number. */
    const revenue = orders
        .filter((o) => o.status === "Delivered")
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

    /* Every unaccepted order raises the alert, whenever it arrived.
   Pending means nobody has acknowledged it yet. */
    const pendingAlerts: AlertOrder[] = useMemo(
        () =>
            orders
                .filter((order) => order.status === "Pending")
                .map((order) => ({
                    id: order.id,
                    userName: order.customer?.name || order.userName,
                    total: order.total,
                    items: order.items,
                    customer: order.customer,
                })),
        [orders],
    );

    /* =======================================================
       ORDER STATUS
    ======================================================= */

    const updateOrderStatus = useCallback(
        async (orderId: string, status: OrderStatus): Promise<void> => {
            setUpdatingOrder(orderId);

            try {
                await updateDoc(doc(db, "orders", orderId), { status });
                showToast(`Order #${orderId.slice(-6).toUpperCase()} → ${status}`);
            } catch (error) {
                console.error("Error updating order status:", error);
                showToast("Couldn't update the order.", "error");
            } finally {
                setUpdatingOrder(null);
            }
        },
        [showToast],
    );

    /* Accepting moves the order out of Pending, which is what
       clears it from the alert queue. */
    const handleAcceptOrder = useCallback(
        async (orderId: string): Promise<void> => {
            await updateOrderStatus(orderId, "Preparing");
        },
        [updateOrderStatus],
    );

    /* =======================================================
       FORM
    ======================================================= */

    const resetForm = () => {
        setName("");
        setDescription("");
        setPrice("");
        setCategory("");
        setAvailable(true);
        setHasSizes(false);
        setPortions([]);
        setEditingId(null);
    };

    const openNewForm = () => {
        resetForm();
        setFormOpen(true);
        setTab("menu");

        requestAnimationFrame(() =>
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    };

    const handleEdit = (food: Food) => {
        const existing = getPortions(food);

        setEditingId(food.id);
        setName(food.Name);
        setDescription(food.description);
        setPrice(String(food.price));
        setCategory(food.category);
        setAvailable(food.available);
        setHasSizes(existing.length > 0);
        setPortions(existing);
        setFormOpen(true);

        requestAnimationFrame(() =>
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (!name.trim()) {
            showToast("Give the dish a name.", "error");
            return;
        }

        if (!category.trim()) {
            showToast("Pick a category.", "error");
            return;
        }

        /* Sized dishes are priced per size, so the single price
           field is only required when sizes are off. */
        const validPortions = portions.filter(
            (portion) => portion.label.trim() && Number(portion.price) > 0,
        );

        if (hasSizes) {
            if (validPortions.length < 2) {
                showToast("Give at least two sizes a name and a price.", "error");
                return;
            }
        } else if (!price || Number(price) <= 0) {
            showToast("Enter a price above zero.", "error");
            return;
        }

        setSavingFood(true);

        try {
            const payload = {
                Name: name.trim(),
                description: description.trim(),
                /* Cheapest size, so anything reading `price` still
                   shows a sensible "from" figure. */
                price: hasSizes
                    ? Math.min(...validPortions.map((portion) => Number(portion.price)))
                    : Number(price),
                category: category.trim(),
                available,
                portions: hasSizes
                    ? validPortions.map((portion) => ({
                        label: portion.label.trim(),
                        price: Number(portion.price),
                    }))
                    : [],
            };

            if (editingId) {
                await updateDoc(doc(db, "foods", editingId), payload);
                showToast(`${payload.Name} updated.`);
            } else {
                await addDoc(collection(db, "foods"), payload);
                showToast(`${payload.Name} added to the menu.`);
            }

            resetForm();
            setFormOpen(false);
        } catch (error) {
            console.error("Error saving food:", error);
            showToast("Couldn't save the dish. Try again.", "error");
        } finally {
            setSavingFood(false);
        }
    };

    /* =======================================================
       DELETE
    ======================================================= */

    const confirmDelete = async () => {
        if (!pendingDelete) return;

        setDeleting(true);

        try {
            await deleteDoc(doc(db, "foods", pendingDelete.id));
            showToast(`${pendingDelete.Name} removed.`);
            setPendingDelete(null);
        } catch (error) {
            console.error("Error deleting food:", error);
            showToast("Couldn't remove the dish.", "error");
        } finally {
            setDeleting(false);
        }
    };

    /* ---- quick availability toggle straight from the list ---- */
    const toggleAvailability = async (food: Food) => {
        try {
            await updateDoc(doc(db, "foods", food.id), { available: !food.available });
        } catch (error) {
            console.error("Error toggling availability:", error);
            showToast("Couldn't change availability.", "error");
        }
    };

    const formatDate = (
        timestamp: { seconds: number; nanoseconds: number } | undefined,
    ): string => {
        if (!timestamp?.seconds) return "Just now";

        return new Date(timestamp.seconds * 1000).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    /* =======================================================
       RENDER
    ======================================================= */

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
                        <span style={s.liveChip}>
                            <span style={s.livePulse} />
                            Live
                        </span>

                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={s.ghostButton}
                            onClick={() => navigate("/")}
                        >
                            Guest view
                        </button>

                        <button
                            type="button"
                            className="btn btn-brass"
                            style={s.addButton}
                            onClick={openNewForm}
                        >
                            + New dish
                        </button>
                    </div>
                </div>
            </header>

            <main className="pad" style={s.main}>
                {/* ================= TITLE ================= */}

                <div style={s.pageHead}>
                    <div>
                        <span style={s.eyebrow}>OPERATIONS</span>
                        <h2 style={s.pageTitle}>Service Board</h2>
                        <p style={s.pageSub}>
                            The menu guests see and the orders coming out of it.
                        </p>
                    </div>
                </div>

                {/* ================= STATS ================= */}

                <section className="stats-grid" style={s.stats}>
                    <Stat
                        label="On the menu"
                        value={String(foods.length)}
                        note={`${availableCount} available · ${foods.length - availableCount} hidden`}
                    />
                    <Stat
                        label="Active orders"
                        value={String(activeOrders)}
                        note={activeOrders > 0 ? "Needs attention" : "All clear"}
                        accent={activeOrders > 0}
                    />
                    <Stat
                        label="Delivered"
                        value={String(deliveredOrders)}
                        note={`${orders.length} orders all time`}
                    />
                    <Stat
                        label="Revenue"
                        value={inr(revenue)}
                        note="From delivered orders"
                    />
                </section>

                {/* ================= TABS ================= */}

                <div style={s.tabs}>
                    <TabButton
                        active={tab === "menu"}
                        onClick={() => setTab("menu")}
                        label="Menu"
                        count={foods.length}
                    />
                    <TabButton
                        active={tab === "orders"}
                        onClick={() => setTab("orders")}
                        label="Orders"
                        count={activeOrders}
                        urgent={activeOrders > 0}
                    />
                </div>

                {/* ================= MENU TAB ================= */}

                {tab === "menu" && (
                    <>
                        <div ref={formRef}>
                            {formOpen ? (
                                <section className="fade-up" style={s.panel}>
                                    <div style={s.panelHead}>
                                        <div>
                                            <h3 style={s.panelTitle}>
                                                {editingId ? "Edit dish" : "Add a dish"}
                                            </h3>
                                            <p style={s.panelSub}>
                                                {editingId
                                                    ? "Changes appear on the guest menu immediately."
                                                    : "It goes live as soon as you save it as available."}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() => {
                                                resetForm();
                                                setFormOpen(false);
                                            }}
                                            style={s.closeButton}
                                            aria-label="Close form"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit}>
                                        <div className="form-grid" style={s.formGrid}>
                                            <Field label="Dish name">
                                                <input
                                                    className="inp"
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Paneer Butter Masala"
                                                    style={s.input}
                                                />
                                            </Field>

                                            <Field
                                                label={hasSizes ? "Price (set per size below)" : "Price"}
                                            >
                                                <div
                                                    style={{
                                                        ...s.priceWrap,
                                                        opacity: hasSizes ? 0.5 : 1,
                                                    }}
                                                >
                                                    <span style={s.priceSymbol}>₹</span>
                                                    <input
                                                        className="inp"
                                                        type="number"
                                                        min="0"
                                                        disabled={hasSizes}
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        placeholder="60"
                                                        style={s.priceInput}
                                                    />
                                                </div>
                                            </Field>

                                            <Field label="Category">
                                                <select
                                                    className="inp"
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    style={s.input}
                                                >
                                                    <option value="">Select a category</option>
                                                    {FOOD_CATEGORIES.map((c) => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>

                                            <Field label="Availability">
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => setAvailable((v) => !v)}
                                                    style={{
                                                        ...s.toggle,
                                                        ...(available ? s.toggleOn : s.toggleOff),
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            ...s.toggleKnob,
                                                            background: available ? t.green : t.faint,
                                                        }}
                                                    />
                                                    {available
                                                        ? "Guests can order this"
                                                        : "Hidden from guests"}
                                                </button>
                                            </Field>
                                        </div>

                                        <Field label="Description">
                                            <textarea
                                                className="inp"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Cottage cheese in a rich tomato and cashew gravy."
                                                rows={3}
                                                style={s.textarea}
                                            />
                                        </Field>

                                        {/* ---- Half / full sizes ---- */}
                                        <div style={{ marginBottom: 16 }}>
                                            <PortionEditor
                                                enabled={hasSizes}
                                                portions={portions}
                                                basePrice={price}
                                                onToggle={setHasSizes}
                                                onChange={setPortions}
                                            />
                                        </div>

                                        <div style={s.formActions}>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => {
                                                    resetForm();
                                                    setFormOpen(false);
                                                }}
                                                style={s.secondaryButton}
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={savingFood}
                                                style={s.primaryButton}
                                            >
                                                {savingFood ? (
                                                    <>
                                                        <span className="spin" style={s.btnSpinner} />
                                                        Saving…
                                                    </>
                                                ) : (
                                                    <>
                                                        {editingId ? "Save changes" : "Add to menu"}
                                                        <span style={{ fontSize: 16 }}>→</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </section>
                            ) : (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={openNewForm}
                                    style={s.addStrip}
                                >
                                    <span style={s.addStripPlus}>+</span>
                                    Add a dish to the menu
                                </button>
                            )}
                        </div>

                        <section style={s.panel}>
                            <div style={s.panelHead}>
                                <div>
                                    <h3 style={s.panelTitle}>Menu items</h3>
                                    <p style={s.panelSub}>
                                        {filteredFoods.length} of {foods.length} shown
                                    </p>
                                </div>

                                <div style={s.filterRow}>
                                    <div style={s.searchBox}>
                                        <span style={s.searchIcon}>⌕</span>
                                        <input
                                            className="inp"
                                            type="search"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search dishes"
                                            style={s.searchInput}
                                        />
                                    </div>

                                    <select
                                        className="inp"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        style={s.filterSelect}
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {loadingFoods ? (
                                <SkeletonRows />
                            ) : filteredFoods.length === 0 ? (
                                <Empty
                                    icon="🍽️"
                                    title={search ? "No dish matches that" : "The menu is empty"}
                                    text={
                                        search
                                            ? "Try a different name, or clear the filters."
                                            : "Add your first dish and it will show up here."
                                    }
                                />
                            ) : (
                                <div>
                                    {filteredFoods.map((food) => {
                                        const sizes = getPortions(food);

                                        return (
                                            <div
                                                key={food.id}
                                                className="row-hover food-row"
                                                style={s.foodRow}
                                            >
                                                <div style={s.foodIcon}>{emojiFor(food)}</div>

                                                <div style={{ minWidth: 0, gridArea: "info" }}>
                                                    <div style={s.foodNameRow}>
                                                        <h4 style={s.foodName}>{food.Name}</h4>

                                                        <button
                                                            type="button"
                                                            className="btn"
                                                            onClick={() => toggleAvailability(food)}
                                                            title="Click to toggle"
                                                            style={{
                                                                ...s.availPill,
                                                                ...(food.available ? s.availOn : s.availOff),
                                                            }}
                                                        >
                                                            {food.available ? "● Available" : "○ Hidden"}
                                                        </button>

                                                        {sizes.map((size) => (
                                                            <span key={size.label} style={s.sizePill}>
                                                                {size.label} {inr(size.price)}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <p style={s.foodDesc}>
                                                        {food.description || "No description added."}
                                                    </p>

                                                    <span style={s.foodCat}>
                                                        {food.category || "Uncategorised"}
                                                    </span>
                                                </div>

                                                <strong style={s.foodPrice}>
                                                    {sizes.length > 0 ? "from " : ""}
                                                    {inr(food.price)}
                                                </strong>

                                                <div style={s.rowActions}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => handleEdit(food)}
                                                        style={s.rowBtn}
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-danger"
                                                        onClick={() => setPendingDelete(food)}
                                                        style={{
                                                            ...s.rowBtn,
                                                            color: t.red,
                                                            borderColor: "#EBD3D0",
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* ================= ORDERS TAB ================= */}

                {tab === "orders" && (
                    <section style={s.panel}>
                        <div style={s.panelHead}>
                            <div>
                                <h3 style={s.panelTitle}>Order queue</h3>
                                <p style={s.panelSub}>
                                    Newest first · updates live from the guest app
                                </p>
                            </div>

                            <div style={s.filterRow}>
                                {(["Active", ...ORDER_STATUSES, "All"] as const).map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        className="btn"
                                        onClick={() => setOrderFilter(f)}
                                        style={{
                                            ...s.chip,
                                            ...(orderFilter === f ? s.chipOn : {}),
                                        }}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingOrders ? (
                            <SkeletonRows />
                        ) : filteredOrders.length === 0 ? (
                            <Empty
                                icon="🧾"
                                title="Nothing in this queue"
                                text="Orders placed by guests land here the moment they're sent."
                            />
                        ) : (
                            <div style={s.orderList}>
                                {filteredOrders.map((order) => (
                                    <OrderRow
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
                )}
            </main>

            {/* ================= CONFIRM DELETE ================= */}

            {pendingDelete && (
                <div
                    style={s.backdrop}
                    onClick={() => !deleting && setPendingDelete(null)}
                    role="presentation"
                >
                    <div
                        className="fade-up"
                        style={s.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="del-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={s.modalIcon}>⚠</div>

                        <h3 id="del-title" style={s.modalTitle}>
                            Remove {pendingDelete.Name}?
                        </h3>

                        <p style={s.modalText}>
                            This deletes the dish permanently. Guests with it already in their
                            tray will still be able to order it until they refresh. To take it
                            off the menu without deleting, mark it hidden instead.
                        </p>

                        <div style={s.modalActions}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setPendingDelete(null)}
                                disabled={deleting}
                                style={s.secondaryButton}
                            >
                                Keep it
                            </button>

                            <button
                                type="button"
                                className="btn"
                                onClick={confirmDelete}
                                disabled={deleting}
                                style={s.dangerButton}
                            >
                                {deleting ? "Removing…" : "Remove dish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= NEW ORDER ALERT ================= */}

            <NewOrderAlert
                orders={pendingAlerts}
                onAccept={handleAcceptOrder}
                soundEnabled={soundEnabled}
                onToggleSound={(next) => {
                    setSoundEnabled(next);
                    localStorage.setItem("hk_alert_sound", next ? "on" : "off");
                }}
            />

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
   SUB-COMPONENTS
========================================================= */

function Stat({
    label,
    value,
    note,
    accent,
}: {
    label: string;
    value: string;
    note: string;
    accent?: boolean;
}) {
    return (
        <div style={s.statCard}>
            <span style={s.statLabel}>{label}</span>

            <strong style={{ ...s.statValue, color: accent ? t.brass : t.ink }}>
                {value}
            </strong>

            <span style={s.statNote}>{note}</span>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    label,
    count,
    urgent,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    urgent?: boolean;
}) {
    return (
        <button
            type="button"
            className="btn"
            onClick={onClick}
            style={{ ...s.tab, ...(active ? s.tabOn : {}) }}
        >
            {label}
            <span
                style={{
                    ...s.tabCount,
                    background: urgent && !active ? t.brass : active ? t.brass : t.lineSoft,
                    color: urgent || active ? "#fff" : t.muted,
                }}
            >
                {count}
            </span>
        </button>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label style={s.field}>
            <span style={s.label}>{label}</span>
            {children}
        </label>
    );
}

function OrderRow({
    order,
    updating,
    onStatusChange,
    formatDate,
}: {
    order: Order;
    updating: boolean;
    onStatusChange: (id: string, status: OrderStatus) => Promise<void>;
    formatDate: (ts: Order["createdAt"]) => string;
}) {
    const status = order.status as OrderStatus;
    const index = ORDER_STATUSES.indexOf(status);
    const next =
        index >= 0 && index < ORDER_STATUSES.length - 1
            ? ORDER_STATUSES[index + 1]
            : null;

    return (
        <article style={s.orderCard}>
            <div style={s.orderTop}>
                <div style={{ minWidth: 0 }}>
                    <div style={s.orderMeta}>
                        <span style={s.orderNo}>#{order.id.slice(-6).toUpperCase()}</span>
                        <span style={s.orderDate}>{formatDate(order.createdAt)}</span>
                    </div>

                    <h4 style={s.orderGuest}>
                        {order.customer?.name || order.userName || "Hotel guest"}
                    </h4>

                    {order.customer?.phone ? (
                        <a href={`tel:${order.customer.phone}`} style={s.orderPhone}>
                            {order.customer.phone}
                        </a>
                    ) : (
                        <span style={s.orderRoom}>No phone on this order</span>
                    )}
                </div>

                <div style={s.orderRight}>
                    <strong style={s.orderAmount}>{inr(order.total)}</strong>

                    <div style={s.orderControls}>
                        {next && (
                            <button
                                type="button"
                                className="btn btn-brass"
                                disabled={updating}
                                onClick={() => onStatusChange(order.id, next)}
                                style={s.advanceButton}
                            >
                                {updating ? "…" : `Mark ${next}`}
                            </button>
                        )}

                        <select
                            className="inp"
                            value={status}
                            disabled={updating}
                            onChange={(e) =>
                                void onStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            style={{ ...s.statusSelect, ...statusTone(status) }}
                        >
                            {ORDER_STATUSES.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Delivery address — the kitchen can't send it anywhere without this */}
            {order.customer?.address && (
                <div style={s.deliveryBox}>
                    <span style={s.deliveryLabel}>DELIVER TO</span>

                    <p style={s.deliveryText}>
                        {order.customer.address}
                        {order.customer.landmark && (
                            <>
                                <br />
                                <span style={s.landmark}>
                                    Landmark: {order.customer.landmark}
                                </span>
                            </>
                        )}
                    </p>
                </div>
            )}

            <div style={s.orderItems}>
                {order.items.map((item, i) => (
                    <div key={`${item.foodId}-${i}`} style={s.orderItem}>
                        <span style={s.orderQty}>{item.quantity}×</span>

                        <span style={{ flex: 1 }}>
                            {item.name}
                            {item.portion && (
                                <span style={s.itemPortion}> · {item.portion}</span>
                            )}
                        </span>

                        <strong>{inr(item.price * item.quantity)}</strong>
                    </div>
                ))}
            </div>
        </article>
    );
}

function SkeletonRows() {
    return (
        <div>
            {[0, 1, 2].map((i) => (
                <div key={i} style={s.skelRow}>
                    <div className="skel" style={{ width: 48, height: 48, borderRadius: 12 }} />
                    <div style={{ flex: 1 }}>
                        <div className="skel" style={{ height: 12, width: "30%" }} />
                        <div className="skel" style={{ height: 10, width: "55%", marginTop: 9 }} />
                    </div>
                    <div className="skel" style={{ width: 70, height: 16 }} />
                </div>
            ))}
        </div>
    );
}

function Empty({
    icon,
    title,
    text,
}: {
    icon: string;
    title: string;
    text: string;
}) {
    return (
        <div style={s.empty}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
            <h4 style={s.emptyTitle}>{title}</h4>
            <p style={s.emptyText}>{text}</p>
        </div>
    );
}

function statusTone(status: OrderStatus): React.CSSProperties {
    switch (status) {
        case "Preparing":
            return { background: t.blueSoft, color: t.blue, borderColor: "#CFE0EE" };
        case "Ready":
            return { background: t.greenSoft, color: t.green, borderColor: "#CDE3D7" };
        case "Delivered":
            return { background: "#EDEFEC", color: t.muted, borderColor: t.line };
        default:
            return { background: t.amberSoft, color: t.amber, borderColor: "#EEDCB8" };
    }
}

/* =========================================================
   STYLES
========================================================= */

const s: Record<string, React.CSSProperties> = {
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
        background: "rgba(247,244,237,.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${t.line}`,
    },

    headerInner: {
        maxWidth: 1400,
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

    headerRight: { display: "flex", alignItems: "center", gap: 10 },

    liveChip: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: 20,
        background: t.greenSoft,
        color: t.green,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    },

    livePulse: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: t.green,
    },

    ghostButton: {
        height: 38,
        padding: "0 15px",
        borderRadius: 10,
        background: t.surface,
        border: `1px solid ${t.line}`,
        color: t.muted,
        fontSize: 12.5,
    },

    addButton: {
        height: 38,
        padding: "0 17px",
        borderRadius: 10,
        background: t.brass,
        color: "#fff",
        fontSize: 12.5,
    },

    main: { maxWidth: 1400, margin: "0 auto", padding: "30px 34px 70px" },

    pageHead: { marginBottom: 24 },

    eyebrow: {
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.24em",
        color: t.brass,
    },

    pageTitle: {
        margin: "10px 0 6px",
        fontFamily: t.display,
        fontWeight: 400,
        fontSize: 32,
        letterSpacing: "-0.02em",
        color: t.ink,
    },

    pageSub: { margin: 0, fontSize: 13, color: t.faint },

    /* ---------- Stats ---------- */

    stats: {
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
        gap: 14,
        marginBottom: 28,
    },

    statCard: {
        background: t.surface,
        border: `1px solid ${t.lineSoft}`,
        borderRadius: t.r,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },

    statLabel: {
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: t.faint,
    },

    statValue: {
        fontFamily: t.display,
        fontWeight: 400,
        fontSize: 30,
        lineHeight: 1,
        letterSpacing: "-0.02em",
    },

    statNote: { fontSize: 11, color: t.faint },

    /* ---------- Tabs ---------- */

    tabs: {
        display: "flex",
        gap: 8,
        marginBottom: 18,
        borderBottom: `1px solid ${t.line}`,
    },

    tab: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 4px",
        marginBottom: -1,
        background: "none",
        border: "none",
        borderBottom: "2px solid transparent",
        color: t.faint,
        fontSize: 14,
        marginRight: 18,
    },

    tabOn: { color: t.ink, borderBottomColor: t.brass },

    tabCount: {
        minWidth: 20,
        padding: "2px 7px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 800,
    },

    /* ---------- Panels ---------- */

    panel: {
        background: t.surface,
        border: `1px solid ${t.lineSoft}`,
        borderRadius: t.rLg,
        padding: 24,
        marginBottom: 20,
    },

    panelHead: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 18,
    },

    panelTitle: {
        margin: 0,
        fontFamily: t.display,
        fontWeight: 400,
        fontSize: 21,
        color: t.ink,
    },

    panelSub: { margin: "4px 0 0", fontSize: 12, color: t.faint },

    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 9,
        background: t.surfaceAlt,
        border: `1px solid ${t.line}`,
        color: t.muted,
        fontSize: 13,
    },

    addStrip: {
        width: "100%",
        padding: "18px",
        marginBottom: 20,
        borderRadius: t.rLg,
        background: t.surface,
        border: `1px dashed ${t.line}`,
        color: t.muted,
        fontSize: 13.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },

    addStripPlus: {
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: t.brassSoft,
        color: t.brass,
        display: "grid",
        placeItems: "center",
        fontSize: 15,
        fontWeight: 700,
    },

    /* ---------- Form ---------- */

    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
        gap: 16,
    },

    field: { display: "block", marginBottom: 16 },

    label: {
        display: "block",
        marginBottom: 7,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: t.muted,
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

    priceWrap: {
        display: "flex",
        alignItems: "center",
        borderRadius: 10,
        border: `1px solid ${t.line}`,
        background: t.surface,
        overflow: "hidden",
    },

    priceSymbol: {
        paddingLeft: 13,
        color: t.faint,
        fontSize: 13.5,
    },

    priceInput: {
        width: "100%",
        border: "none",
        background: "none",
        padding: "11px 10px",
        fontSize: 13.5,
        color: t.text,
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

    toggle: {
        width: "100%",
        height: 44,
        padding: "0 14px",
        borderRadius: 10,
        border: `1px solid ${t.line}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12.5,
    },

    toggleOn: { background: t.greenSoft, borderColor: "#CDE3D7", color: t.green },

    toggleOff: { background: t.surfaceAlt, color: t.muted },

    toggleKnob: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
    },

    formActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 6,
    },

    secondaryButton: {
        padding: "12px 20px",
        borderRadius: 10,
        background: t.surface,
        border: `1px solid ${t.line}`,
        color: t.muted,
        fontSize: 13,
    },

    primaryButton: {
        padding: "12px 22px",
        borderRadius: 10,
        background: t.ink,
        color: "#fff",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 10,
    },

    dangerButton: {
        padding: "12px 20px",
        borderRadius: 10,
        background: t.red,
        color: "#fff",
        fontSize: 13,
    },

    btnSpinner: {
        width: 13,
        height: 13,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,.3)",
        borderTopColor: "#fff",
    },

    /* ---------- Filters ---------- */

    filterRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },

    searchBox: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 10,
        padding: "0 12px",
        width: 200,
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

    filterSelect: {
        padding: "9px 12px",
        borderRadius: 10,
        border: `1px solid ${t.line}`,
        background: t.surface,
        fontSize: 13,
        color: t.text,
        minWidth: 140,
    },

    chip: {
        padding: "7px 13px",
        borderRadius: 8,
        background: t.surface,
        border: `1px solid ${t.line}`,
        color: t.muted,
        fontSize: 12,
    },

    chipOn: { background: t.ink, borderColor: t.ink, color: "#fff" },

    /* ---------- Food rows ---------- */

    foodRow: {
        display: "grid",
        gridTemplateColumns: "56px minmax(0,1fr) 130px auto",
        gridTemplateAreas: '"icon info price act"',
        alignItems: "center",
        gap: 16,
        padding: "14px 12px",
        margin: "0 -12px",
        borderRadius: 12,
        borderBottom: `1px solid ${t.lineSoft}`,
    },

    foodIcon: {
        gridArea: "icon",
        width: 50,
        height: 50,
        borderRadius: 13,
        background: t.brassSoft,
        display: "grid",
        placeItems: "center",
        fontSize: 24,
    },

    foodNameRow: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        flexWrap: "wrap",
    },

    foodName: {
        margin: 0,
        fontSize: 14.5,
        fontWeight: 700,
        color: t.ink,
    },

    availPill: {
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.05em",
        border: "1px solid transparent",
    },

    availOn: { background: t.greenSoft, color: t.green },

    availOff: { background: t.surfaceAlt, color: t.faint },

    sizePill: {
        padding: "3px 8px",
        borderRadius: 6,
        background: t.brassSoft,
        color: t.brass,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.03em",
    },

    foodDesc: {
        margin: "5px 0",
        fontSize: 11.5,
        color: t.faint,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },

    foodCat: {
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: t.brass,
    },

    foodPrice: {
        gridArea: "price",
        fontFamily: t.display,
        fontSize: 18,
        textAlign: "right",
        color: t.ink,
    },

    rowActions: { gridArea: "act", display: "flex", gap: 7 },

    rowBtn: {
        padding: "8px 13px",
        borderRadius: 9,
        background: t.surface,
        border: `1px solid ${t.line}`,
        color: t.muted,
        fontSize: 11.5,
    },

    skelRow: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        borderBottom: `1px solid ${t.lineSoft}`,
    },

    /* ---------- Orders ---------- */

    orderList: { display: "flex", flexDirection: "column", gap: 13 },

    orderCard: {
        border: `1px solid ${t.lineSoft}`,
        borderRadius: t.r,
        padding: 18,
        background: t.surface,
    },

    orderTop: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 18,
        flexWrap: "wrap",
    },

    orderMeta: { display: "flex", alignItems: "center", gap: 9 },

    orderNo: {
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.08em",
        color: t.muted,
    },

    orderDate: { fontSize: 10.5, color: t.faint },

    orderGuest: {
        margin: "7px 0 3px",
        fontFamily: t.display,
        fontWeight: 400,
        fontSize: 17,
        color: t.ink,
    },

    orderRoom: { fontSize: 10.5, color: t.faint },

    orderPhone: {
        fontSize: 11.5,
        fontWeight: 600,
        color: t.brass,
        textDecoration: "none",
    },

    orderRight: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 9,
    },

    orderAmount: { fontFamily: t.display, fontSize: 21, color: t.ink },

    orderControls: { display: "flex", alignItems: "center", gap: 8 },

    advanceButton: {
        padding: "8px 13px",
        borderRadius: 9,
        background: t.brass,
        color: "#fff",
        fontSize: 11.5,
    },

    statusSelect: {
        padding: "8px 10px",
        borderRadius: 9,
        border: "1px solid",
        fontSize: 11,
        fontWeight: 800,
        cursor: "pointer",
    },

    deliveryBox: {
        marginTop: 14,
        padding: "11px 14px",
        borderRadius: 10,
        background: t.surfaceAlt,
        border: `1px solid ${t.lineSoft}`,
    },

    deliveryLabel: {
        display: "block",
        marginBottom: 5,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.16em",
        color: t.faint,
    },

    deliveryText: {
        margin: 0,
        fontSize: 12.5,
        lineHeight: 1.55,
        color: t.text,
        whiteSpace: "pre-line",
    },

    landmark: { color: t.muted, fontSize: 11.5 },

    orderItems: {
        marginTop: 15,
        paddingTop: 12,
        borderTop: `1px solid ${t.lineSoft}`,
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

    /* ---------- Empty ---------- */

    empty: {
        padding: "48px 20px",
        textAlign: "center",
        border: `1px dashed ${t.line}`,
        borderRadius: t.r,
    },

    emptyTitle: {
        margin: "0 0 7px",
        fontFamily: t.display,
        fontWeight: 400,
        fontSize: 17,
        color: t.ink,
    },

    emptyText: {
        margin: "0 auto",
        maxWidth: 320,
        fontSize: 12.5,
        lineHeight: 1.6,
        color: t.faint,
    },

    /* ---------- Modal ---------- */

    backdrop: {
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(18,36,30,.42)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
    },

    modal: {
        width: "100%",
        maxWidth: 400,
        background: t.surface,
        borderRadius: t.rLg,
        padding: 26,
        boxShadow: "0 24px 70px rgba(0,0,0,.28)",
    },

    modalIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        background: t.redSoft,
        color: t.red,
        display: "grid",
        placeItems: "center",
        fontSize: 19,
        marginBottom: 16,
    },

    modalTitle: {
        margin: "0 0 9px",
        fontFamily: t.display,
        fontWeight: 400,
        fontSize: 21,
        color: t.ink,
    },

    modalText: {
        margin: "0 0 22px",
        fontSize: 13,
        lineHeight: 1.65,
        color: t.muted,
    },

    modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },

    /* ---------- Toast ---------- */

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

export default Admin;