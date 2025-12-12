// ============================================================
//  MONGODB VERSION – FINAL CLEAN & STABLE
// ============================================================

const mongoose = require("mongoose");

// ----------------------
// CONNECT
// ----------------------
mongoose
    .connect(process.env.DB_URI, { serverSelectionTimeoutMS: 30000 })
    .then(() => console.log("MongoDB Atlas conectat!"))
    .catch(err => console.error("Eroare MongoDB:", err));

// ============================================================
// AUTO-INCREMENT SYSTEM
// ============================================================

const counterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model("Counter", counterSchema);

async function getNextId(table) {
    const result = await Counter.findOneAndUpdate(
        { _id: table },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return result.seq;
}

// ============================================================
// SCHEMAS
// ============================================================

// WARNS
const Warn = mongoose.model("Warn", new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    reason: String,
    timestamp: Number
}));

// MUTES
const Mute = mongoose.model("Mute", new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    type: String,
    reason: String,
    duration: Number,
    unmuteAt: Number,
    timestamp: Number
}));

// MESSAGE LOGGING
const Message = mongoose.model("Message", new mongoose.Schema({
    id: Number,
    userId: String,
    channelId: String,
    timestamp: Number
}));

// BANS
const Ban = mongoose.model("Ban", new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    reason: String,
    timestamp: Number
}));

// STAFF REPORTS
const StaffReport = mongoose.model("StaffReport", new mongoose.Schema({
    staffId: { type: String, unique: true },
    warnsGiven: { type: Number, default: 0 },
    mutesGiven: { type: Number, default: 0 },
    bansGiven: { type: Number, default: 0 },
    ticketsCreated: { type: Number, default: 0 },
    ticketsClaimed: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 }
}));

// TICKETS  ✅ messageId ADĂUGAT
const Ticket = mongoose.model("Ticket", new mongoose.Schema({
    id: Number,
    channelId: String,
    userId: String,
    claimedBy: String,
    messageId: String,
    createdAt: Number
}));

// STAFF RATINGS
const StaffRating = mongoose.model("StaffRating", new mongoose.Schema({
    id: Number,
    staffId: String,
    userId: String,
    rating: Number,
    timestamp: Number
}));

// ============================================================
// EXPORT API (FINAL)
// ============================================================

module.exports = {

    // ----------------- WARNS -----------------
    async addWarn(userId, modId, reason) {
        const id = await getNextId("warns");
        await Warn.create({ id, userId, moderatorId: modId, reason, timestamp: Date.now() });
    },

    async getWarns(userId) {
        return Warn.find({ userId }).sort({ timestamp: -1 });
    },

    async getActiveWarn(userId) {
        const EXP = 15 * 60 * 1000;
        const row = await Warn.findOne({ userId }).sort({ timestamp: -1 });
        if (!row) return null;
        return Date.now() - row.timestamp < EXP ? row : null;
    },

    deleteExpiredWarns() {
        return Warn.deleteMany({ timestamp: { $lt: Date.now() - 15 * 60 * 1000 } });
    },

    // ----------------- MUTES -----------------
    async addMute(userId, modId, type, reason, duration) {
        const id = await getNextId("mutes");
        const now = Date.now();
        await Mute.create({
            id,
            userId,
            moderatorId: modId,
            type,
            reason,
            duration,
            unmuteAt: now + duration,
            timestamp: now
        });
    },

    async getDueUnmutes() {
        return Mute.find({ unmuteAt: { $lte: Date.now() } });
    },

    removeMute(id) {
        return Mute.deleteOne({ id });
    },

    // ----------------- STAFF REPORTS -----------------
    async ensureStaffRecord(staffId) {
        await StaffReport.updateOne(
            { staffId },
            { $setOnInsert: {} },
            { upsert: true }
        );
    },

    incrementStaffField(staffId, field) {
        return StaffReport.updateOne({ staffId }, { $inc: { [field]: 1 } });
    },

    async incrementStaffTickets(staffId) {
        return StaffReport.updateOne(
            { staffId },
            { $inc: { ticketsClaimed: 1 } }
        );
    },

    async getStaffReport(staffId) {
        return StaffReport.findOne({ staffId });
    },

    getAllStaffReports() {
        return StaffReport.find();
    },

    resetStaffReports() {
        return StaffReport.deleteMany({});
    },

    // ----------------- MESSAGES -----------------
    async logMessage(userId, channelId) {
        const id = await getNextId("messages");
        await Message.create({ id, userId, channelId, timestamp: Date.now() });
    },

    async getMessageCount(userId, channelId) {
        return Message.countDocuments({ userId, channelId });
    },

    resetMessages() {
        return Message.deleteMany({});
    },

    // ----------------- TICKETS -----------------
    async addTicket(channelId, userId) {
        const id = await getNextId("tickets");
        await Ticket.create({
            id,
            channelId,
            userId,
            claimedBy: null,
            messageId: null,
            createdAt: Date.now()
        });
    },

    async setTicketMessage(channelId, messageId) {
        return Ticket.updateOne(
            { channelId },
            { $set: { messageId } }
        );
    },

    async getTicket(channelId) {
        return Ticket.findOne({ channelId });
    },

    deleteTicket(channelId) {
        return Ticket.deleteOne({ channelId });
    },

    // ----------------- STAFF RATINGS -----------------
    async addStaffRating(staffId, userId, rating) {
        const id = await getNextId("staff_ratings");
        await StaffRating.create({
            id,
            staffId,
            userId,
            rating,
            timestamp: Date.now()
        });
    },

    async hasUserRated(staffId, userId) {
        return !!(await StaffRating.findOne({ staffId, userId }));
    },

    async getStaffAverageRating(staffId) {
        const rows = await StaffRating.find({ staffId });
        if (!rows.length) return "0.00";
        const avg = rows.reduce((a, b) => a + b.rating, 0) / rows.length;
        return avg.toFixed(2);
    },

    async deleteStaffRatings(staffId) {
        const result = await StaffRating.deleteMany({ staffId });
        return result.deletedCount || 0;
    }
};
