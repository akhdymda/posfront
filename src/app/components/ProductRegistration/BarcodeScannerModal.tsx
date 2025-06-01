import React, { useState, useEffect, useCallback } from 'react';
import useProductScanner from '../../hooks/useProductScanner';
import { Product } from '../../types/product';
import Modal from '../common/Modal'; // 共通モーダルコンポーネント
import { Scanner, IDetectedBarcode as DetectedBarcode } from '@yudiel/react-qr-scanner'; // react-qr-scannerをインポート

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (product: Product) => void;
  onScanError: (message: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError,
}) => {
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);

  const {
    isLoading: isFetchingProduct,
    error: fetchProductError,
    fetchProductByJanCode,
    resetError: resetFetchProductError,
  } = useProductScanner(
    (product) => {
      onScanSuccess(product);
      setIsScannerPaused(false);
      onClose();
    },
    (errMsg) => {
      setScanErrorMessage(`商品情報取得エラー: ${errMsg}`);
      onScanError(`商品情報取得エラー: ${errMsg}`);
      setIsScannerPaused(false);
    }
  );

  const handleScan = useCallback(async (detectedCodes: DetectedBarcode[]) => {
    if (isFetchingProduct || isScannerPaused) return;

    const firstCode = detectedCodes[0];
    if (firstCode && firstCode.rawValue) {
      const janCode = firstCode.rawValue.trim();
      console.log(`[Modal] Scanned code: ${janCode}`);
      setScanErrorMessage(null);
      resetFetchProductError();
      setIsScannerPaused(true);
      await fetchProductByJanCode(janCode);
    }
  }, [isFetchingProduct, isScannerPaused, fetchProductByJanCode, resetFetchProductError]);

  const handleScannerError = useCallback((error: unknown) => {
    console.error("[Modal] Scanner error:", error);
    let message = "スキャンエラーが発生しました。";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    setScanErrorMessage(message);
    onScanError(message);
    setIsScannerPaused(false);
  }, [onScanError]);

  useEffect(() => {
    if (isOpen) {
      setScanErrorMessage(null);
      resetFetchProductError();
      setIsScannerPaused(false);
    } else {
      setIsScannerPaused(true);
    }
  }, [isOpen, resetFetchProductError]);

  const handleCloseModal = () => {
    setIsScannerPaused(true);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="バーコードスキャナー">
      <div className="relative w-full max-w-md p-4 mx-auto bg-white rounded-lg shadow-lg flex flex-col items-center justify-center">
        <div className="w-full aspect-square max-w-xs mb-4">
          {isOpen && (
            <Scanner
              onScan={handleScan}
              onError={handleScannerError}
              paused={isScannerPaused || isFetchingProduct}
              formats={[
                "ean_13", "ean_8", "upc_a", "upc_e",
                "qr_code",
              ]}
              styles={{
                container: { width: '100%', height: '100%', position: 'relative' },
                video: { width: '100%', height: '100%', objectFit: 'cover' }
              }}
              components={{
                finder: true,
              }}
            />
          )}
        </div>

        {isFetchingProduct && <p className="mt-2 text-sm text-blue-600">商品情報を検索中...</p>}
        {scanErrorMessage && <p className="mt-2 text-sm text-red-500">スキャンエラー: {scanErrorMessage}</p>}
        {fetchProductError && <p className="mt-2 text-sm text-red-500">エラー: {fetchProductError}</p>}
        
        {!isFetchingProduct && !scanErrorMessage && !fetchProductError && isOpen && !isScannerPaused && (
           <p className="mt-2 text-sm text-gray-600">カメラでバーコードをスキャンしてください...</p>
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
