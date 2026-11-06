import { useLayoutEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import type { Desk, OwedRow } from "./hub.ts";
import { openHub, SAMPLE_CLOCK, type RecordView } from "./hub.ts";
import { demoFolder } from "./demo.ts";
import { toggleTheme } from "./theme.ts";

const hub = openHub({ demo: demoFolder(), chosen: null, now: SAMPLE_CLOCK });

function recordPath(kind: "Reply" | "Task", id: string) {
  return `/${kind === "Reply" ? "replies" : "tasks"}/${id}`;
}

function usableParts(minutes: number): { value: number; suffix: string } {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return { value: hours, suffix: `h ${rest}m` };
  if (hours) return { value: hours, suffix: "h" };
  return { value: rest, suffix: "m" };
}

export function Appearance() {
  return <button className="theme" type="button" onClick={toggleTheme}>Appearance</button>;
}

export function DeskPage() {
  const desk = hub.desk();
  const usable = usableParts(desk.counts.usableMinutes);
  const counts = [
    ["Owed", desk.counts.owed, ""],
    ["Escalated", desk.counts.escalated, ""],
    ["Replies", desk.counts.replies, ""],
    ["Tasks", desk.counts.tasks, ""],
    ["Usable", usable.value, usable.suffix],
  ] as const;
  return <div className="page">
    <header><h1>{desk.heading}</h1><p className="quiet">Sample week</p></header>
    <div className="metrics">
      {counts.map(([label, value, suffix]) => <MetricCard key={label} label={label} value={value} suffix={suffix || undefined} context="This workweek" />)}
    </div>
    <div className="split">
      <section className="cards">
        {desk.cards.map((card) => <Card key={card.id} card={card} />)}
      </section>
      <aside className="gaps">
        <h2>Usable gaps</h2>
        {desk.gaps.map((day) => <div className="day" key={day.day}>
          <strong>{day.day}</strong>
          {day.rows.map((row) => <div className="gap" key={row.label}><span>{row.label}</span><span>{hours(row.minutes)}</span></div>)}
        </div>)}
      </aside>
    </div>
  </div>;
}

function Card({ card }: { card: Desk["cards"][number] }) {
  return <Link className="card" data-escalated={card.escalated} to={recordPath(card.kind, card.id)}>
    <div className="kind">{card.kind}{card.escalated ? " · Escalated" : ""}</div>
    <div className="card-top"><h2>{card.title}</h2><span className="due">{card.due}</span></div>
  </Link>;
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function RecordPage({ kind }: { kind: "Reply" | "Task" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = hub.record(kind, id ?? "");
  useLayoutEffect(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx !== 0) return;
    const url = window.location.pathname + window.location.search + window.location.hash;
    window.history.replaceState({ idx: 0, key: "desk", usr: null }, "", "/");
    window.history.pushState({ idx: 1, key: "record", usr: null }, "", url);
  }, [id]);
  if (!record) return <p>Record not in this sample.</p>;
  return <RecordBody record={record} onBack={() => navigate(-1)} />;
}

function RecordBody({ record, onBack }: { record: RecordView; onBack: () => void }) {
  return <article className="record page">
    <button className="back" type="button" onClick={onBack}>Back</button>
    <h1>{record.title}</h1>
    <p className="quiet">{record.status}</p>
    <section className="section"><h2>Body</h2><p>{record.body}</p></section>
    <section className="section">
      <h2>Source</h2>
      <p>{record.from} · {record.due}</p>
      <p><a href={record.outlook}>{record.outlook}</a></p>
      {record.action ? <p><a href={record.action}>{record.action}</a></p> : null}
    </section>
    <section className="section">
      <h2>Activity</h2>
      {record.comments.length === 0 ? <p>No comments.</p> : record.comments.map((comment) => <p key={comment.outlook}><strong>{comment.who}</strong> · {comment.when}. {comment.text} <a href={comment.outlook}>{comment.outlook}</a></p>)}
    </section>
    {record.sameSource.length > 0 && <section className="section">
      <h2>Same source</h2>
      {record.sameSource.map((other) => <p key={other.id}><Link to={recordPath(other.kind, other.id)}>{other.kind}: {other.title}</Link></p>)}
    </section>}
  </article>;
}

export function OwedPage() {
  const rows = hub.list();
  return <div className="page">
    <header><h1>Owed</h1></header>
    <div className="rows">
      {rows.map((row) => <OwedRowLink key={`${row.kind}-${row.id}`} row={row} />)}
    </div>
  </div>;
}

function OwedRowLink({ row }: { row: OwedRow }) {
  return <Link className="row" data-escalated={row.escalated ? "true" : undefined} to={recordPath(row.kind, row.id)}>
    <span className="kind">{row.kind}</span>
    <span className="row-title">{row.title}</span>
    <span>{row.state}</span>
    <span className="due">{row.due}</span>
    <span>{row.from}</span>
    {row.escalated ? <span className="kind">Escalated</span> : <span />}
  </Link>;
}

export function NamedPage({ title }: { title: string }) {
  return <div className="page"><h1>{title}</h1></div>;
}
