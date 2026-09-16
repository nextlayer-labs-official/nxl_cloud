import { useState } from "react";

export function UploadDropzone({ onDropFiles }: { onDropFiles: (paths: string[]) => void }) {
  const [active, setActive] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setActive(false);
    const paths = Array.from(e.dataTransfer.files).map((file) => window.skylyer.getFilePath(file));
    if (paths.length > 0) onDropFiles(paths);
  }

  return (
    <div
      className={`dropzone${active ? " active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    >
      Drag files here to upload
    </div>
  );
}
