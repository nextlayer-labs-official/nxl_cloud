import type { BreadcrumbEntry } from "../../../shared/types";

export function Breadcrumb({
  entries,
  onNavigate,
}: {
  entries: BreadcrumbEntry[];
  onNavigate: (folderId: string | null) => void;
}) {
  return (
    <div className="breadcrumb">
      <button onClick={() => onNavigate(null)}>My Files</button>
      {entries.map((entry) => (
        <span key={entry.id}>
          {" / "}
          <button onClick={() => onNavigate(entry.id)}>{entry.name}</button>
        </span>
      ))}
    </div>
  );
}
