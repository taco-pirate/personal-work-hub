export type Comment = { who: string; when: string; text: string; outlook: string };

export type StoredItem = {
  id: string;
  kind: "Reply" | "Task";
  title: string;
  status: string;
  due: string;
  escalated: boolean;
  created: number;
  finished: string;
  returns: string;
  parked: string;
  source: string;
  from: string;
  outlook: string;
  action: string;
  body: string;
  comments: Comment[];
};

export type StoredMeeting = {
  id: string;
  title: string;
  day: string;
  start: number;
  end: number;
  category: string;
  response: string;
  showAs: string;
  allDay: boolean;
  organizer: boolean;
  outlook: string;
};

export type HubSnapshot = {
  ready: boolean;
  items: StoredItem[];
  meetings: StoredMeeting[];
};

export type FolderFile = { directory: string; id: string; text: string };

const REQUIRED = ["replies", "tasks", "meetings"];

export function snapshotFromFiles(name: string, directories: string[], files: FolderFile[]): HubSnapshot {
  return {
    ready: name === "PersonalWorkHub" && REQUIRED.every((dir) => directories.includes(dir)),
    items: files.flatMap((file) => itemFrom(file)),
    meetings: files.flatMap((file) => meetingFrom(file)),
  };
}

function fieldsOf(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  const fields: Record<string, string> = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    fields[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return fields;
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function commentsIn(text: string): { body: string; comments: Comment[] } {
  const match = text.match(/^---\n[\s\S]*?\n---\n?/);
  const rest = (match ? text.slice(match[0].length) : text).replace(/\s+$/, "");
  const [prose, commentBlock] = rest.split(/\n## Comments\n/);
  const comments: Comment[] = [];
  if (commentBlock) {
    for (const chunk of commentBlock.split(/\n(?=- )/)) {
      const lines = chunk.replace(/^- /, "").split("\n");
      const field = (name: string) => {
        const line = lines.find((item) => item.trim().startsWith(`${name}:`));
        return line ? line.trim().slice(name.length + 1).trim() : "";
      };
      if (!field("who")) continue;
      comments.push({ who: field("who"), when: field("when"), outlook: field("outlook"), text: field("text") });
    }
  }
  return { body: (prose ?? "").trim(), comments };
}

function itemFrom(file: FolderFile): StoredItem[] {
  if (file.directory !== "replies" && file.directory !== "tasks") return [];
  const fields = fieldsOf(file.text);
  const prose = commentsIn(file.text);
  return [{
    id: file.id,
    kind: fields.kind === "Task" ? "Task" : "Reply",
    title: fields.title ?? "",
    status: fields.status ?? "",
    due: fields.due ?? "",
    escalated: fields.escalated === "true",
    created: Number(fields.created ?? 0),
    finished: fields.finished ?? "",
    returns: fields.returns ?? "",
    parked: fields.parked ?? "",
    source: fields.source ?? "",
    from: fields.from ?? "",
    outlook: fields.outlook ?? "",
    action: fields.action ?? "",
    body: prose.body,
    comments: prose.comments,
  }];
}

export function renderMeeting(meeting: StoredMeeting): string {
  const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const lines = [
    "---",
    "kind: Meeting",
    `title: ${meeting.title}`,
    `day: ${meeting.day}`,
    `start: ${clock(meeting.start)}`,
    `end: ${clock(meeting.end)}`,
    `category: ${meeting.category}`,
    `response: ${meeting.response}`,
    `showAs: ${meeting.showAs}`,
  ];
  if (meeting.allDay) lines.push("allDay: true");
  if (meeting.organizer) lines.push("organizer: true");
  if (meeting.outlook) lines.push(`outlook: ${meeting.outlook}`);
  lines.push("---", "");
  return `${lines.join("\n")}\n`;
}

export function renderItem(item: StoredItem): string {
  const lines = [
    "---",
    `kind: ${item.kind}`,
    `title: ${item.title}`,
    `status: ${item.status}`,
    `due: ${item.due}`,
    `escalated: ${item.escalated ? "true" : "false"}`,
    `created: ${item.created}`,
    `finished: ${item.finished}`,
    `returns: ${item.returns}`,
    `parked: ${item.parked}`,
    `source: ${item.source}`,
    `from: ${item.from}`,
    `outlook: ${item.outlook}`,
    `action: ${item.action}`,
    "---",
    item.body,
  ];
  if (item.comments.length > 0) {
    lines.push("", "## Comments");
    for (const comment of item.comments) {
      lines.push(`- who: ${comment.who}`, `  when: ${comment.when}`, `  outlook: ${comment.outlook}`, `  text: ${comment.text}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function meetingFrom(file: FolderFile): StoredMeeting[] {
  if (file.directory !== "meetings") return [];
  const fields = fieldsOf(file.text);
  return [{
    id: file.id,
    title: fields.title ?? "",
    day: fields.day ?? "",
    start: fields.start ? clockMinutes(fields.start) : 0,
    end: fields.end ? clockMinutes(fields.end) : 0,
    category: fields.category ?? "",
    response: fields.response ?? "",
    showAs: fields.showAs ?? "",
    allDay: fields.allDay === "true",
    organizer: fields.organizer === "true",
    outlook: fields.outlook ?? "",
  }];
}
