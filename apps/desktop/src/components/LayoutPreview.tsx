import React, { useState } from "react";

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

const MOCK_ZONES: Zone[] = [
  { id: "z1", name: "Spawn Hub", purpose: "starter_area", x: 200, y: 180, w: 120, h: 120, color: PURPOSE_COLORS.starter_area },
  {
    id: "z2", name: "Forest", purpose: "resource_area", x: 40, y: 40, w: 120, h: 110, color: PURPOSE_COLORS.resource_area,
    variants: [
      { id: "v1", name: "Dense Pine Forest", prefabs: ["pfb_pine_tree_01", "pfb_bush_01"] },
      { id: "v2", name: "Birch Grove", prefabs: ["pfb_birch_tree_01", "pfb_mushroom_cluster_01"] },
      { id: "v3", name: "Mossy Ruins", prefabs: ["pfb_mossy_boulder_01", "pfb_vine_wall_01"] },
    ],
  },
  { id: "z3", name: "Sawmill", purpose: "upgrade_lane", x: 360, y: 40, w: 120, h: 90, color: PURPOSE_COLORS.upgrade_lane },
  { id: "z4", name: "Market", purpose: "shop", x: 360, y: 290, w: 120, h: 90, color: PURPOSE_COLORS.shop },
  { id: "z5", name: "Gate", purpose: "unlock_gate", x: 40, y: 290, w: 120, h: 90, color: PURPOSE_COLORS.unlock_gate },
  {
    id: "z6", name: "Deep Woods", purpose: "resource_area", x: 40, y: 170, w: 110, h: 100, color: PURPOSE_COLORS.resource_area,
    variants: [
      { id: "v4", name: "Enchanted Clearing", prefabs: ["pfb_flower_bed_01", "pfb_forest_torch_01"] },
      { id: "v5", name: "Dark Thicket", prefabs: ["pfb_fallen_log_01", "pfb_rock_cluster_01"] },
    ],
  },
];

export function LayoutPreview() {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>({});

  function selectVariant(zoneId: string, variantId: string) {
    setActiveVariants((prev) => ({ ...prev, [zoneId]: variantId }));
  }

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Layout Preview</h2>
        <div style={{
          position: "relative",
          width: "520px",
          height: "420px",
          background: "#111118",
          borderRadius: "8px",
          border: "1px solid #222",
          overflow: "hidden",
        }}>
          {MOCK_ZONES.map((z) => {
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

      <div style={{ minWidth: "240px" }}>
        <h3 style={{ fontSize: "14px", marginBottom: "12px", color: "#888" }}>
          {selectedZone ? `Zone: ${selectedZone.name}` : "Click a zone to inspect"}
        </h3>

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
          </div>
        )}
      </div>
    </div>
  );
}
