import { Link, Route, Routes } from "react-router";

function Home() {
  return (
    <main>
      <p className="eyebrow">A small record of what matters</p>
      <h1>Timeline</h1>
      <p className="lead">
        React Router v8 と GitHub Pages で動くタイムラインです。
      </p>
      <Link className="button" to="/about">
        このサイトについて
      </Link>
    </main>
  );
}

function About() {
  return (
    <main>
      <p className="eyebrow">About</p>
      <h1>積み重ねを、見渡せる場所に。</h1>
      <p className="lead">
        このページは <code>/timeline/</code> を起点に配信されています。
      </p>
      <Link className="button" to="/">
        タイムラインへ戻る
      </Link>
    </main>
  );
}

function NotFound() {
  return (
    <main>
      <p className="eyebrow">404</p>
      <h1>ページが見つかりません。</h1>
      <Link className="button" to="/">
        ホームへ戻る
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
