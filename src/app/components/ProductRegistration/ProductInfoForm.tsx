import React from 'react';
import { Product } from '../../types/product';

interface ProductInfoFormProps {
  product: Product | null; // スキャンされた商品情報、またはnull
  onAddToCart: (product: Product) => void; // 「追加」ボタンクリック時の処理
  // scannedJanCode: string; // スキャンされたJANコード、Productで代替可能なら不要
}

const ProductInfoForm: React.FC<ProductInfoFormProps> = ({ product, onAddToCart }) => {
  const handleAddToCart = () => {
    if (product) {
      onAddToCart(product);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <div className="mb-4">
        <label htmlFor="janCode" className="block text-sm font-medium text-gray-700 mb-1">
          コード表示エリア
        </label>
        <input
          type="text"
          id="janCode"
          value={product?.janCode || ''}
          readOnly
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-500"
          placeholder="1234567890123"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">
          名称表示エリア
        </label>
        <input
          type="text"
          id="productName"
          value={product?.name || ''}
          readOnly
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-500"
          placeholder="おいしーいお茶"
        />
      </div>
      <div className="mb-6">
        <label htmlFor="productPrice" className="block text-sm font-medium text-gray-700 mb-1">
          単価表示エリア
        </label>
        <input
          type="text"
          id="productPrice"
          value={product ? `${product.price}円` : ''}
          readOnly
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-500"
          placeholder="150円"
        />
      </div>
      <button
        onClick={handleAddToCart}
        disabled={!product} // 商品が選択されていない場合は非活性
        className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        追加
      </button>
    </div>
  );
};

export default ProductInfoForm;
