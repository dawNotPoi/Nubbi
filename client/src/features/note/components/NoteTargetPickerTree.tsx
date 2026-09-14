import type { Note, SearchNote } from "@/api/note";
import type { ReactNode } from "react";
import { NoteTargetPickerRow } from "./NoteTargetPickerRow";

type NoteTarget = Note | SearchNote;

type NoteTargetPickerTreeProps = {
  childrenByParentId: Map<string, Note[]>;
  disabled?: boolean;
  expandedIds: Set<string>;
  notes: NoteTarget[];
  selectedId?: string | null;
  onSelect: (note: Note) => void;
  onToggle: (noteId: string) => void;
};

export function NoteTargetPickerTree({
  childrenByParentId,
  disabled = false,
  expandedIds,
  notes,
  onSelect,
  onToggle,
  selectedId,
}: NoteTargetPickerTreeProps) {
  const renderRows = (
    note: NoteTarget,
    depth: number,
    parentIds: Set<string>,
  ): ReactNode => {
    const childNotes = childrenByParentId.get(note._id) ?? [];
    const expanded = expandedIds.has(note._id);
    const nextParentIds = new Set(parentIds).add(note._id);

    return (
      <div key={`${note._id}-${depth}`}>
        <NoteTargetPickerRow
          active={selectedId === note._id}
          depth={depth}
          disabled={disabled}
          expanded={expanded}
          hasChildren={childNotes.length > 0}
          note={note}
          onSelect={onSelect}
          onToggle={onToggle}
        />
        {expanded
          ? childNotes
              .filter((child) => !nextParentIds.has(child._id))
              .map((child) => renderRows(child, depth + 1, nextParentIds))
          : null}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {notes.map((note) => renderRows(note, 0, new Set<string>()))}
    </div>
  );
}
