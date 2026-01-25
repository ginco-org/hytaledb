"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Hash, Type, ToggleLeft, List, Braces, FileQuestion, Link2, TreePalm, Code2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ViewMode = "tree" | "raw"

interface ViewTab {
  id: ViewMode
  label: string
  icon: React.ReactNode
}

interface JsonSchemaProperty {
  type?: string | string[]
  description?: string
  properties?: Record<string, JsonSchemaProperty>
  items?: JsonSchemaProperty
  required?: string[]
  enum?: (string | number | boolean)[]
  default?: unknown
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  $ref?: string
  oneOf?: JsonSchemaProperty[]
  anyOf?: JsonSchemaProperty[]
  allOf?: JsonSchemaProperty[]
  $defs?: Record<string, JsonSchemaProperty>
  definitions?: Record<string, JsonSchemaProperty>
}

interface JsonSchema extends JsonSchemaProperty {
  $schema?: string
  $id?: string
  title?: string
}

interface JsonSchemaViewerProps {
  schema: JsonSchema
  className?: string
}

interface SchemaContextValue {
  rootSchema: JsonSchema
  resolveRef: (ref: string) => JsonSchemaProperty | null
  getRefName: (ref: string) => string
}

const SchemaContext = React.createContext<SchemaContextValue | null>(null)

const VIEW_TABS: ViewTab[] = [
  { id: "tree", label: "Tree", icon: <TreePalm className="h-3.5 w-3.5" /> },
  { id: "raw", label: "Raw", icon: <Code2 className="h-3.5 w-3.5" /> },
]

function useSchemaContext() {
  const context = React.useContext(SchemaContext)
  if (!context) {
    throw new Error("useSchemaContext must be used within a SchemaContext.Provider")
  }
  return context
}

type SchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null" | "unknown"

function getTypeIcon(type: SchemaType) {
  switch (type) {
    case "string":
      return <Type className="h-3.5 w-3.5" />
    case "number":
    case "integer":
      return <Hash className="h-3.5 w-3.5" />
    case "boolean":
      return <ToggleLeft className="h-3.5 w-3.5" />
    case "array":
      return <List className="h-3.5 w-3.5" />
    case "object":
      return <Braces className="h-3.5 w-3.5" />
    default:
      return <FileQuestion className="h-3.5 w-3.5" />
  }
}

function getTypeColor(type: SchemaType) {
  switch (type) {
    case "string":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "number":
    case "integer":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "boolean":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30"
    case "array":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30"
    case "object":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function TypeBadge({ type }: { type: string | string[] | undefined }) {
  const types = Array.isArray(type) ? type : [type || "unknown"]

  return (
    <div className="flex items-center gap-1.5">
      {types.map((t, i) => {
        const schemaType = t as SchemaType
        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border",
              getTypeColor(schemaType)
            )}
          >
            {getTypeIcon(schemaType)}
            {t}
          </span>
        )
      })}
    </div>
  )
}

function RefBadge({ refPath, onClick }: { refPath: string; onClick?: () => void }) {
  const { getRefName } = useSchemaContext()
  const refName = getRefName(refPath)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border",
        "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        "hover:bg-cyan-500/25 transition-colors cursor-pointer"
      )}
    >
      <Link2 className="h-3.5 w-3.5" />
      <span className="font-mono">{refName}</span>
    </button>
  )
}

