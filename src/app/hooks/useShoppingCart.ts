import { useState, useEffect } from 'react';
import { CartItem, Cart } from '../types/cart';
import { Product } from '../types/product';
import apiClient from '../services/apiClient';

interface UseShoppingCart {
  cart: Cart;
  addItemToCart: (product: Product) => void;
  // removeItemFromCart: (productId: string) => void; // 必要であれば削除機能
  // updateItemQuantity: (productId: string, quantity: number) => void; // 必要であれば数量更新機能
  clearCart: () => void;
  checkout: () => Promise<{ success: boolean; data?: any; error?: string }>; // 購入処理
  isLoading: boolean;
}

interface TransactionResponse {
    success: boolean;
    trd_id: number;
    total_amt: number;
    ttl_amt_ex_tax: number;
    message?: string; // エラーメッセージ用にOptionalで追加
}

const useShoppingCart = (): UseShoppingCart => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newTotalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newTotalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    setTotalPrice(newTotalPrice);
    setTotalQuantity(newTotalQuantity);
  }, [cartItems]);

  const addItemToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.janCode === product.janCode);
      if (existingItem) {
        return prevItems.map(item =>
          item.janCode === product.janCode
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const checkout = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    setIsLoading(true);
    try {
      const requestBody = {
        // emp_cd: "9999999999", // スキーマでデフォルト値が設定されているので省略可能
        items: cartItems.map(item => ({
          prd_id: 0, // ダミーのprd_id。JANコード(item.janCode)で商品を特定することを期待。
                     // 本来はバックエンドでjanCodeからprd_idを引くか、フロントが知っている必要がある。
          prd_code: item.janCode,
          prd_name: item.name,
          prd_price: item.price,
          quantity: item.quantity,
        })),
      };

      // 購入APIのエンドポイントとリクエストボディを修正
      const response = await apiClient.post<TransactionResponse>('api/transactions', requestBody);

      if (response.data && response.data.success) {
        console.log('Checkout successful:', response.data);
        setIsLoading(false);
        return { 
          success: true, 
          data: {
            totalAmountWithTax: response.data.total_amt, // 税込合計
            totalAmountWithoutTax: response.data.ttl_amt_ex_tax, // 税抜合計
            trdId: response.data.trd_id // 取引IDも返す
          }
        };
      } else {
        setIsLoading(false);
        // バックエンドが success: false を返す場合や、レスポンス形式が期待と異なる場合
        const errorMessage = response.data?.message || '購入処理に失敗しました。レスポンス形式が不正です。';
        console.error('Checkout failed:', response.data);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('Checkout API error:', error);
      setIsLoading(false);
      let errorMessage = '購入処理中にエラーが発生しました。';
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  };

  return {
    cart: { items: cartItems, totalPrice, totalQuantity },
    addItemToCart,
    clearCart,
    checkout,
    isLoading,
  };
};

export default useShoppingCart;
