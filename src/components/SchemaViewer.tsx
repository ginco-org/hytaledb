import * as React from "react";

interface SchemaViewerProps {
  schema: object;
}

const styles = `
  .schema-viewer-container {
    width: 100%;
    overflow-x: auto;
  }
  
  .schema-viewer-container pre {
    margin: 0;
    padding: 1rem;
    font-size: 0.875rem;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
`;

export default function SchemaViewer({ schema }: SchemaViewerProps) {
  return (
    <>
      <style>{styles}</style>
      <div className="schema-viewer-container">
        <pre>{JSON.stringify(schema, null, 2)}</pre>
      </div>
    </>
  );
}
