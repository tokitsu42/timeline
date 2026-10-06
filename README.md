# Timeline

React Router v8 と Vite で構成した、GitHub Pages 向けのシングルページアプリです。

## Development

```sh
npm install
npm run dev
```

本番環境では `https://tokitsu42.github.io/timeline/` で公開されます。Vite の `base` と React Router の `basename` は、それぞれ `/timeline/` に合わせています。

`npm run build` は既知のルートを静的 HTML にプリレンダリングします。GitHub Pages は常駐プロセスを実行できないため、実行時 SSR ではなく SSG とクライアント側 hydration を組み合わせています。
