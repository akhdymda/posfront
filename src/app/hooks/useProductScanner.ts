import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import Quagga from '@ericblade/quagga2';
import apiClient from '../services/apiClient';
import { Product } from '../types/product';

// 手動で定義した型を削除し、Quaggaの型を極力推論させるか、anyで対応

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
  const handleDetectedCallbackRef = useRef<((data: any) => void) | null>(null);
  const handleProcessedCallbackRef = useRef<((result: any) => void) | null>(null);
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
      const response = await apiClient.get<any>(`api/products/${janCode}`);
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
    } catch (err: any) {
      console.error('[ScannerHook] API fetch error object:', err);
      const errorMessage = err.response && err.response.status === 404
        ? `商品コード: ${janCode} の情報は見つかりませんでした。`
        : '商品情報の取得に失敗しました。';
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

  const internalHandleDetected = useCallback((data: any) => {
    if (!isQuaggaInitializedRef.current) {
        console.log(`[ScannerHook] handleDetected: Quagga not initialized. Ignoring.`);
        return;
    }
    if (data && data.codeResult && typeof data.codeResult.code === 'string') {
      const detectedCode = data.codeResult.code.trim();
      if (lastDetectedCodeRef.current === detectedCode) return;
      console.log(`[ScannerHook] QuaggaJS detected a code: '${detectedCode}'`);
      lastDetectedCodeRef.current = detectedCode;
      if (detectedCode !== '' && fetchProductInfoRef.current) {
        fetchProductInfoRef.current(detectedCode);
      } else if (detectedCode === ''){
        console.warn("[ScannerHook] Detected code is an empty string after trim.");
        lastDetectedCodeRef.current = null;
      }
    } else {
      console.warn("[ScannerHook] Quagga.onDetected called but no valid code string found in data:", data);
    }
  }, [lastDetectedCodeRef]);

  useEffect(() => {
    handleDetectedCallbackRef.current = internalHandleDetected;
  }, [internalHandleDetected]);

  const internalHandleProcessed = useCallback((result: any) => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;
    if (drawingCtx && drawingCanvas) {
        drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width") || "640"), parseInt(drawingCanvas.getAttribute("height") || "480"));
        if (result) {
            if (result.boxes) {
                result.boxes.filter((box: any) => box !== result.box).forEach((box: any) => {
                    Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                });
            }
            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
            }
        }
    } 
  }, []);

  useEffect(() => {
    handleProcessedCallbackRef.current = internalHandleProcessed;
  }, [internalHandleProcessed]);

  const internalInitializeQuagga = useCallback(() => {
    if (!videoRef.current) { return; }
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
        } catch (startErr: any) {
            console.error("[ScannerHook] Quagga.start() failed (re-start):", startErr);
            setError(`Quagga再開失敗: ${startErr.message || startErr}`);
            onScanErrorCallback(`Quagga再開失敗: ${startErr.message || startErr}`);
            setIsScanning(false); 
        }
        return; 
    }
    console.log("[ScannerHook] Initializing QuaggaJS for the first time...");
    const quaggaConfig: any = { inputStream: { name: "Live", type: 'LiveStream', target: videoRef.current, constraints: { width: 640, height: 480, facingMode: "environment" }, singleChannel: false, willReadFrequently: true }, locator: { patchSize: "medium", halfSample: true }, numOfWorkers: typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 ? navigator.hardwareConcurrency : 0, decoder: { readers: ["ean_reader", "ean_8_reader"] }, locate: true, frequency: 10 };
    Quagga.init(quaggaConfig, (err: any) => {
      if (err) { console.error("[ScannerHook] Quagga.init failed:", err); setError(`Quagga初期化失敗: ${err.message || err}`); onScanErrorCallback(`Quagga初期化失敗: ${err.message || err}`); setIsScanning(false); isQuaggaInitializedRef.current = false; return; }
      console.log("[ScannerHook] Quagga.init successful.");
      isQuaggaInitializedRef.current = true;
      setIsScanning(true); 
      Quagga.onDetected(detectCb); 
      Quagga.onProcessed(processCb); 
      try {
        Quagga.start();
        console.log("[ScannerHook] Quagga.start() successful (after init).");
      } catch (startErr: any) {
        console.error("[ScannerHook] Quagga.start() failed (after init):", startErr);
        setError(`Quagga開始失敗: ${startErr.message || startErr}`);
        onScanErrorCallback(`Quagga開始失敗: ${startErr.message || startErr}`);
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
      videoRef.current.onloadedmetadata = async () => { if (videoRef.current && videoRef.current.paused) { try { await videoRef.current.play(); } catch (playErr: any) { console.error("[ScannerHookDirect] video.play() failed inside onloadedmetadata:", playErr); setError(`ビデオの再生に失敗: ${playErr.message}`); onScanErrorCallback(`ビデオの再生に失敗: ${playErr.message}`); setIsScanning(false);}} }; 
      videoRef.current.onplaying = () => { if(initializeQuaggaRef.current) initializeQuaggaRef.current(); };
      videoRef.current.onerror = (e) => { console.error("[ScannerHookDirect] Event: onerror on video element:", e); setError("ビデオ再生エラーが発生しました。"); onScanErrorCallback("ビデオ再生エラーが発生しました。"); setIsScanning(false); if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; } if (videoRef.current) videoRef.current.srcObject = null;  };
    } catch (err: any) {
      console.error("[ScannerHookDirect] Direct getUserMedia or video setup failed:", err);
      setError(`カメラの取得または再生に失敗: ${err.message}`);
      onScanErrorCallback(`カメラの取得または再生に失敗: ${err.message}`);
      setIsScanning(false); 
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [videoRef, streamRef, onScanErrorCallback, setError, setIsScanning, lastDetectedCodeRef]);

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
  }, [videoRef, streamRef, setIsScanning, lastDetectedCodeRef]);
  
  useEffect(() => {
    internalStopScanRef.current = internalStopScan;
  },[internalStopScan]);

  // Exposed stopScan for external use (e.g. modal close button)
  const stopScan = useCallback(() => {
      if(internalStopScanRef.current) internalStopScanRef.current();
  }, []);

  // Main useEffect for controlling scan based on modal state
  useEffect(() => {
    console.log(`[ScannerHook] Main useEffect triggered. isModalOpen: ${isModalOpen}, videoRef.current: ${!!videoRef.current}`);
    const currentVideoRef = videoRef.current;
    if (isModalOpen && currentVideoRef) {
      console.log("[ScannerHook] Main useEffect: Modal open and videoRef ready. Attempting to start scan.");
      internalStartScan();
    } else {
      console.log("[ScannerHook] Main useEffect: Modal closed or videoRef not ready. Attempting to stop scan.");
      if (internalStopScanRef.current) internalStopScanRef.current();
    }
    return () => {
      console.log("[ScannerHook] Main useEffect cleanup: Ensuring scan is stopped.");
      if (internalStopScanRef.current) internalStopScanRef.current();
    };
  }, [isModalOpen, videoRef, internalStartScan]);

  return {
    isScanning,
    error,
    stopScan,
    resetError,
  };
};

export default useProductScanner;
