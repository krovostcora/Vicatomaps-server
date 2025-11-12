import mongoose from "mongoose";

const tollCacheSchema = new mongoose.Schema({
    hash: { type: String, unique: true },
    data: Object,
    updatedAt: Date
});

export default mongoose.model("TollCache", tollCacheSchema);
