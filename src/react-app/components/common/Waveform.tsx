import { FC } from "react";

export const Waveform: FC<{ paused?: boolean }> = ({ paused }) => (
  <span className="inline-flex items-end gap-[2px]" style={{ height: 16 }}>
    {["wb1", "wb2", "wb3", "wb4", "wb5"].map((cls, i) => (
      <span key={i} className={`wavebar ${cls} ${paused ? "paused" : ""}`} />
    ))}
  </span>
);
