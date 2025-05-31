import React from 'react';

interface ScanButtonProps {
  onClick: () => void; // ボタンクリック時にモーダルを開く処理
  disabled?: boolean; // ボタンの非活性状態
}

const ScanButton: React.FC<ScanButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-6 py-3 text-base font-medium text-white bg-sky-500 border border-transparent rounded-md shadow-sm hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      スキャン (カメラ)
    </button>
  );
};

export default ScanButton;
