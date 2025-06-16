import axios from 'axios';

// 環境判定
const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('azurewebsites.net');

// APIのベースURLを取得し、末尾のスラッシュを正規化する関数
const getBaseUrl = () => {
  // 本番環境（Azure）では正しいバックエンドURLを直接指定
  if (isProduction) {
    // フロントエンドは app-step4-27.azurewebsites.net、バックエンドは app-step4-28.azurewebsites.net
    return 'https://app-step4-28.azurewebsites.net/api';
  }
  
  // 開発環境では直接バックエンドサーバーのURLを指定
  let baseUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://127.0.0.1:8000';
  
  // 末尾の余分な文字（%など）を削除
  baseUrl = baseUrl.replace(/%$/, '');
  
  // /apiが含まれていない場合は追加
  if (!baseUrl.includes('/api')) {
    // 末尾のスラッシュを削除してから/apiを追加
    baseUrl = baseUrl.replace(/\/$/, '') + '/api';
  }
  
  // 末尾のスラッシュは保持する（APIパスとの結合のため）
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }
  
  // デバッグログ
  if (!isProduction) {
    console.log(`[API] Base URL: ${baseUrl}`);
  }
  
  return baseUrl;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // CORSを有効にする
  withCredentials: false
});

// パスの正規化を行う関数
const normalizePath = (path: string) => {
  // パスが既に/で始まっている場合は、先頭の/を削除（ベースURLに/が含まれているため）
  if (path.startsWith('/')) {
    return path.slice(1);
  }
  return path;
};

// セキュアなログ出力関数
const secureLog = (message: string) => {
  // 本番環境ではログを出力しない
  if (!isProduction) {
    console.log(message);
  }
};

// リクエスト前の共通処理
apiClient.interceptors.request.use(config => {
  // URLパスの正規化
  if (config.url) {
    config.url = normalizePath(config.url);
  }
  
  // 開発環境でのみデバッグログを出力
  secureLog(`[API] Request to: ${config.baseURL}${config.url}`);
  secureLog(`[API] Full URL: ${config.baseURL}${config.url}`);
  secureLog(`[API] Method: ${config.method?.toUpperCase()}`);
  secureLog(`[API] Headers: ${JSON.stringify(config.headers)}`);
  return config;
});

// レスポンス後の共通処理
apiClient.interceptors.response.use(
  response => {
    secureLog(`[API] Response success: ${response.status} ${response.statusText}`);
    secureLog(`[API] Response data: ${JSON.stringify(response.data)}`);
    return response;
  },
  error => {
    secureLog(`[API] Response error: ${error.response?.status} ${error.response?.statusText}`);
    secureLog(`[API] Error URL: ${error.config?.url}`);
    secureLog(`[API] Error details: ${JSON.stringify(error.response?.data)}`);
    return Promise.reject(error);
  }
);

export default apiClient;
