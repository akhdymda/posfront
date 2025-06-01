import { useState, useEffect, useRef, useCallback } from 'react';
import Quagga, { QuaggaJSResultObject as QuaggaResult } from '@ericblade/quagga2';
import apiClient from '../services/apiClient';
import { Product } from '../types/product';

// Quaggaの型定義 (部分的な定義、必要に応じて拡張)
/*
interface QuaggaJSResultObject {
  codeResult: {
    code: string | null;
    [key: string]: unknown; // anyからunknownへ
  };
  box?: number[][]; //  単一の検出ボックスの座標 (例: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]])
  boxes?: number[][][]; // 複数の検出ボックスの配列
  [key: string]: unknown; // anyからunknownへ
}
*/

interface QuaggaJSConfig {
  inputStream: {
    name: string;
    type: 'LiveStream';
    target: HTMLVideoElement | string | undefined;
    constraints: {
      width: number;
      height: number;
      facingMode: string;
    };
    singleChannel: boolean;
    willReadFrequently: boolean;
  };
  locator: {
    patchSize: string;
    halfSample: boolean;
  };
  numOfWorkers: number;
  decoder: {
    // readers の型をより具体的に、またはQuaggaが期待する型に合わせる
    // 例: 'ean_reader' や { format: 'ean_reader', config: { supplements: ['ean_5_supplement'] } } など
    readers: (string | { format: string, config: Record<string, unknown> })[]; // anyからunknownへ
  };
  locate: boolean;
  frequency: number;
}

interface QuaggaError {
  message?: string;
  // 他のエラー関連プロパティ
}

interface UseProductScannerProps {
  onScanSuccess: (product: Product) => void;
  onScanError: (message: string) => void;
  isScanning: boolean;
  error: string | null;
  stopScan: () => void;
  resetError: () => void;
}

