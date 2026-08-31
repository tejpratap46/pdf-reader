import { FC } from "react";
import { StampItem } from "../../../types/editor";

interface StampOverlaysProps {
  stamps: StampItem[];
}

export const StampOverlays: FC<StampOverlaysProps> = ({ stamps }) => {
  return (
    <>
      {stamps.map((stp) => (
        <div key={stp.id} className="absolute z-10 pointer-events-none flex items-center justify-center inset-0">
          <span
            className="text-4xl font-extrabold font-mono tracking-widest select-none uppercase px-6 py-2 border-4 border-dashed rounded-none"
            style={{
              color: stp.color,
              borderColor: stp.color,
              opacity: stp.opacity,
              transform: `rotate(${stp.rotation}deg)`,
            }}
          >
            {stp.text}
          </span>
        </div>
      ))}
    </>
  );
};
