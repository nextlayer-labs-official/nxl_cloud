import type { FolderItem } from "../../../shared/types";

export function FolderRow({
  folder,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: FolderItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row">
      <span>📁</span>
      <span className="row-name" role="button" onDoubleClick={onOpen} title="Double-click to open">
        {folder.name}
      </span>
      <span className="row-meta">Folder</span>
      <div className="row-actions">
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
