import type { FileItem } from "../../../shared/types";
import { formatBytes } from "../lib/format";

export function FileRow({
  file,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: {
  file: FileItem;
  onOpen: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row">
      <span>📄</span>
      <span className="row-name" role="button" onDoubleClick={onOpen} title="Double-click to open">
        {file.name}
      </span>
      <span className="row-meta">{formatBytes(file.sizeBytes)}</span>
      <div className="row-actions">
        <button onClick={onDownload} title="Save As…">
          ⬇
        </button>
        <button onClick={onRename} title="Rename">
          ✎
        </button>
        <button onClick={onDelete} title="Delete">
          🗑
        </button>
      </div>
    </div>
  );
}