const useProductScanner = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isModalOpen: boolean,
  onScanSuccessCallback: (product: Product) => void,
  onScanErrorCallback: (message: string) => void
): Omit<UseProductScannerProps, 'onScanSuccess' | 'onScanError'> => {
  const [isScanning, setIsScanningState] = useState(false);
  const isScanningStateRef = useRef(isScanning); // Ref to hold current isScanning state

  const [error, setError] = useState<string | null>(null);
  const isQuaggaInitializedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectedCodeRef = useRef<string | null>(null);

  // Update ref whenever isScanning state changes
  useEffect(() => {
    isScanningStateRef.current = isScanning;
  }, [isScanning]);

  // Ref-based callbacks to avoid circular dependencies and stale closures
  const fetchProductInfoRef = useRef<((janCode: string) => Promise<void>) | null>(null);
  const handleDetectedCallbackRef = useRef<((data: QuaggaResult) => void) | null>(null);
  const handleProcessedCallbackRef = useRef<((result: QuaggaResult) => void) | null>(null);
  const initializeQuaggaRef = useRef<(() => void) | null>(null);
  const internalStopScanRef = useRef<(() => void) | null>(null);

  const setIsScanning = useCallback((value: boolean) => {
    setIsScanningState(value);
  }, [setIsScanningState]);

  const resetError = useCallback(() => {
    setError(null);
  }, [setError]);

  const internalFetchProductInfo = useCallback(async (janCode: string) => {
    console.log(`[ScannerHook] fetchProductInfo attempting to fetch for janCode: '${janCode}'`);
    if (!janCode || janCode.trim() === '') {
      console.warn("[ScannerHook] fetchProductInfo called with empty or invalid janCode. Aborting fetch.");
      setError("無効な商品コードが検出されました。");
      onScanErrorCallback("無効な商品コードが検出されました。");
      if (isQuaggaInitializedRef.current && Quagga && typeof Quagga.stop === 'function') {
        console.log("[ScannerHook] fetchProductInfo: Stopping Quagga due to invalid JAN.");
        Quagga.stop();
        if (handleDetectedCallbackRef.current) Quagga.offDetected(handleDetectedCallbackRef.current); 
        if (handleProcessedCallbackRef.current) Quagga.offProcessed(handleProcessedCallbackRef.current); 
      }
      setIsScanning(false);
      return;
    }
    try {
      // APIクライアントのレスポンス型をProductに指定 (もしくは適切なAPIレスポンス型)
      const response = await apiClient.get<{ code: string; name: string; price: number }>(`api/products/${janCode}`);
      console.log("[ScannerHook] API fetch successful, response data:", JSON.stringify(response.data, null, 2));
      lastDetectedCodeRef.current = null; 
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
        if (isQuaggaInitializedRef.current && Quagga && typeof Quagga.stop === 'function') {
            console.log("[ScannerHook] fetchProductInfo: Stopping Quagga due to product not found.");
            Quagga.stop();
            if (handleDetectedCallbackRef.current) Quagga.offDetected(handleDetectedCallbackRef.current); 
            if (handleProcessedCallbackRef.current) Quagga.offProcessed(handleProcessedCallbackRef.current); 
        }
        setIsScanning(false);
      }
    } catch (err: unknown) { // より安全な `unknown` 型を使用し、型ガードを行う
      console.error('[ScannerHook] API fetch error object:', err);
      let errorMessage = '商品情報の取得に失敗しました。';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } }; // Axiosのエラー型を想定
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
      if (isQuaggaInitializedRef.current && Quagga && typeof Quagga.stop === 'function') {
        console.log("[ScannerHook] fetchProductInfo: Stopping Quagga due to API error.");
        Quagga.stop();
        if (handleDetectedCallbackRef.current) Quagga.offDetected(handleDetectedCallbackRef.current); 
        if (handleProcessedCallbackRef.current) Quagga.offProcessed(handleProcessedCallbackRef.current); 
      }
      setIsScanning(false);
    }
  }, [onScanSuccessCallback, onScanErrorCallback, setIsScanning, setError]);

  useEffect(() => {
    fetchProductInfoRef.current = internalFetchProductInfo;
  }, [internalFetchProductInfo]);

  const internalHandleDetected = useCallback((data: QuaggaResult) => {
    if (!isQuaggaInitializedRef.current) {
        console.log(`[ScannerHook] handleDetected: Quagga not initialized. Ignoring.`);
        return;
    }
    if (data && data.codeResult && typeof data.codeResult.code === 'string') {
      const detectedCode = data.codeResult.code.trim();
      if (lastDetectedCodeRef.current === detectedCode && detectedCode !== '') {
        console.log(`[ScannerHook] Code ${detectedCode} already processed, skipping.`);
        return;
      }
      console.log(`[ScannerHook] QuaggaJS detected a code: '${detectedCode}'`);
      lastDetectedCodeRef.current = detectedCode;
      if (detectedCode !== '' && fetchProductInfoRef.current) {
        fetchProductInfoRef.current(detectedCode);
      } else if (detectedCode === ''){
        console.warn("[ScannerHook] Detected code is an empty string after trim.");
        // Optionally reset lastDetectedCodeRef if empty strings should allow re-detection of same actual code later
        // lastDetectedCodeRef.current = null; 
      }
    } else {
      // dataやdata.codeResultがnullの場合やcodeがstringでない場合のログ
      console.warn("[ScannerHook] Quagga.onDetected called but no valid code string found in data:", data);
      // lastDetectedCodeRef.current = null; // 無効な検出の場合、リセットするかは検討事項
    }
  }, [lastDetectedCodeRef]); 

  useEffect(() => {
    handleDetectedCallbackRef.current = internalHandleDetected;
  }, [internalHandleDetected]);

  const internalHandleProcessed = useCallback((result: QuaggaResult) => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    if (drawingCtx && drawingCanvas) {
        drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width") || "640"), parseInt(drawingCanvas.getAttribute("height") || "480"));
        if (result && result.boxes) { // result と result.boxes の存在を確認
            // result.boxes が存在する場合、その要素 (box) の型を number[][] と仮定
            result.boxes.filter((box: number[][]) => box !== result.box) // any を number[][] に変更
                        .forEach((box: number[][]) => { // any を number[][] に変更
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
            });
        }
        if (result && result.box) { // result と result.box の存在を確認
            // result.box の型を number[][] と仮定
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
        }
    }
  }, []);

  useEffect(() => {
    handleProcessedCallbackRef.current = internalHandleProcessed;
  }, [internalHandleProcessed]);

  const internalInitializeQuagga = useCallback(() => {
    if (!videoRef.current) {
      console.warn("[ScannerHook] internalInitializeQuagga: videoRef.current is null. Aborting initialization.");
      setError("ビデオ要素が見つかりません。");
      onScanErrorCallback("ビデオ要素が見つかりません。");
      setIsScanning(false);
      return;
    }
    // videoRef.current が null でないことを保証
    const currentVideoElement = videoRef.current;

    if (!streamRef.current || !streamRef.current.active) { setIsScanning(false); return; }

    const detectCb = handleDetectedCallbackRef.current;
    const processCb = handleProcessedCallbackRef.current;
    if (!detectCb || !processCb) return; // Callbacks not ready yet

    if (isQuaggaInitializedRef.current) { 
        console.log("[ScannerHook] Quagga already initialized. Attempting to restart scan.");
        setIsScanning(true); 
        Quagga.onDetected(detectCb);
        Quagga.onProcessed(processCb);
        try {
            Quagga.start();
            console.log("[ScannerHook] Quagga.start() successful (re-start).");
        } catch (startErrUnknown: unknown) { // unknown 型
            const startErr = startErrUnknown as QuaggaError; // 型アサーション
            console.error("[ScannerHook] Quagga.start() failed (re-start):", startErr);
            setError(`Quagga再開失敗: ${startErr.message || String(startErr)}`);
            onScanErrorCallback(`Quagga再開失敗: ${startErr.message || String(startErr)}`);
            setIsScanning(false); 
        }
        return; 
    }
    console.log("[ScannerHook] Initializing QuaggaJS for the first time...");
    const quaggaConfig: QuaggaJSConfig = {
        inputStream: {
            name: "Live",
            type: 'LiveStream',
            target: currentVideoElement, // Use the non-null currentVideoElement
            constraints: { width: 640, height: 480, facingMode: "environment" },
            singleChannel: false,
            willReadFrequently: true
        },
        locator: { patchSize: "medium", halfSample: true },
        numOfWorkers: typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 ? navigator.hardwareConcurrency : 0,
        decoder: {
            readers: ["ean_reader", "ean_8_reader"]
        },
        locate: true,
        frequency: 10
    };
    // @ts-expect-error Quaggaの型定義と完全に一致させるのが難しいため一時的にエラーを無視
    Quagga.init(quaggaConfig, (errUnknown: unknown) => { // unknown 型
      const err = errUnknown as QuaggaError; // 型アサーション
      if (err) { console.error("[ScannerHook] Quagga.init failed:", err); setError(`Quagga初期化失敗: ${err.message || String(err)}`); onScanErrorCallback(`Quagga初期化失敗: ${err.message || String(err)}`); setIsScanning(false); isQuaggaInitializedRef.current = false; return; }
      console.log("[ScannerHook] Quagga.init successful.");
      isQuaggaInitializedRef.current = true;
      setIsScanning(true); 
      Quagga.onDetected(detectCb); 
      Quagga.onProcessed(processCb); 
      try {
        Quagga.start();
        console.log("[ScannerHook] Quagga.start() successful (after init).");
      } catch (startErrUnknown: unknown) { // unknown 型
        const startErr = startErrUnknown as QuaggaError; // 型アサーション
        console.error("[ScannerHook] Quagga.start() failed (after init):", startErr);
        setError(`Quagga開始失敗: ${startErr.message || String(startErr)}`);
        onScanErrorCallback(`Quagga開始失敗: ${startErr.message || String(startErr)}`);
        setIsScanning(false);
        isQuaggaInitializedRef.current = false; 
        if (detectCb) Quagga.offDetected(detectCb); 
        if (processCb) Quagga.offProcessed(processCb);
        if (Quagga && typeof Quagga.stop === 'function') Quagga.stop();
      }
    });
  }, [videoRef, streamRef, onScanErrorCallback, setIsScanning, setError]);

  useEffect(() => {
    initializeQuaggaRef.current = internalInitializeQuagga;
  }, [internalInitializeQuagga]);

  const internalStartScan = useCallback(async () => {
    console.log("***** START SCAN ENTERED *****");
    if (isScanningStateRef.current) {
      console.log("[ScannerHook] startScan: Already scanning (checked via ref). Returning early.");
      return;
    }
    setError(null);
    lastDetectedCodeRef.current = null;
    if (!videoRef.current) { setError("ビデオ要素の準備ができていません。"); onScanErrorCallback("ビデオ要素の準備ができていません。"); return; }
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "environment" } });
      streamRef.current = currentStream; 
      if (!videoRef.current) { setIsScanning(false); if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; } return; }
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = async () => { if (videoRef.current && videoRef.current.paused) { try { await videoRef.current.play(); } catch (playErrUnknown: unknown) { const playErr = playErrUnknown as Error; console.error("[ScannerHookDirect] video.play() failed inside onloadedmetadata:", playErr); setError(`ビデオの再生に失敗: ${playErr.message}`); onScanErrorCallback(`ビデオの再生に失敗: ${playErr.message}`); setIsScanning(false);}} }; 
      videoRef.current.onplaying = () => { if(initializeQuaggaRef.current) initializeQuaggaRef.current(); };
      videoRef.current.onerror = (e: Event | string) => { console.error("[ScannerHookDirect] Event: onerror on video element:", e); setError("ビデオ再生エラーが発生しました。"); onScanErrorCallback("ビデオ再生エラーが発生しました。"); setIsScanning(false); if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; } if (videoRef.current) videoRef.current.srcObject = null;  };
    } catch (errUnknown: unknown) { // unknown 型
      const err = errUnknown as Error; // 型アサーション
      console.error("[ScannerHookDirect] Direct getUserMedia or video setup failed:", err);
      setError(`カメラの取得または再生に失敗: ${err.message}`);
      onScanErrorCallback(`カメラの取得または再生に失敗: ${err.message}`);
      setIsScanning(false); 
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [videoRef, streamRef, onScanErrorCallback, setError, setIsScanning, lastDetectedCodeRef, initializeQuaggaRef]); // initializeQuaggaRef を依存配列に追加

  const internalStopScan = useCallback(() => {
    if (!isQuaggaInitializedRef.current && !isScanningStateRef.current) {
        console.log("[ScannerHook] stopScan: Already stopped or not in a state to stop (checked via refs). Skipping.");
        return;
    }
    console.log(`[ScannerHook] stopScan called. isQuaggaInitialized: ${isQuaggaInitializedRef.current}, isScanning (ref): ${isScanningStateRef.current}`);
    lastDetectedCodeRef.current = null; 
    const detectCb = handleDetectedCallbackRef.current;
    const processCb = handleProcessedCallbackRef.current;
    if (Quagga && typeof Quagga.stop === 'function') {
        Quagga.stop(); 
        if (detectCb) Quagga.offDetected(detectCb); 
        if (processCb) Quagga.offProcessed(processCb); 
    }
    isQuaggaInitializedRef.current = false; 
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (videoRef.current && videoRef.current.srcObject) { videoRef.current.srcObject = null; videoRef.current.onplaying = null; videoRef.current.onloadedmetadata = null; videoRef.current.onerror = null; }
    setIsScanning(false);
  }, [videoRef, streamRef, setIsScanning, lastDetectedCodeRef]); // handleDetectedCallbackRef, handleProcessedCallbackRef は ref なので依存配列から削除可能
  
  useEffect(() => {
    internalStopScanRef.current = internalStopScan;
  },[internalStopScan]);

  // Exposed stopScan for external use (e.g. modal close button)
  const stopScan = useCallback(() => {
      if(internalStopScanRef.current) internalStopScanRef.current();
  }, []); // internalStopScanRef は ref なので依存配列から削除可能

  // Main useEffect for controlling scan based on modal state
  useEffect(() => {
    console.log(`[ScannerHook] Main useEffect triggered. isModalOpen: ${isModalOpen}, videoRef.current: ${!!videoRef.current}`);
    const currentVideoRef = videoRef.current; // useEffect 内で videoRef.current を参照するため、eslint react-hooks/exhaustive-deps 対策
    if (isModalOpen && currentVideoRef) {
      console.log("[ScannerHook] Main useEffect: Modal open and videoRef ready. Attempting to start scan.");
      internalStartScan();
    } else {
      console.log("[ScannerHook] Main useEffect: Modal closed or videoRef not ready. Attempting to stop scan.");
      if (internalStopScanRef.current) internalStopScanRef.current();
    }
    // クリーンアップ関数は internalStopScanRef.current に依存するため、それを依存配列に追加
    const stopScanFunc = internalStopScanRef.current;
    return () => {
      console.log("[ScannerHook] Main useEffect cleanup: Ensuring scan is stopped.");
      if (stopScanFunc) stopScanFunc();
    };
  }, [isModalOpen, videoRef, internalStartScan, internalStopScanRef]); // internalStopScanRef を依存配列に追加

  return {
    isScanning,
    error,
    stopScan,
    resetError,
  };
};

export default useProductScanner;
