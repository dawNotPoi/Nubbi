import mongoose from "@/lib/db";

const { Schema } = mongoose;

const metaEntrySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
    },
    value: {
      type: Schema.Types.Mixed,
    },
    type: {
      type: String,
      default: "text",
    },
  },
  {
    _id: false,
  },
);

const noteSchema = new Schema(
  {
    userId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      default: "New Note",
    },
    content: {
      type: String,
      default: "",
    },
    author: {
      type: String,
      default: null,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Note",
      default: null,
      index: true,
    },
    hasChildren: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["user", "agent"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["inbox", "active", "done", "archived"],
      default: "inbox",
    },
    published: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    cover: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    meta: {
      type: [metaEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

noteSchema.index({ userId: 1, parentId: 1 });
noteSchema.index({ userId: 1, status: 1 });
noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ published: 1, updatedAt: -1 });

export default mongoose.model("Note", noteSchema);
