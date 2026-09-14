import mongoose from "@/lib/db";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
    },
    content: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["github"],
    },
    remotePath: {
      type: String,
      index: true,
    },
    remoteSha: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

imageSchema.index({ ownerId: 1, createdAt: -1 });

export type ImageEntity = InferSchemaType<typeof imageSchema>;
export type ImageDocument = HydratedDocument<ImageEntity>;

const ImageModel: Model<ImageEntity> = mongoose.model<ImageEntity>(
  "Image",
  imageSchema,
  "image",
);

export default ImageModel;
