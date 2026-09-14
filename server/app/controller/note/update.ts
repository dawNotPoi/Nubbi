import note from "@/models/note";

const stripSummaryFromProperties = <T extends { meta?: unknown }>(value: T): T => {
  if (!value.meta || typeof value.meta !== "object" || Array.isArray(value.meta)) {
    return value;
  }

  const { summary: _summary, ...meta } = value.meta as Record<string, unknown>;
  return { ...value, meta };
};

export const updateNote = async (req) => {
  return note
    .findByIdAndUpdate(
      req._id,
      {
        $set: { ...stripSummaryFromProperties(req.config) },
      },
      { new: true },
    )
    .then((data) => {
      return data;
    });
};

export const updateNoteContent = async (noteId: string, content: string) => {
  return await note.findByIdAndUpdate(
    noteId,
    {
      $set: {
        content,
      },
    },
    { new: true },
  );
};

export const updateNoteMeta = async (noteId: string, properties: any) => {
  const nextProperties = stripSummaryFromProperties(properties);

  return await note.findByIdAndUpdate(
    noteId,
    {
      $set: {
        ...nextProperties,
      },
    },
    { new: true },
  );
};

export const addWatchs = async (id: string) => {
  return await note.findByIdAndUpdate(id, { $inc: { watched: 1 } });
};

export const addLikes = async (id: string) => {
  return await note.findByIdAndUpdate(id, { $inc: { like: 1 } });
};

export const moveNote = async (noteId: string, newParentId: string) => {
  return await note.findByIdAndUpdate(
    noteId,
    {
      parentId: newParentId,
    },
    { new: true },
  );
};
