import { useState } from "react";
import { Accordion } from "@/components/arc/accordion/accordion";
import { Badge } from "@/components/arc/badge/badge";
import { PageHeader } from "@/components/arc/blocks/page-header/page-header";
import { Button } from "@/components/arc/button/button";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { DropdownMenu } from "@/components/arc/dropdown-menu/dropdown-menu";
import { ExpandableText } from "@/components/arc/expandable-text/expandable-text";
import { Input } from "@/components/arc/input/input";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import { Progress } from "@/components/arc/progress/progress";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Select } from "@/components/arc/select/select";
import { Switch } from "@/components/arc/switch/switch";
import { ThemeSwitch, type ThemeSwitchVariant } from "@/components/arc/theme-switch/theme-switch";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { ACCENTS, useTheme } from "./theme.ts";

const variants: { value: ThemeSwitchVariant; label: string }[] = [
  { value: "reveal", label: "Reveal" },
  { value: "eclipse", label: "Eclipse" },
  { value: "split", label: "Split" },
  { value: "rise", label: "Rise" },
];

export function LabPage() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [variant, setVariant] = useState<ThemeSwitchVariant>("reveal");
  const [reminders, setReminders] = useState(true);
  const [kind, setKind] = useState("reply");
  return <div className="page lab">
    <PageHeader title="Theme" />
    <p className="quiet">Light and dark, the eight accents, and the components in this hub.</p>

    <section className="lab-block">
      <h2>Appearance</h2>
      <div className="lab-row">
        <ThemeSwitch theme={theme} variant={variant} onThemeChange={(next, chosen, trigger) => setTheme(next, trigger, chosen)} />
        <SegmentedControl label="Theme transition" options={variants} value={variant} onValueChange={(value) => setVariant(value as ThemeSwitchVariant)} />
      </div>
    </section>

    <section className="lab-block">
      <h2>Accent</h2>
      <SegmentedControl
        label="Accent"
        options={ACCENTS.map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }))}
        value={accent}
        onValueChange={(value) => setAccent(value as typeof accent)}
      />
    </section>

    <section className="lab-block">
      <h2>Components</h2>
      <div className="lab-row">
        <Button type="button" size="sm">Primary</Button>
        <Button type="button" size="sm" variant="secondary">Secondary</Button>
        <Button type="button" size="sm" variant="ghost">Ghost</Button>
        <Button type="button" size="sm" variant="danger">Danger</Button>
        <Button type="button" size="sm" loading>Saving</Button>
      </div>
      <div className="lab-row">
        <Badge>Drafted</Badge>
        <Badge tone="success" dot>Sent</Badge>
        <Badge tone="warning">Waiting</Badge>
        <Badge tone="danger">Escalated</Badge>
        <Badge tone="info">Meeting</Badge>
      </div>
      <div className="lab-metrics">
        <MetricCard label="Owed" value={4} context="This workweek" />
        <MetricCard label="Escalated" value={1} context="This workweek" change="+1" />
      </div>
      <Progress label="Filed" value={64} showValue />
      <Input label="Name" description="Shown in the corner." defaultValue="Demo Week" />
      <Select label="Kind" value={kind} onValueChange={setKind} options={[{ value: "reply", label: "Reply" }, { value: "task", label: "Task" }, { value: "meeting", label: "Meeting" }]} />
      <Switch label="Desk reminders" checked={reminders} onCheckedChange={setReminders} />
      <div className="lab-row">
        <DropdownMenu label="Move to" items={[{ label: "Drafted" }, { label: "Sent" }, { label: "Waiting", separatorBefore: true }]} />
        <CopyButton value="Personal Work Hub" label="Copy sample" />
        <Tooltip content="Shown on hover">
          <Button type="button" size="sm" variant="secondary">Hover for a tip</Button>
        </Tooltip>
      </div>
      <Accordion items={[{ title: "What this page is for", content: <p>Try an accent, then walk the rest of the hub and see where it shows up.</p> }]} />
      <ExpandableText lines={2}>
        <p>A reply is an answer owed to someone. A task is a deed that is not an answer. A meeting is time already on the calendar. New items start as Drafted, and a placeholder stands in for any fact that is still open.</p>
      </ExpandableText>
    </section>
  </div>;
}

export function Appearance() {
  const { theme, setTheme } = useTheme();
  return <ThemeSwitch theme={theme} iconOnly variant="reveal" onThemeChange={(next, _variant, trigger) => setTheme(next, trigger)} />;
}
