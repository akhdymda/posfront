import React from 'react';
import { Cart } from '../../types/cart';
import PurchaseListItem from './PurchaseListItem';

interface PurchaseListProps {
  cart: Cart;
}

const PurchaseList: React.FC<PurchaseListProps> = ({ cart }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">購入リスト</h3>
      {cart.items.length === 0 ? (
        <p className="text-gray-500 text-center py-4">購入リストは空です。</p>
      ) : (
        <div className="space-y-2 mb-4">
          {cart.items.map(item => (
            <PurchaseListItem key={item.janCode} item={item} />
          ))}
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-1">
          <p className="text-gray-600">合計数量:</p>
          <p className="font-semibold text-gray-800">{cart.totalQuantity} 点</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-lg font-medium text-gray-700">合計金額 (税抜):</p>
          <p className="text-xl font-bold text-blue-600">{cart.totalPrice}円</p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseList;
