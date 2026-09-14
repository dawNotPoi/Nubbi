import clsx from "clsx";
import {
  NoteTargetPickerPanel,
  type NoteTargetPickerPanelProps,
} from "./NoteTargetPicker";

type NoteTargetPickerOverlayProps = NoteTargetPickerPanelProps & {
  onCancel: () => void;
  open: boolean;
};

export function NoteTargetPickerOverlay({
  className,
  onCancel,
  open,
  ...panelProps
}: NoteTargetPickerOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000]"
      onMouseDown={onCancel}
      role="presentation"
    >
      <NoteTargetPickerPanel
        {...panelProps}
        autoFocus
        className={clsx(
          "absolute left-1/2 top-24 h-[512px] max-h-[calc(100vh-128px)] w-[calc(100vw-32px)] max-w-[414px] -translate-x-1/2 rounded-xl border border-[#deddda] shadow-[0_24px_70px_rgba(15,23,42,0.16)]",
          className,
        )}
        onCancel={onCancel}
        onMouseDown={(event) => event.stopPropagation()}
      />
    </div>
  );
}
