import { useLayoutEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import type { Desk, OwedRow, Pipeline } from "./hub.ts";
import { openHub, SAMPLE_CLOCK, type RecordView } from "./hub.ts";
import { demoFolder } from "./demo.ts";
import { toggleTheme } from "./theme.ts";

const hub = openHub({ demo: demoFolder(), chosen: null, now: SAMPLE_CLOCK });

function recordPath(kind: "Reply" | "Task", id: string) {
  return `/${kind === "Reply" ? "replies" : "tasks"}/${id}`;
}

function rememberBack(fallback: string) {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx !== 0) return;
  const url = window.location.pathname + window.location.search + window.location.hash;
  window.history.replaceState({ idx: 0, key: "back", usr: null }, "", fallback);
  window.history.pushState({ idx: 1, key: "record", usr: null }, "", url);
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
  const [revision, setRevision] = useState(0);
  const record = hub.record(kind, id ?? "");
  void revision;
  useLayoutEffect(() => { rememberBack("/"); }, [id]);
  if (!record) return <p>Record not in this sample.</p>;
  return <RecordBody key={`${record.kind}-${record.id}`} record={record} onBack={() => navigate(-1)} onChange={() => setRevision((value) => value + 1)} />;
}

function RecordBody({ record, onBack, onChange }: { record: RecordView; onBack: () => void; onChange: () => void }) {
  const [note, setNote] = useState("");
  const [fact, setFact] = useState("");
  const [returns, setReturns] = useState("");
  const move = (state: Pipeline) => {
    const result = hub.move(record.kind, record.id, state);
    setNote(result.ok ? "" : "Replace the placeholder before this can become Ready or Done.");
    onChange();
  };
  const defer = () => {
    const result = hub.defer(record.kind, record.id, returns);
    setNote(result.ok ? "" : "Choose the date this returns.");
    onChange();
  };
  return <article className="record page">
    <button className="back" type="button" onClick={onBack}>Back</button>
    <h1>{record.title}</h1>
    <p className="quiet">{record.status}</p>
    {record.status === "Deferred" ? <p>Returns {record.returns}. Comes back {record.parked}.</p> : null}
    <div className="actions">
      {record.moves.map((state) => <button key={state} type="button" aria-pressed={state === record.status} disabled={state === record.status} onClick={() => move(state)}>{state}</button>)}
      {record.moves.length > 0 ? <>
        <label>Returns <input type="date" value={returns} onChange={(event) => setReturns(event.target.value)} /></label>
        <button type="button" onClick={defer}>Defer</button>
        <button type="button" onClick={() => { hub.drop(record.kind, record.id); setNote(""); onChange(); }}>Drop</button>
      </> : null}
      {record.escalated ? <button type="button" onClick={() => { hub.dismiss(record.kind, record.id); setNote(""); onChange(); }}>Dismiss</button> : null}
    </div>
    {record.placeholder ? <form className="actions" onSubmit={(event) => {
      event.preventDefault();
      const result = hub.replace(record.kind, record.id, fact);
      setNote(result.ok ? "" : "Replace the placeholder with the fact you decided.");
      if (result.ok) setFact("");
      onChange();
    }}>
      <label>Replace “{record.placeholder}” <input value={fact} onChange={(event) => setFact(event.target.value)} /></label>
      <button type="submit">Replace</button>
    </form> : null}
    {note ? <p className="note" role="status">{note}</p> : null}
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

export function CalendarPage() {
  const calendar = hub.calendar();
  const counts = [
    ["Meetings", calendar.counts.ahead, ""],
    ["Hours", ...parts(calendar.counts.meetingMinutes)],
    ["Usable", ...parts(calendar.counts.usableMinutes)],
    ["Focus", ...parts(calendar.counts.focusMinutes)],
    ["Uncategorized", calendar.counts.uncategorized, ""],
  ] as const;
  return <div className="page">
    <header><h1>Calendar</h1></header>
    <div className="metrics">
      {counts.map(([label, value, suffix]) => <MetricCard key={label} label={label} value={value} suffix={suffix || undefined} context="This workweek" />)}
    </div>
    <div className="week">
      {calendar.days.map((day) => <section key={day.day}>
        <h2>{day.day}</h2>
        {day.blocks.map((block) => block.kind === "meeting"
          ? <Link className="block" key={block.id} to={`/meetings/${block.id}`}>
            <span className="due">{block.time}</span>
            <strong>{block.title}</strong>
            <span className="kind">{block.category}</span>
          </Link>
          : <div className="block" key={`${block.title}-${block.time}`}>
            <span>{block.title}</span>
            <span className="due">{block.time}</span>
          </div>)}
      </section>)}
    </div>
  </div>;
}

function parts(minutes: number): [number, string] {
  const shaped = usableParts(minutes);
  return [shaped.value, shaped.suffix];
}

export function MeetingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const meeting = hub.meeting(id ?? "");
  void revision;
  useLayoutEffect(() => { rememberBack("/calendar"); }, [id]);
  if (!meeting) return <p>Meeting not in this week.</p>;
  return <article className="record page">
    <button className="back" type="button" onClick={() => navigate(-1)}>Back</button>
    <h1>{meeting.title}</h1>
    <p className="quiet">{meeting.category}</p>
    <p>{meeting.time}</p>
    <p>{meeting.outlook ? <a href={meeting.outlook}>{meeting.outlook}</a> : "No Outlook address"}</p>
    <div className="actions">
      {meeting.categories.map((category) => <button key={category} type="button" aria-pressed={category === meeting.category} disabled={category === meeting.category} onClick={() => { hub.categorize(meeting.id, category); setRevision((value) => value + 1); }}>{category}</button>)}
    </div>
  </article>;
}