function PropertyRow({
  name,
  property,
  isRequired,
  depth = 0,
}: {
  name: string
  property: JsonSchemaProperty
  isRequired: boolean
  depth?: number
}) {
  const [isExpanded, setIsExpanded] = React.useState(depth < 2)
  const [showResolvedRef, setShowResolvedRef] = React.useState(false)
  const { resolveRef } = useSchemaContext()

  // If this property is a $ref, resolve it
  const resolvedProperty = property.$ref ? resolveRef(property.$ref) : null
  const effectiveProperty = resolvedProperty ? { ...resolvedProperty, ...property, $ref: property.$ref } : property

  const hasChildren = effectiveProperty.properties || effectiveProperty.items || effectiveProperty.oneOf || effectiveProperty.anyOf || effectiveProperty.allOf || property.$ref

  const primaryType = Array.isArray(effectiveProperty.type) ? effectiveProperty.type[0] : effectiveProperty.type

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        className={cn(
          "flex items-start gap-3 py-3 px-4 hover:bg-muted transition-colors",
          hasChildren && "cursor-pointer"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        style={{ paddingLeft: `${depth * 20 + 16}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <span className="text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          ) : (
            <span className="w-4" />
          )}
          <span className="font-mono text-sm font-medium text-foreground">{name}</span>
          {isRequired && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-destructive">
              required
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {property.$ref ? (
            <RefBadge
              refPath={property.$ref}
              onClick={() => setShowResolvedRef(!showResolvedRef)}
            />
          ) : (
            <TypeBadge type={effectiveProperty.type} />
          )}
        </div>
      </div>

      {effectiveProperty.description && (
        <div
          className="text-sm text-muted-foreground pb-3 px-4"
          style={{ paddingLeft: `${depth * 20 + 48}px` }}
        >
          {effectiveProperty.description}
        </div>
      )}

      {effectiveProperty.enum && (
        <div
          className="flex flex-wrap gap-1.5 pb-3 px-4"
          style={{ paddingLeft: `${depth * 20 + 48}px` }}
        >
          <span className="text-xs text-muted-foreground">Enum:</span>
          {effectiveProperty.enum.map((value, i) => (
            <code
              key={i}
              className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono text-foreground"
            >
              {JSON.stringify(value)}
            </code>
          ))}
        </div>
      )}

      {effectiveProperty.default !== undefined && (
        <div
          className="text-sm text-muted-foreground pb-3 px-4"
          style={{ paddingLeft: `${depth * 20 + 48}px` }}
        >
          <span className="text-xs text-muted-foreground">Default: </span>
          <code className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono text-foreground">
            {JSON.stringify(effectiveProperty.default)}
          </code>
        </div>
      )}

      {effectiveProperty.format && (
        <div
          className="text-sm text-muted-foreground pb-3 px-4"
          style={{ paddingLeft: `${depth * 20 + 48}px` }}
        >
          <span className="text-xs text-muted-foreground">Format: </span>
          <code className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono text-foreground">
            {effectiveProperty.format}
          </code>
        </div>
      )}

      {(effectiveProperty.minimum !== undefined || effectiveProperty.maximum !== undefined) && (
        <div
          className="text-sm text-muted-foreground pb-3 px-4"
          style={{ paddingLeft: `${depth * 20 + 48}px` }}
        >
          {effectiveProperty.minimum !== undefined && (
            <span className="mr-3">
              <span className="text-xs text-muted-foreground">Min: </span>
              <code className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono text-foreground">
                {effectiveProperty.minimum}
              </code>
            </span>
          )}
          {effectiveProperty.maximum !== undefined && (
            <span>
              <span className="text-xs text-muted-foreground">Max: </span>
              <code className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono text-foreground">
                {effectiveProperty.maximum}
              </code>
            </span>
          )}
        </div>
      )}

      {effectiveProperty.pattern && (
        <div
          className="text-sm text-muted-foreground pb-3 px-4"
          style={{ paddingLeft: `${depth * 20 + 48}px` }}
        >
          <span className="text-xs text-muted-foreground">Pattern: </span>
          <code className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono text-foreground break-all">
            {effectiveProperty.pattern}
          </code>
        </div>
      )}

      {isExpanded && hasChildren && (
        <div className="border-t border-border">
          {/* Show resolved $ref content when toggled */}
          {property.$ref && showResolvedRef && resolvedProperty && (
            <div
              className="py-3 px-4 bg-cyan-500/5 border-b border-cyan-500/20"
              style={{ paddingLeft: `${(depth + 1) * 20 + 16}px` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                  Resolved Reference
                </span>
              </div>
              <TypeBadge type={resolvedProperty.type} />
              {resolvedProperty.description && (
                <p className="text-sm text-muted-foreground mt-2">{resolvedProperty.description}</p>
              )}
            </div>
          )}

          {effectiveProperty.properties && (
            <PropertiesSection
              properties={effectiveProperty.properties}
              required={effectiveProperty.required}
              depth={depth + 1}
            />
          )}
          {effectiveProperty.items && primaryType === "array" && (
            <div
              className="py-2 px-4 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 20 + 16}px` }}
            >
              <span className="font-medium">Array items:</span>
              {effectiveProperty.items.properties ? (
                <PropertiesSection
                  properties={effectiveProperty.items.properties}
                  required={effectiveProperty.items.required}
                  depth={depth + 1}
                />
              ) : effectiveProperty.items.$ref ? (
                <div className="mt-2">
                  <RefBadge refPath={effectiveProperty.items.$ref} />
                </div>
              ) : (
                <div className="mt-2">
                  <TypeBadge type={effectiveProperty.items.type} />
                </div>
              )}
            </div>
          )}
          {(effectiveProperty.oneOf || effectiveProperty.anyOf || effectiveProperty.allOf) && (
            <div
              className="py-2 px-4"
              style={{ paddingLeft: `${(depth + 1) * 20 + 16}px` }}
            >
              {effectiveProperty.oneOf && (
                <CompositionSection title="One of" schemas={effectiveProperty.oneOf} depth={depth + 1} />
              )}
              {effectiveProperty.anyOf && (
                <CompositionSection title="Any of" schemas={effectiveProperty.anyOf} depth={depth + 1} />
              )}
              {effectiveProperty.allOf && (
                <CompositionSection title="All of" schemas={effectiveProperty.allOf} depth={depth + 1} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CompositionSection({
  title,
  schemas,
  depth,
}: {
  title: string
  schemas: JsonSchemaProperty[]
  depth: number
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
      <div className="space-y-1 border-l-2 border-border pl-3">
        {schemas.map((schema, i) => (
          <div key={i} className="py-1">
            <TypeBadge type={schema.type} />
            {schema.properties && (
              <PropertiesSection
                properties={schema.properties}
                required={schema.required}
                depth={depth}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PropertiesSection({
  properties,
  required = [],
  depth = 0,
}: {
  properties: Record<string, JsonSchemaProperty>
  required?: string[]
  depth?: number
}) {
  return (
    <div>
      {Object.entries(properties).map(([name, property]) => (
        <PropertyRow
          key={name}
          name={name}
          property={property}
          isRequired={required.includes(name)}
          depth={depth}
        />
      ))}
    </div>
  )
}

function RawJsonView({ schema }: { schema: JsonSchema }) {
  const [copied, setCopied] = React.useState(false)
  const jsonString = JSON.stringify(schema, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-md bg-muted hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <pre className="p-4 overflow-auto max-h-[600px] text-sm font-mono bg-muted">
        <code className="text-foreground">{jsonString}</code>
      </pre>
    </div>
  )
}

function DefinitionsSection({ definitions, title }: { definitions: Record<string, JsonSchemaProperty>; title: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted transition-colors text-left"
      >
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">
          ({Object.keys(definitions).length} definitions)
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-border">
          {Object.entries(definitions).map(([name, def]) => (
            <PropertyRow
              key={name}
              name={name}
              property={def}
              isRequired={false}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeView({ schema }: { schema: JsonSchema }) {
  const definitions = schema.$defs || schema.definitions

  return (
    <>
      {/* Properties */}
      {schema.properties && (
        <PropertiesSection properties={schema.properties} required={schema.required} />
      )}

      {/* Root level items (for array schemas) */}
      {schema.items && schema.type === "array" && (
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Array items
          </span>
          {schema.items.properties ? (
            <PropertiesSection
              properties={schema.items.properties}
              required={schema.items.required}
            />
          ) : schema.items.$ref ? (
            <div className="mt-2">
              <RefBadge refPath={schema.items.$ref} />
            </div>
          ) : (
            <div className="mt-2">
              <TypeBadge type={schema.items.type} />
            </div>
          )}
        </div>
      )}

      {/* Definitions section */}
      {definitions && (
        <DefinitionsSection
          definitions={definitions}
          title={schema.$defs ? "$defs" : "definitions"}
        />
      )}
    </>
  )
}

export function JsonSchemaViewerReact({ schema, className }: JsonSchemaViewerProps) {
  // Create resolver function for $ref
  const resolveRef = React.useCallback((ref: string): JsonSchemaProperty | null => {
    if (!ref.startsWith("#/")) {
      // External refs not supported yet
      return null
    }

    const path = ref.slice(2).split("/")
    let current: Record<string, unknown> = schema as Record<string, unknown>

    for (const segment of path) {
      if (current && typeof current === "object" && segment in current) {
        current = current[segment] as Record<string, unknown>
      } else {
        return null
      }
    }

    return current as JsonSchemaProperty
  }, [schema])

  // Extract ref name from path
  const getRefName = React.useCallback((ref: string): string => {
    const parts = ref.split("/")
    return parts[parts.length - 1]
  }, [])

  const contextValue = React.useMemo(() => ({
    rootSchema: schema,
    resolveRef,
    getRefName
  }), [schema, resolveRef, getRefName])

  return (
    <SchemaContext.Provider value={contextValue}>
      <Tabs defaultValue="tree" className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
        {/* Header */}
        <div className="border-b border-border bg-muted px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {schema.title && (
                <h3 className="text-lg font-semibold text-foreground">{schema.title}</h3>
              )}
              {schema.$id && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{schema.$id}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <TypeBadge type={schema.type} />
              <TabsList>
                {VIEW_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                  >
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
          {schema.description && (
            <p className="text-sm text-muted-foreground mt-2">{schema.description}</p>
          )}
        </div>

        <TabsContent value="tree" className="mt-0">
          <TreeView schema={schema} />
        </TabsContent>

        <TabsContent value="raw" className="mt-0">
          <RawJsonView schema={schema} />
        </TabsContent>
      </Tabs>
    </SchemaContext.Provider>
  )
}
