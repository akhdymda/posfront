import { Product } from './product';

export interface CartItem extends Product {
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number; // 必要であれば合計数量も
}
