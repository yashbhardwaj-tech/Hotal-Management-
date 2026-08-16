import { useState } from "react";

function Dashboard() {
  const [cart, setCart] = useState([]);

  const foods = [
    {
      id: 1,
      name: "Butter Chicken",
      description: "Creamy tomato-based chicken curry",
      price: 280,
      category: "Main Course",
      emoji: "🍗",
    },
    {
      id: 2,
      name: "Paneer Butter Masala",
      description: "Paneer cooked in rich butter gravy",
      price: 240,
      category: "Main Course",
      emoji: "🥘",
    },
    {
      id: 3,
      name: "Chicken Biryani",
      description: "Aromatic basmati rice with chicken",
      price: 320,
      category: "Rice",
      emoji: "🍛",
    },
    {
      id: 4,
      name: "Veg Biryani",
      description: "Fragrant rice with fresh vegetables",
      price: 220,
      category: "Rice",
      emoji: "🍚",
    },
    {
      id: 5,
      name: "Garlic Naan",
      description: "Soft naan topped with garlic and butter",
      price: 80,
      category: "Breads",
      emoji: "🫓",
    },
    {
      id: 6,
      name: "Fresh Lime Soda",
      description: "Refreshing lime soda",
      price: 70,
      category: "Drinks",
      emoji: "🥤",
    },
  ];

  // Add food to cart
  const addToCart = (food) => {
    const existingItem = cart.find((item) => item.id === food.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...food, quantity: 1 }]);
    }
  };

  // Increase quantity
  const increaseQuantity = (id) => {
    setCart(
      cart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // Decrease quantity
  const decreaseQuantity = (id) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Total items
  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Total price
  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Place order
  const placeOrder = () => {
    if (cart.length === 0) {
      alert("Please add some food to your cart.");
      return;
    }

    alert(`Order placed successfully! Total: ₹${totalPrice}`);

    setCart([]);
  };

  return (
    <div style={styles.page}>

      {/* ================= HEADER ================= */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>
            Hotel
            <span style={styles.logoOrange}>Kitchen</span>
          </h1>

          <p style={styles.subtitle}>
            Order your favourite food
          </p>
        </div>

        <div style={styles.userSection}>
          <div style={styles.avatar}>Y</div>

          <div>
            <p style={styles.userName}>Welcome, Yash</p>

            <p style={styles.roomNumber}>
              Room 204
            </p>
          </div>
        </div>
      </header>


      {/* ================= MAIN ================= */}
      <div style={styles.layout}>

        {/* ================= FOOD SECTION ================= */}
        <main style={styles.foodSection}>

          <div style={styles.welcomeSection}>

            <div>
              <h2 style={styles.heading}>
                What would you like to eat?
              </h2>

              <p style={styles.headingText}>
                Choose from our delicious hotel menu.
              </p>
            </div>

            <div style={styles.cartBadge}>
              🛒 {totalItems} Items
            </div>

          </div>


          {/* ================= CATEGORIES ================= */}
          <div style={styles.categories}>

            <button style={styles.activeCategory}>
              All
            </button>

            <button style={styles.category}>
              Main Course
            </button>

            <button style={styles.category}>
              Rice
            </button>

            <button style={styles.category}>
              Breads
            </button>

            <button style={styles.category}>
              Drinks
            </button>

          </div>


          {/* ================= FOOD CARDS ================= */}
          <div style={styles.foodGrid}>

            {foods.map((food) => (
              <div
                style={styles.foodCard}
                key={food.id}
              >

                <div style={styles.foodImage}>
                  <span style={styles.foodEmoji}>
                    {food.emoji}
                  </span>
                </div>

                <div style={styles.foodContent}>

                  <p style={styles.foodCategory}>
                    {food.category}
                  </p>

                  <h3 style={styles.foodName}>
                    {food.name}
                  </h3>

                  <p style={styles.foodDescription}>
                    {food.description}
                  </p>

                  <div style={styles.foodBottom}>

                    <strong style={styles.price}>
                      ₹{food.price}
                    </strong>

                    <button
                      style={styles.addButton}
                      onClick={() => addToCart(food)}
                    >
                      + Add
                    </button>

                  </div>

                </div>

              </div>
            ))}

          </div>

        </main>


        {/* ================= CART ================= */}
        <aside style={styles.cart}>

          <div style={styles.cartHeader}>

            <div>
              <h2 style={styles.cartTitle}>
                Your Cart
              </h2>

              <p style={styles.cartSubtitle}>
                {totalItems} items selected
              </p>
            </div>

            <span style={styles.cartIcon}>
              🛒
            </span>

          </div>


          {/* EMPTY CART */}
          {cart.length === 0 ? (

            <div style={styles.emptyCart}>

              <div style={styles.emptyIcon}>
                🛍️
              </div>

              <h3 style={styles.emptyTitle}>
                Your cart is empty
              </h3>

              <p style={styles.emptyText}>
                Add some delicious food to get started.
              </p>

            </div>

          ) : (

            <>

              {/* CART ITEMS */}
              <div style={styles.cartItems}>

                {cart.map((item) => (

                  <div
                    style={styles.cartItem}
                    key={item.id}
                  >

                    <div style={styles.cartItemImage}>
                      {item.emoji}
                    </div>


                    <div style={styles.cartItemInfo}>

                      <h4 style={styles.cartItemName}>
                        {item.name}
                      </h4>

                      <p style={styles.cartItemPrice}>
                        ₹{item.price}
                      </p>


                      <div style={styles.quantity}>

                        <button
                          style={styles.quantityButton}
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                        >
                          −
                        </button>

                        <span style={styles.quantityNumber}>
                          {item.quantity}
                        </span>

                        <button
                          style={styles.quantityButton}
                          onClick={() =>
                            increaseQuantity(item.id)
                          }
                        >
                          +
                        </button>

                      </div>

                    </div>


                    <strong style={styles.itemTotal}>
                      ₹{item.price * item.quantity}
                    </strong>

                  </div>

                ))}

              </div>


              {/* ================= BILL ================= */}
              <div style={styles.bill}>

                <div style={styles.billRow}>
                  <span>Subtotal</span>

                  <span>
                    ₹{totalPrice}
                  </span>
                </div>


                <div style={styles.billRow}>
                  <span>Hotel Service</span>

                  <span>
                    ₹0
                  </span>
                </div>


                <div style={styles.divider}></div>


                <div style={styles.totalRow}>

                  <strong>
                    Total
                  </strong>

                  <strong>
                    ₹{totalPrice}
                  </strong>

                </div>


                <button
                  style={styles.orderButton}
                  onClick={placeOrder}
                >
                  <span>
                    Place Order
                  </span>

                  <span>
                    →
                  </span>
                </button>

              </div>

            </>

          )}

        </aside>

      </div>

    </div>
  );
}


/* ================================================= */
/*                     STYLES                        */
/* ================================================= */

const styles = {

  page: {
    minHeight: "100vh",
    backgroundColor: "#f7f7f5",
    fontFamily: "Arial, sans-serif",
    color: "#202020",
  },


  /* HEADER */

  header: {
    height: "80px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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


  /* USER */

  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
    fontWeight: "bold",
  },

  userName: {
    margin: 0,
    fontWeight: "600",
    fontSize: "14px",
  },

  roomNumber: {
    margin: "3px 0 0",
    color: "#888888",
    fontSize: "12px",
  },


  /* MAIN LAYOUT */

  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: "30px",
    padding: "35px 45px",
    maxWidth: "1500px",
    margin: "0 auto",
  },

  foodSection: {
    minWidth: 0,
  },


  /* WELCOME */

  welcomeSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  heading: {
    margin: 0,
    fontSize: "28px",
  },

  headingText: {
    margin: "8px 0 0",
    color: "#888888",
  },

  cartBadge: {
    backgroundColor: "#fff7ed",
    color: "#c2410c",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "600",
  },


  /* CATEGORIES */

  categories: {
    display: "flex",
    gap: "10px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  activeCategory: {
    border: "none",
    backgroundColor: "#202020",
    color: "#ffffff",
    padding: "10px 20px",
    borderRadius: "25px",
    cursor: "pointer",
  },

  category: {
    border: "1px solid #dddddd",
    backgroundColor: "#ffffff",
    color: "#555555",
    padding: "10px 20px",
    borderRadius: "25px",
    cursor: "pointer",
  },


  /* FOOD GRID */

  foodGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },

  foodCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #eeeeee",
  },

  foodImage: {
    height: "150px",
    backgroundColor: "#f5f1eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  foodEmoji: {
    fontSize: "65px",
  },

  foodContent: {
    padding: "18px",
  },

  foodCategory: {
    margin: 0,
    color: "#d97706",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  foodName: {
    margin: "7px 0",
    fontSize: "18px",
  },

  foodDescription: {
    color: "#888888",
    fontSize: "13px",
    lineHeight: "1.5",
    minHeight: "40px",
  },

  foodBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "15px",
  },

  price: {
    fontSize: "18px",
  },

  addButton: {
    border: "none",
    backgroundColor: "#d97706",
    color: "#ffffff",
    padding: "9px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },


  /* CART */

  cart: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    border: "1px solid #eeeeee",
    padding: "25px",
    height: "fit-content",
    position: "sticky",
    top: "25px",
  },

  cartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "20px",
    borderBottom: "1px solid #eeeeee",
  },

  cartTitle: {
    margin: 0,
    fontSize: "22px",
  },

  cartSubtitle: {
    margin: "5px 0 0",
    color: "#888888",
    fontSize: "13px",
  },

  cartIcon: {
    fontSize: "25px",
  },


  /* EMPTY CART */

  emptyCart: {
    textAlign: "center",
    padding: "70px 20px",
    color: "#888888",
  },

  emptyIcon: {
    fontSize: "50px",
    marginBottom: "15px",
  },

  emptyTitle: {
    color: "#333333",
  },

  emptyText: {
    fontSize: "13px",
    lineHeight: "1.5",
  },


  /* CART ITEMS */

  cartItems: {
    maxHeight: "400px",
    overflowY: "auto",
    padding: "15px 0",
  },

  cartItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px 0",
    borderBottom: "1px solid #f0f0f0",
  },

  cartItemImage: {
    width: "55px",
    height: "55px",
    borderRadius: "10px",
    backgroundColor: "#f5f1eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    flexShrink: 0,
  },

  cartItemInfo: {
    flex: 1,
  },

  cartItemName: {
    margin: 0,
    fontSize: "14px",
  },

  cartItemPrice: {
    margin: "4px 0",
    color: "#888888",
    fontSize: "12px",
  },

  quantity: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "7px",
  },

  quantityButton: {
    width: "25px",
    height: "25px",
    border: "1px solid #dddddd",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    cursor: "pointer",
  },

  quantityNumber: {
    fontSize: "13px",
    fontWeight: "600",
  },

  itemTotal: {
    fontSize: "13px",
  },


  /* BILL */

  bill: {
    paddingTop: "20px",
  },

  billRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
    color: "#777777",
    fontSize: "14px",
  },

  divider: {
    height: "1px",
    backgroundColor: "#eeeeee",
    margin: "15px 0",
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "19px",
  },

  orderButton: {
    width: "100%",
    border: "none",
    backgroundColor: "#202020",
    color: "#ffffff",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "20px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
};

export default Dashboard;