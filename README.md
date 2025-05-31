# posアプリfrontend機能

## アプリ名称

**POS（Point of Sales）アプリケーション**

## アーキテクチャ
- Next.js
- TypeScriptとTailwind CSSを採用
- カメラによるバーコード読み取りは、ブラウザの`MediaDevices API (navigator.mediaDevices.getUserMedia) `を使用してカメラにアクセスし、JavaScriptのバーコード読み取りライブラリ（例: `zxing-js/library, react-qr-scanner`など）を組み合わせて実装する
- バージョン
    - Next.js: >=14.2.28

## front機能
1.  「スキャン（カメラ）」ボタンをクリックするとカメラアプリが起動（もしくはインフレームで）。
2.  利用者がバーコード（JANコードを想定）を撮影。
3.  バーコードを読取り、JANコード文字列に変換。
4.  変換されたJANコードを「商品マスタ検索API」へ問合せ。
5.  該当商品の名称、コード（JANコード）、単価をAPIから取得し、それぞれ名称表示エリア、コード表示エリア、単価表示エリアに表示。
6.  「追加」ボタンを押下すると、現在表示されている商品情報（名称、単価、数量）を購入リスト（UI図⑥）へ追加。その後、コード表示エリア、名称表示エリア、単価表示エリアは空欄になる。
7.  商品登録を繰り返し購入リストに商品を追加する作業を繰り返す。
8.  購入リストにある商品と同一の商品が追加された場合は数量のインクリメント、別商品なら購入リストに商品が追加になる。
9.  全て登録しおわたら「購入」ボタンを押下する。
10.  購入リストの内容を「購入API」へ送信し、購買結果をDBへ保存する。
11. 購入APIからのレスポンスに基づき、ポップアップで合計金額（税込）と合計金額（税抜）を表示する。税計算はAPI側で行われた結果を使用する。
12. OKを押すとポップアップを閉じる。

## ディレクトリ設計
```
posfront/src/app/
├── page.tsx                     // メインページ (変更なし)
├── layout.tsx                   // ルートレイアウト (変更なし)
├── globals.css                  // グローバルスタイル (変更なし)
├── favicon.ico                  // ファビコン (変更なし)
├── components/                  // UIコンポーネントディレクトリ
│   ├── ProductRegistration/       // 商品登録関連コンポーネントのグループ
│   │   ├── ScanButton.tsx       // 「スキャン（カメラ）」ボタン (変更なし)
│   │   ├── ProductInfoForm.tsx  // コード、名称、単価表示と「追加」ボタン (変更なし)
│   │   └── BarcodeScannerModal.tsx // ★ここにカメラ映像表示とスキャン処理を実装
│   ├── PurchaseList/              // 購入リスト関連 (変更なし)
│   │   ├── PurchaseList.tsx
│   │   └── PurchaseListItem.tsx
│   ├── CheckoutSection/           // 購入処理関連 (変更なし)
│   │   ├── CheckoutButton.tsx
│   │   └── CheckoutModal.tsx
│   └── common/                    // 共通コンポーネント (変更なし)
│       └── Modal.tsx
├── hooks/                       // カスタムフックディレクトリ
│   ├── useProductScanner.ts     // ★カメラアクセス、スキャン結果取得、商品情報取得API連携
│   └── useShoppingCart.ts       // 購入リストと購入処理 (変更なし)
├── services/                    // API連携サービス (変更なし)
│   └── apiClient.ts
└── types/                       // 型定義ディレクトリ (変更なし)
    ├── product.ts
    └── cart.ts
```