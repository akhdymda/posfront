import React, { useRef, useState, useEffect } from 'react';
import useProductScanner from '../../hooks/useProductScanner';
import { Product } from '../../types/product';
import Modal from '../common/Modal'; // 共通モーダルコンポーネント

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (product: Product) => void; // スキャン成功時に商品情報を親に渡す
  onScanError: (message: string) => void; // スキャンエラーを親に通知
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // useProductScannerフックを利用。スキャン成功時とエラー時のコールバックを渡す
  const {
    isScanning,
    error: scannerHookError, // フックからのエラーメッセージ
    stopScan,
    resetError, // useProductScannerからresetErrorを受け取る
  } = useProductScanner(videoRef, isOpen, onScanSuccess, (errMsg) => {
    setScanError(errMsg); // フック内で発生したエラーをこのコンポーネントの状態にセット
    onScanError(errMsg); // 親コンポーネントにも通知
  });

  useEffect(() => {
    // フックからエラーが通知された場合、このコンポーネントのエラーステートを更新
    // scannerHookErrorがnullの場合も考慮し、エラーがなければnullをセットする
    setScanError(scannerHookError);
  }, [scannerHookError]);

  useEffect(() => {
    if (isOpen) {
      // モーダルが開かれたときに既存のエラーをクリア
      // まずローカルのエラーをクリア
      setScanError(null);
      // 次にフック内のエラーもリセットする
      if (resetError) {
        resetError();
      }
    } else {
      // モーダルが閉じられるときにスキャンを停止
      stopScan();
    }
    // stopScan, resetError は useProductScanner フックのインスタンスに依存するため、
    // 依存配列に含めるとフックの再生成のたびにこのuseEffectが実行される可能性がある。
    // isOpenのみに依存させることで、モーダルの開閉時のみ実行されるようにする。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // resetErrorを依存配列に追加するとループする可能性があるので注意。isOpenのみに依存させる。

  const handleCloseModal = () => {
    stopScan();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="バーコードスキャナー">
      <div className="relative w-full max-w-md p-4 mx-auto bg-white rounded-lg shadow-lg">
        <video
          ref={videoRef}
          className="w-full h-auto border border-gray-300 rounded-md bg-black"
          autoPlay // 自動再生を追加
          playsInline // iOSでのインライン再生
          muted // ミュートを追加
        />
        {isScanning && <p className="mt-2 text-sm text-gray-600">カメラでバーコードをスキャンしてください...</p>}
        {/* useProductScannerから受け取ったエラーメッセージを表示 */} 
        {scanError && <p className="mt-2 text-sm text-red-500">エラー: {scanError}</p>}
        {!isScanning && !scanError && !isOpen && (
          <p className="mt-2 text-sm text-gray-500">スキャナーを開始しています...</p>
        )}
         {!isScanning && videoRef.current && !videoRef.current.srcObject && !scanError && isOpen && (
          <p className="mt-2 text-sm text-yellow-500">カメラを起動中です。許可を求められた場合は許可してください。</p>
        )}
        <button
          onClick={handleCloseModal}
          className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          閉じる
        </button>
      </div>
    </Modal>
  );
};

export default BarcodeScannerModal;
