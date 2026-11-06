import { useEffect, useLayoutEffect, useState } from "react";
import type { Guide } from "./guide.ts";
import { currentGuide, pickChosenFolder, recallChosenFolder, subscribe } from "./workspace.ts";

interface FolderStepsProps {
  guide: Guide;
  onSelect: () => void;
}

export const FolderSteps = ({ guide, onSelect }: FolderStepsProps) => {
  if (!guide.asking) return null;
  return <section className="walk" aria-label="Choose PersonalWorkHub">
    {guide.notice ? <p>{guide.notice}</p> : null}
    <ol>
      {guide.steps.map((step) => <li key={step}>{step}</li>)}
    </ol>
    <div className="actions">
      <button type="button" onClick={onSelect}>{guide.action}</button>
    </div>
  </section>;
};

export const FolderWalkthrough = () => {
  const [, setRevision] = useState(0);
  const [settled, setSettled] = useState(false);
  useLayoutEffect(() => subscribe(() => setRevision((value) => value + 1)), []);
  useEffect(() => {
    let live = true;
    void recallChosenFolder().finally(() => { if (live) setSettled(true); });
    return () => { live = false; };
  }, []);
  if (!settled) return null;
  return <FolderSteps guide={currentGuide()} onSelect={() => { void pickChosenFolder(); }} />;
};
