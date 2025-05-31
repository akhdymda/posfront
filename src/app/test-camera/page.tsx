'use client'; // Next.js App Routerでクライアントコンポーネントとしてマーク

import React, { useEffect, useRef } from 'react';

const SimpleCameraTestPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const enableCamera = async () => {
      if (!videoRef.current) {
        console.log('[SimpleTest] videoRef is null in useEffect, returning.');
        return;
      }
      console.log('[SimpleTest] useEffect triggered. Attempting to get user media...');

      try {
        // 1. ストリームを取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' }
        });
        console.log('[SimpleTest] Stream obtained:', stream);
        console.log(`[SimpleTest] Stream active: ${stream.active}`);
        stream.getVideoTracks().forEach((track, i) => {
          console.log(`[SimpleTest] Track ${i} - enabled: ${track.enabled}, readyState: ${track.readyState}, muted: ${track.muted}, label: '${track.label}'`);
        });

        // 2. video要素にストリームを接続
        videoRef.current.srcObject = stream;
        videoRef.current.load(); // 明示的にロードを呼び出す

        // 3. メタデータロード完了イベントのリスナーを設定
        videoRef.current.onloadedmetadata = () => {
          console.log('[SimpleTest] Event: onloadedmetadata triggered.');
          console.log(`[SimpleTest] Video readyState: ${videoRef.current?.readyState}, paused: ${videoRef.current?.paused}, muted: ${videoRef.current?.muted}, autoplay: ${videoRef.current?.autoplay}`);
          
          if (videoRef.current && videoRef.current.paused) {
            console.log('[SimpleTest] Video is paused, attempting to play...');
            const playPromise = videoRef.current.play();
            console.log('[SimpleTest] video.play() called. Promise:', playPromise);
            if (playPromise !== undefined) {
              playPromise
                .then(() => console.log('[SimpleTest] Playback successful! Video should be visible.'))
                .catch(err => console.error('[SimpleTest] Playback failed:', err));
            } else {
              console.warn('[SimpleTest] video.play() did not return a Promise.');
            }
          } else if (videoRef.current && !videoRef.current.paused) {
            console.log('[SimpleTest] Video is already playing (or not paused).');
          } else {
            console.log('[SimpleTest] videoRef is null or not paused, play() not called.');
          }
        };

        // 4. その他のデバッグ用イベントリスナー
        videoRef.current.onplaying = () => console.log('[SimpleTest] Event: onplaying. Video is now playing.');
        videoRef.current.onplay = () => console.log('[SimpleTest] Event: onplay.');
        videoRef.current.oncanplay = () => console.log('[SimpleTest] Event: oncanplay. Ready to play.');
        videoRef.current.onwaiting = () => console.log('[SimpleTest] Event: onwaiting. Waiting for more data.');
        videoRef.current.onstalled = () => console.log('[SimpleTest] Event: onstalled. Media data transfer stalled.');
        videoRef.current.onerror = (e) => {
            console.error('[SimpleTest] Event: onerror on video element:', e);
            if (videoRef.current?.error) {
                console.error('[SimpleTest] Video element error object:', videoRef.current.error);
            }
        };

      } catch (err) {
        console.error('[SimpleTest] Failed to get user media or set up video:', err);
      }
    };

    enableCamera();

    // クリーンアップ関数
    return () => {
      console.log('[SimpleTest] Cleanup: Stopping tracks and clearing srcObject.');
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []); // 空の依存配列で、マウント時に一度だけ実行

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Camera Test</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '640px', height: '480px', border: '1px solid black', backgroundColor: 'lightgray' }}
      />
      <p>Check the browser console for logs. Video should appear above if successful.</p>
    </div>
  );
};

export default SimpleCameraTestPage; 