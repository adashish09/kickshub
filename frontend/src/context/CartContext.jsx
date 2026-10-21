import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  apiGetCart,
  apiAddToCart,
  apiUpdateCartItem,
  apiRemoveCartItem,
  apiClearCart,
} from '../services/api';

const CartContext = createContext(null);

const INITIAL_CART = {
  id: null,
  items: [],
  item_count: 0,
  subtotal: '0.00',
};

export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState(INITIAL_CART);
  const [loading, setLoading] = useState(false);
  const [mutatingItemId, setMutatingItemId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch cart for currently authenticated user
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(INITIAL_CART);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiGetCart();
      setCart(data);
    } catch (err) {
      // If 401 or network error, keep cart neutral
      setError(err.response?.data?.error?.message || 'Failed to load shopping cart.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Synchronize cart with authentication lifecycle:
  // When user logs in/authenticates, fetch their cart.
  // When user logs out, immediately clear private cart state.
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart(INITIAL_CART);
      setError(null);
    }
  }, [isAuthenticated, user?.id, fetchCart]);

  // Get current quantity of a specific variant in the cart
  const getVariantQuantity = useCallback(
    (variantId) => {
      if (!variantId || !cart?.items) return 0;
      const item = cart.items.find((i) => i.variant_id === variantId);
      return item ? item.quantity : 0;
    },
    [cart?.items]
  );

  // Reset cart locally (e.g. after successful order checkout)
  const resetCart = useCallback(() => {
    setCart(INITIAL_CART);
  }, []);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);

  const openDrawer = useCallback((itemData) => {
    setDrawerItem(itemData);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Add variant to cart
  const addItem = async (variantId, quantity = 1, itemMetadata = null) => {
    if (!isAuthenticated) {
      return { requiresAuth: true };
    }

    setIsAdding(true);
    setError(null);
    try {
      const data = await apiAddToCart(variantId, quantity);
      const updatedCart = data.cart || data;
      setCart(updatedCart);

      const quantityAdded = data.quantity_added ?? data.added_quantity ?? quantity;
      const variantItem = updatedCart.items?.find((i) => i.variant_id === variantId);
      const variantQuantity = data.variant_quantity ?? variantItem?.quantity ?? quantity;

      if (itemMetadata) {
        setDrawerItem({
          product: itemMetadata.product,
          variant: itemMetadata.variant,
          quantityAdded,
          variantQuantity,
        });
        setIsDrawerOpen(true);
      }

      return {
        success: true,
        cart: updatedCart,
        quantityAdded,
        variantQuantity,
        variantId,
      };
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Unable to add item to cart.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsAdding(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId, newQuantity) => {
    setMutatingItemId(itemId);
    setError(null);
    try {
      const data = await apiUpdateCartItem(itemId, newQuantity);
      const updatedCart = data.cart || data;
      setCart(updatedCart);
      return { success: true, cart: updatedCart };
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update item quantity.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setMutatingItemId(null);
    }
  };

  // Remove a single item
  const removeItem = async (itemId) => {
    setMutatingItemId(itemId);
    setError(null);
    try {
      const data = await apiRemoveCartItem(itemId);
      const updatedCart = data.cart || data;
      setCart(updatedCart);
      return { success: true, cart: updatedCart };
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to remove item.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setMutatingItemId(null);
    }
  };

  // Clear all items in current user's cart
  const clearCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClearCart();
      const updatedCart = data.cart || data;
      setCart(updatedCart);
      return { success: true, cart: updatedCart };
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to clear cart.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cart,
    items: cart.items || [],
    totalUnits: cart.item_count || 0,
    subtotal: cart.subtotal || '0.00',
    loading,
    mutatingItemId,
    isAdding,
    error,
    clearError,
    fetchCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    resetCart,
    getVariantQuantity,
    isDrawerOpen,
    drawerItem,
    openDrawer,
    closeDrawer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
