
import mongoose from "@/lib/db";

const friendsSchema = new mongoose.Schema({
  avatar: {
    type: String,
    required: true,
  },
  link: {
    type: Date,
    default: Date.now,
  },
  intro: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

export default mongoose.model("Friends", friendsSchema, "friends");
