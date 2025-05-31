import React from 'react';
import { CartItem } from '../../types/cart';

interface PurchaseListItemProps {
  item: CartItem;
}

const PurchaseListItem: React.FC<PurchaseListItemProps> = ({ item }) => {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
      <div>
        <p className="font-medium text-gray-800">{item.name}</p>
        <p className="text-sm text-gray-500">単価: {item.price}円</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-700">数量: {item.quantity}</p>
        <p className="font-semibold text-gray-900">小計: {item.price * item.quantity}円</p>
      </div>
      {/* 必要であれば削除ボタンなどをここに追加 */}
    </div>
  );
};

export default PurchaseListItem;
