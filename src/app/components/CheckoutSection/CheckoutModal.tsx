import React from 'react';
import Modal from '../common/Modal'; // 共通モーダルコンポーネント

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutData: {
    totalAmountWithTax?: number;
    totalAmountWithoutTax?: number;
    errorMessage?: string;
  } | null;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, checkoutData }) => {
  if (!isOpen || !checkoutData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={checkoutData.errorMessage ? "購入エラー" : "購入完了"}>
      {checkoutData.errorMessage ? (
        <p className="text-red-500">{checkoutData.errorMessage}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between">
            <p className="text-gray-700">合計金額 (税抜):</p>
            <p className="font-semibold text-gray-900">{checkoutData.totalAmountWithoutTax?.toLocaleString()}円</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-700">合計金額 (税込):</p>
            <p className="font-semibold text-gray-900">{checkoutData.totalAmountWithTax?.toLocaleString()}円</p>
          </div>
          <p className="text-sm text-gray-600 mt-2">お買い上げありがとうございました。</p>
          {/* ここに電子レシート発行用のQRコードなどを表示する要素を追加可能 */}
        </div>
      )}
      <button
        onClick={onClose}
        className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        OK
      </button>
    </Modal>
  );
};

export default CheckoutModal;
