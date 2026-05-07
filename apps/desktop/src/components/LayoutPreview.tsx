import React, { useState } from "react";
import type { ProjectDetails } from "../App.js";

interface Zone {
  id: string;
  name: string;
  purpose: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  variants?: Variant[];
}

interface Variant {
  id: string;
  name: string;
  prefabs: string[];
}

interface LayoutPreviewProps {
  project: ProjectDetails | null;
}

const PURPOSE_COLORS: Record<string, string> = {
  starter_area: "#4ade80",
  resource_area: "#22c55e",
  shop: "#3b82f6",
  upgrade_lane: "#a855f7",
  unlock_gate: "#f59e0b",
  combat_area: "#ef4444",
  boss_area: "#dc2626",
  social_hub: "#06b6d4",
};

function zonesFromProject(project: ProjectDetails): Zone[] {
  const bounds = project.project.layout.bounds;
  const scaleX = 500 / Math.max(bounds.width, 1);
  const scaleY = 400 / Math.max(bounds.depth, 1);
  return project.project.layout.zones.map((zone) => {
    const variantZone = project.project.variantZones?.find((v) => v.zoneId === zone.zoneId);
    return {
      id: zone.zoneId,
      name: zone.name,
      purpose: zone.purpose,
      x: 10 + zone.footprint.x * scaleX,
      y: 10 + zone.footprint.y * scaleY,
      w: Math.max(28, zone.footprint.w * scaleX),
      h: Math.max(28, zone.footprint.h * scaleY),
      color: PURPOSE_COLORS[zone.purpose] ?? "#888",
      variants: variantZone?.variants.map((variant) => ({
        id: variant.variantId,
        name: variant.variantId.replace(/_/g, " "),
        prefabs: variant.prefabIds,
      })),
    };
  });
}

export function LayoutPreview({ project }: LayoutPreviewProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>({});
  const zones = project ? zonesFromProject(project) : [];

  function selectVariant(zoneId: string, variantId: string) {
    setActiveVariants((prev) => ({ ...prev, [zoneId]: variantId }));
  }

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Layout Preview</h2>
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
          {project ? `${project.name} · ${project.genre} · ${project.zones} zones · ${project.devices} devices` : "Open or generate a project to inspect its layout."}
        </div>
        <div style={{
          position: "relative",
          width: "520px",
          height: "420px",
          background: "#111118",
          borderRadius: "8px",
          border: "1px solid #222",
          overflow: "hidden",
        }}>
          {zones.map((z) => {
            const isSelected = selectedZone?.id === z.id;
            const hasVariants = z.variants && z.variants.length > 0;
            return (
              <div
                key={z.id}
                onClick={() => setSelectedZone(isSelected ? null : z)}
                style={{
                  position: "absolute",
                  left: z.x,
                  top: z.y,
                  width: z.w,
                  height: z.h,
                  background: z.color + (isSelected ? "44" : "22"),
                  border: `2px solid ${z.color}`,
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: z.color,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <span>{z.name}</span>
                {hasVariants && (
                  <span style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px" }}>
                    ⟐ {z.variants!.length} variants
                  </span>
                )}
              </div>
            );
          })}
          {zones.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: "13px" }}>
              No project selected
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          {Object.entries(PURPOSE_COLORS).map(([purpose, color]) => (
            <span key={purpose} style={{ fontSize: "10px", color: "#888", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color, display: "inline-block" }} />
              {purpose.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      <div style={{ minWidth: "280px", maxWidth: "360px" }}>
        <h3 style={{ fontSize: "14px", marginBottom: "12px", color: "#888" }}>
          {selectedZone ? `Zone: ${selectedZone.name}` : "Click a zone to inspect"}
        </h3>

        {project && !selectedZone && (
          <div style={{ fontSize: "12px", color: "#888", background: "#111118", border: "1px solid #222", borderRadius: "8px", padding: "12px" }}>
            <div style={{ marginBottom: "8px", color: "#ccc", fontWeight: 600 }}>Project artifacts</div>
            <div>Seed: {project.seed}</div>
            <div>Verse files: {project.verseFiles.length}</div>
            <div>Manifests: {project.manifests.length}</div>
            <div>Validation warnings: {project.warnings}</div>
            <div style={{ marginTop: "12px", marginBottom: "6px", color: "#ccc", fontWeight: 600 }}>Manifests</div>
            {project.manifests.map((manifest) => (
              <div key={manifest.path} style={{ color: "#666", marginBottom: "3px" }}>{manifest.name}</div>
            ))}
            <div style={{ marginTop: "12px", marginBottom: "6px", color: "#ccc", fontWeight: 600 }}>Verse outputs</div>
            {project.verseFiles.map((file) => (
              <details key={file.name} style={{ marginBottom: "6px" }}>
                <summary style={{ color: "#888", cursor: "pointer" }}>{file.name}</summary>
                <pre style={{ marginTop: "6px", padding: "8px", maxHeight: "160px", overflow: "auto", background: "#0a0a0f", border: "1px solid #222", borderRadius: "6px", color: "#777", fontSize: "10px" }}>{file.code}</pre>
              </details>
            ))}
            <div style={{ marginTop: "8px", wordBreak: "break-all", color: "#555" }}>{project.path}</div>
          </div>
        )}

        {selectedZone && (
          <div style={{ fontSize: "13px" }}>
            <div style={{ color: "#888", marginBottom: "4px" }}>Purpose: <span style={{ color: selectedZone.color }}>{selectedZone.purpose}</span></div>
            <div style={{ color: "#888", marginBottom: "12px" }}>Size: {selectedZone.w} × {selectedZone.h}</div>

            {selectedZone.variants && selectedZone.variants.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>Variant Zones:</div>
                {selectedZone.variants.map((v) => {
                  const isActive = activeVariants[selectedZone.id] === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => selectVariant(selectedZone.id, v.id)}
                      style={{
                        padding: "8px 10px",
                        marginBottom: "6px",
                        background: isActive ? "#1a1530" : "#111118",
                        border: isActive ? "1px solid #7c5cff" : "1px solid #222",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#7c5cff" : "#ccc" }}>{v.name}</div>
                      <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                        {v.prefabs.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(!selectedZone.variants || selectedZone.variants.length === 0) && (
              <div style={{ fontSize: "12px", color: "#555" }}>No variants — static zone</div>
            )}

            {project && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>Verse Outputs:</div>
                {project.verseFiles.slice(0, 5).map((file) => (
                  <div key={file.name} style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>{file.name}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
