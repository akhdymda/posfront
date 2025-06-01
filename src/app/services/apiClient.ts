import axios from 'axios';

// APIのベースURLを取得し、末尾のスラッシュを正規化する関数
const getBaseUrl = () => {
  // 本番環境（Azure）では直接APIパスを使用
  if (typeof window !== 'undefined' && window.location.hostname.includes('azurewebsites.net')) {
    return '/api';
  }
  
  // 開発環境では環境変数を使用
  let baseUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || '/api';
  
  // 末尾の余分な文字（%など）を削除
  baseUrl = baseUrl.replace(/%$/, '');
  
  // 末尾のスラッシュを正規化（あれば削除）
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエスト前の共通処理
apiClient.interceptors.request.use(config => {
  console.log(`[API] Request to: ${config.baseURL}${config.url}`);
  return config;
});

export default apiClient;
