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

    // 制限された領域内のバーコードのみを検出
    const validCode = detectedCodes.find(code => {
      // バーコードの座標がスキャン領域内かチェック
      if (code.boundingBox) {
        const { x, y, width, height } = code.boundingBox;
        
        // スキャナーのビューポート内の中央付近にあるかチェック
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // ビューポートの40%-60%の範囲内（中央部分）にあるかチェック
        const isInCenterRegionX = centerX > 0.4 && centerX < 0.6;
        const isInCenterRegionY = centerY > 0.4 && centerY < 0.6;
        
        return isInCenterRegionX && isInCenterRegionY;
      }
      return false;
    });

    if (validCode && validCode.rawValue) {
      const janCode = validCode.rawValue.trim();
      console.log(`[Modal] Scanned code in restricted area: ${janCode}`);
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
            <div className="relative w-full h-full">
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
                constraints={{
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                  facingMode: "environment",
                  aspectRatio: { ideal: 1 },
                  frameRate: { max: 15 }
                }}
                scanDelay={500}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none">
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-20 border-2 border-green-500 bg-transparent">
                  <div className="absolute left-0 top-1/2 w-full h-0.5 bg-green-500 opacity-70 transform -translate-y-1/2"></div>
                </div>
              </div>
            </div>
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
