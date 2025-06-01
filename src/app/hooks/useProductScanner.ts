import { useState, useCallback } from 'react';
// Quagga のインポートを削除
// import Quagga, { QuaggaJSResultObject as QuaggaResult } from '@ericblade/quagga2';
import apiClient from '../services/apiClient';
import { Product } from '../types/product';

// Quagga関連の型定義を削除 (QuaggaJSResultObject, QuaggaJSConfig, QuaggaError)

interface UseProductScannerResult { // フックの戻り値の型をシンプルに
  isLoading: boolean; // API通信中を示すローディング状態
  error: string | null;
  fetchProductByJanCode: (janCode: string) => Promise<void>;
  resetError: () => void;
}

const useProductScanner = (
  // videoRef, isModalOpen は不要になるため削除
  onScanSuccessCallback: (product: Product) => void,
  onScanErrorCallback: (message: string) => void
): UseProductScannerResult => {
  const [isLoading, setIsLoading] = useState(false); // APIローディング状態
  const [error, setError] = useState<string | null>(null);
  // Quagga関連のref (isQuaggaInitializedRef, streamRef, handleDetectedCallbackRef, etc.) は削除

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const fetchProductByJanCode = useCallback(async (janCode: string) => {
    console.log(`[ScannerHook] fetchProductByJanCode attempting to fetch for janCode: '${janCode}'`);
    if (!janCode || janCode.trim() === '') {
      console.warn("[ScannerHook] fetchProductByJanCode called with empty or invalid janCode.");
      const errMsg = "無効な商品コードが検出されました。";
      setError(errMsg);
      onScanErrorCallback(errMsg);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ code: string; name: string; price: number }>(`products/${janCode}`);
      console.log("[ScannerHook] API fetch successful, response data:", JSON.stringify(response.data, null, 2));
      if (response.data) {
        const productData: Product = {
          janCode: response.data.code,
          name: response.data.name,
          price: response.data.price,
        };
        onScanSuccessCallback(productData);
      } else {
        const msg = '商品情報が見つかりませんでした。';
        onScanErrorCallback(msg);
        setError(msg);
      }
    } catch (err: unknown) {
      console.error('[ScannerHook] API fetch error object:', err);
      let errorMessage = '商品情報の取得に失敗しました。';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosError.response && axiosError.response.status === 404) {
          errorMessage = `商品コード: ${janCode} の情報は見つかりませんでした。`;
        } else if (axiosError.response?.data?.detail) {
            errorMessage = axiosError.response.data.detail;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      onScanErrorCallback(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onScanSuccessCallback, onScanErrorCallback]);

  // Quaggaの初期化、開始、停止、イベントリスナー関連のuseEffectとuseCallbackは全て削除
  // (internalFetchProductInfo, internalHandleDetected, internalHandleProcessed, internalInitializeQuagga, internalStartScan, internalStopScan など)

  return {
    isLoading,
    error,
    fetchProductByJanCode,
    resetError,
  };
};

export default useProductScanner;
