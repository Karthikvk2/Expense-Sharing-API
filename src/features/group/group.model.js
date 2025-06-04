import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    name: {
        type:String,
        required: [true, 'Name is required'],
        trim: true,
        unique: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Group = mongoose.model('Group', GroupSchema);
export default Group 