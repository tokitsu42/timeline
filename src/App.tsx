import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, TimelineEvent } from "./data/types";

const eventModules = import.meta.glob("./data/events/*.json", { eager: true, import: "default" }) as Record<string, TimelineEvent>;
const events = Object.values(eventModules).sort((a, b) => (a.kind === "point" ? a.date : a.startDate).localeCompare(b.kind === "point" ? b.date : b.startDate));
const rangeStart = new Date("2000-01-01T00:00:00+09:00").getTime();
const rangeEnd = new Date("2026-12-31T00:00:00+09:00").getTime();
const colors: Record<Category, string> = { 政治: "#ff5d45", 社会: "#58b9ff", 経済: "#ffb54a", 災害: "#af8cff", 科学: "#4de0a3", 文化: "#ff72a8", スポーツ: "#63d6de" };
const categories = Object.keys(colors) as Category[];
type Placed = { event: TimelineEvent; x: number; y: number; width: number; height: number };
const eventStart = (event: TimelineEvent) => event.kind === "point" ? event.date : event.startDate;
const toTime = (date: string) => new Date(`${date}T00:00:00+09:00`).getTime();
const formatDate = (date: string) => new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00+09:00`));
const dateLabel = (event: TimelineEvent) => event.kind === "point" ? formatDate(event.date) : `${formatDate(event.startDate)} — ${formatDate(event.endDate)}`;
const ageAdjustedColor = (hex: string, time: number) => {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const gray = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114;
  const progress = Math.max(0, Math.min(1, (time - rangeStart) / (rangeEnd - rangeStart)));
  const saturation = .16 + progress * .84;
  const adjusted = rgb.map((value) => Math.round(gray + (value - gray) * saturation));
  return `rgb(${adjusted.join(",")})`;
};
const softenForText = (color: string) => {
  const values = color.match(/\d+/g)?.map(Number) ?? [245, 244, 239];
  return `rgb(${values.map((value, index) => Math.round(value * .42 + [245, 244, 239][index] * .58)).join(",")})`;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef<Placed[]>([]);
  const offsetRef = useRef(70);
  const offsetYRef = useRef(20);
  const zoomRef = useRef(1);
  const hoverXRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current, viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const width = viewport.clientWidth, height = viewport.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
    const totalWidth = Math.max(3600, width * 4.6) * zoomRef.current;
    const totalHeight = Math.max(1100, height * 1.75) * zoomRef.current;
    const plotStart = offsetRef.current, plotTop = offsetYRef.current, plotWidth = totalWidth;
    const xForTime = (time: number) => plotStart + ((time - rangeStart) / (rangeEnd - rangeStart)) * plotWidth;
    for (let year = 2000; year <= 2026; year++) {
      const x = xForTime(new Date(`${year}-01-01T00:00:00+09:00`).getTime());
      ctx.strokeStyle = year % 5 === 0 ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.08)";
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    const bandHeight = (totalHeight - 100) / categories.length;
    categories.forEach((category, index) => {
      const y = plotTop + 70 + index * bandHeight;
      ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.beginPath(); ctx.moveTo(plotStart, y); ctx.lineTo(plotStart + plotWidth, y); ctx.stroke();
      ctx.fillStyle = colors[category]; ctx.font = "700 10px ui-monospace, monospace"; ctx.fillText(category, plotStart + 10, y + 17);
    });
    const placed: Placed[] = [];
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
    events.forEach((event) => {
      const x = xForTime(toTime(eventStart(event)));
      const categoryIndex = categories.indexOf(event.category);
      const bandTop = plotTop + 70 + categoryIndex * bandHeight;
      const anchorY = bandTop + bandHeight * .5;
      const color = ageAdjustedColor(colors[event.category], toTime(eventStart(event)));
      const headlineColor = softenForText(color);
      const fontSize = Math.min(18, 13 + zoomRef.current * 2);
      const lineHeight = fontSize + 4;
      const metadataHeight = 16;
      const maxWidth = Math.min(240, 175 + zoomRef.current * 24);
      ctx.font = `700 ${fontSize}px 'Noto Sans JP', sans-serif`;
      const lines: string[] = []; let line = "";
      [...event.title].forEach((char) => { if (ctx.measureText(line + char).width > maxWidth && line) { lines.push(line); line = char; } else line += char; });
      if (line) lines.push(line);
      const displayLines = lines.slice(0, 2);
      if (lines.length > 2) displayLines[1] = `${displayLines[1].slice(0, -1)}…`;
      const textWidth = Math.min(maxWidth, Math.max(...displayLines.map((text) => ctx.measureText(text).width)));
      const boxHeight = metadataHeight + displayLines.length * lineHeight;
      const candidates = [anchorY - boxHeight - 8, anchorY + 12];
      const labelY = candidates.find((candidateY) =>
        candidateY >= plotTop + 36 &&
        candidateY + boxHeight <= plotTop + totalHeight - 8 &&
        !occupied.some((box) => x < box.x + box.width + 12 && x + textWidth + 12 > box.x && candidateY < box.y + box.height + 8 && candidateY + boxHeight > box.y),
      );
      if (event.kind === "period") {
        const endX = xForTime(toTime(event.endDate));
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, anchorY); ctx.lineTo(endX, anchorY); ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, anchorY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(endX, anchorY, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, anchorY, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (labelY !== undefined) {
        occupied.push({ x, y: labelY, width: textWidth + 12, height: boxHeight });
        ctx.font = "600 9px ui-monospace, monospace";
        ctx.fillText(`${eventStart(event).slice(0, 7)}  ${event.category}`, x, labelY + 9);
        ctx.fillStyle = headlineColor;
        ctx.font = `700 ${fontSize}px 'Noto Sans JP', sans-serif`;
        displayLines.forEach((text, i) => ctx.fillText(text, x, labelY + metadataHeight + fontSize + i * lineHeight));
      }
      if (event.kind === "period") {
        const endX = xForTime(toTime(event.endDate));
        placed.push({ event, x: x - 10, y: anchorY - 12, width: Math.max(20, endX - x + 20), height: 24 });
      } else {
        placed.push({ event, x: x - 12, y: anchorY - 12, width: 24, height: 24 });
      }
      if (labelY !== undefined) placed.push({ event, x: x - 6, y: labelY - 4, width: textWidth + 12, height: boxHeight + 8 });
    });
    placedRef.current = placed;

    for (let year = 2000; year <= 2026; year++) {
      const x = xForTime(new Date(`${year}-01-01T00:00:00+09:00`).getTime());
      ctx.font = `${year % 5 === 0 ? 700 : 500} 12px ui-monospace, monospace`;
      ctx.lineWidth = 4; ctx.strokeStyle = "#050505"; ctx.strokeText(String(year), x + 8, 18);
      ctx.fillStyle = year % 5 === 0 ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.4)"; ctx.fillText(String(year), x + 8, 18);
    }
    const nowX = xForTime(Date.now());
    if (nowX >= 0 && nowX <= width) {
      ctx.strokeStyle = "rgba(255,75,58,.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nowX, 0); ctx.lineTo(nowX, height); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = "#050505"; ctx.font = "700 10px ui-monospace, monospace"; ctx.strokeText("現在", nowX + 7, 36);
      ctx.fillStyle = "#ff4b3a"; ctx.fillText("現在", nowX + 7, 36);
    }
    const hoverX = hoverXRef.current;
    if (hoverX !== null) {
      const hoverTime = rangeStart + ((hoverX - plotStart) / plotWidth) * (rangeEnd - rangeStart), hoverDate = new Date(hoverTime);
      const hoverLabel = `${hoverDate.getFullYear()}.${String(hoverDate.getMonth() + 1).padStart(2, "0")}.${String(hoverDate.getDate()).padStart(2, "0")}`;
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hoverX, 0); ctx.lineTo(hoverX, height); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = "#050505"; ctx.font = "700 10px ui-monospace, monospace"; ctx.strokeText(hoverLabel, hoverX + 7, 52);
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(hoverLabel, hoverX + 7, 52);
    }
  }, []);

  useEffect(() => { draw(); const observer = new ResizeObserver(draw); if (viewportRef.current) observer.observe(viewportRef.current); return () => observer.disconnect(); }, [draw]);
  const mapSize = () => {
    const width = viewportRef.current?.clientWidth ?? 0, height = viewportRef.current?.clientHeight ?? 0;
    return { width, height, baseWidth: Math.max(3600, width * 4.6), baseHeight: Math.max(1100, height * 1.75) };
  };
  const fitZoom = () => { const { width, height, baseWidth, baseHeight } = mapSize(); return Math.max(.15, Math.min(width / baseWidth, height / baseHeight)); };
  const clampX = (value: number, atZoom = zoomRef.current) => { const { width, baseWidth } = mapSize(); const contentWidth = baseWidth * atZoom; if (contentWidth <= width) return (width - contentWidth) / 2; return Math.min(0, Math.max(width - contentWidth, value)); };
  const clampY = (value: number, atZoom = zoomRef.current) => { const { height, baseHeight } = mapSize(); const contentHeight = baseHeight * atZoom; if (contentHeight <= height) return (height - contentHeight) / 2; return Math.min(0, Math.max(height - contentHeight, value)); };
  const pointerDown = (event: React.PointerEvent) => { dragRef.current = { active: true, moved: false, x: event.clientX, y: event.clientY, offsetX: offsetRef.current, offsetY: offsetYRef.current }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: React.PointerEvent) => { const rect = canvasRef.current!.getBoundingClientRect(); hoverXRef.current = event.clientX - rect.left; const drag = dragRef.current; if (drag.active) { const dx = event.clientX - drag.x, dy = event.clientY - drag.y; if (Math.hypot(dx, dy) > 4) drag.moved = true; offsetRef.current = clampX(drag.offsetX + dx); offsetYRef.current = clampY(drag.offsetY + dy); } draw(); };
  const pointerUp = (event: React.PointerEvent) => { const drag = dragRef.current; drag.active = false; setDragging(false); if (!drag.moved) { const rect = canvasRef.current!.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top; const hit = [...placedRef.current].reverse().find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height); if (hit) setSelected(hit.event); } };
  const pointerLeave = () => { if (!dragRef.current.active) { hoverXRef.current = null; draw(); } };
  const applyZoom = (nextZoom: number, anchorX?: number, anchorY?: number) => {
    const { width, height, baseWidth, baseHeight } = mapSize();
    const bounded = Math.max(fitZoom(), Math.min(3, nextZoom));
    const oldPlotWidth = baseWidth * zoomRef.current;
    const newPlotWidth = baseWidth * bounded;
    const oldPlotHeight = baseHeight * zoomRef.current;
    const newPlotHeight = baseHeight * bounded;
    const screenX = anchorX ?? width / 2, screenY = anchorY ?? height / 2;
    const anchorRatioX = (screenX - offsetRef.current) / oldPlotWidth;
    const anchorRatioY = (screenY - offsetYRef.current) / oldPlotHeight;
    zoomRef.current = bounded;
    offsetRef.current = clampX(screenX - anchorRatioX * newPlotWidth, bounded);
    offsetYRef.current = clampY(screenY - anchorRatioY * newPlotHeight, bounded);
    setZoom(bounded);
    draw();
  };
  const wheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const rect = viewportRef.current!.getBoundingClientRect();
    applyZoom(zoomRef.current * Math.exp(-event.deltaY * .0015), event.clientX - rect.left, event.clientY - rect.top);
  };

  return <main className="atlas-shell">
    <div ref={viewportRef} className={`canvas-viewport${dragging ? " is-dragging" : ""}`} onWheel={wheel}>
      <canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onPointerLeave={pointerLeave} aria-label="2000年以降の日本のニュースを二次元で探索するタイムライン地図" />
      <div className="zoom-controls" aria-label="拡大縮小">
        <button type="button" aria-label="縮小" onClick={() => applyZoom(zoomRef.current / 1.25)}>−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button className="fit-button" type="button" aria-label="全体を表示" onClick={() => applyZoom(fitZoom())}>FIT</button>
        <button type="button" aria-label="拡大" onClick={() => applyZoom(zoomRef.current * 1.25)}>＋</button>
      </div>
    </div>
    <ol className="sr-only">{events.map((event) => <li key={event.id}><h2>{event.title}</h2><p>{dateLabel(event)}・{event.category}</p><p>{event.summary}</p></li>)}</ol>
    {selected && <div className="dialog-backdrop" role="presentation" onPointerDown={() => setSelected(null)}><section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title" onPointerDown={(event) => event.stopPropagation()}><button className="dialog-close" type="button" aria-label="閉じる" onClick={() => setSelected(null)}>×</button><div className="dialog-meta"><span style={{ color: colors[selected.category] }}>{selected.category}</span><time>{dateLabel(selected)}</time></div><h2 id="event-dialog-title">{selected.title}</h2><p>{selected.summary}</p><a href={selected.source.url} target="_blank" rel="noreferrer">出典: {selected.source.label} ↗</a></section></div>}
  </main>;
}
