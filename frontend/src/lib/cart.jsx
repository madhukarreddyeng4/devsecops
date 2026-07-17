import { createContext, useContext, useState } from "react";

// Cart state is held in memory only (React state). This is a teaching app;
// keeping it in memory keeps the demo self-contained.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{ id, title, author, price, qty }]

  function addItem(book) {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === book.id);
      if (existing) {
        return prev.map((i) => (i.id === book.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: book.id, title: book.title, author: book.author, price: book.price, qty: 1 }];
    });
  }

  function setQty(id, qty) {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty } : i))
    );
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, setQty, removeItem, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
