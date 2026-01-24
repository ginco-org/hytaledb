import * as React from "react";

interface SchemaViewerProps {
  schema: object;
}

export default function SchemaViewer({ schema }: SchemaViewerProps) {
  return (
    <div className="schema-viewer-container">
      <pre>{JSON.stringify(schema, null, 2)}</pre>
    </div>
  );
}
