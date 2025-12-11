// ============================================================
//  MONGODB VERSION WITH SQLITE-COMPATIBLE API (FINAL VERSION)
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
    seq: Number
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

// WARN NORMAL
const warnSchema = new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    reason: String,
    timestamp: Number
});
const Warn = mongoose.model("Warn", warnSchema);

// MUTES
const muteSchema = new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    type: String,
    reason: String,
    duration: Number,
    unmuteAt: Number,
    timestamp: Number
});
const Mute = mongoose.model("Mute", muteSchema);

// MESSAGE LOGGING
const messageSchema = new mongoose.Schema({
    id: Number,
    userId: String,
    channelId: String,
    timestamp: Number
});
const Message = mongoose.model("Message", messageSchema);

// BANS
const banSchema = new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    reason: String,
    timestamp: Number
});
const Ban = mongoose.model("Ban", banSchema);

// SPECIAL STAFF WARN
const specialWarnSchema = new mongoose.Schema({
    id: Number,
    userId: String,
    moderatorId: String,
    reason: String,
    timestamp: Number,
    expiresAt: Number
});
const SpecialWarn = mongoose.model("SpecialWarn", specialWarnSchema);

// STAFF REPORTS (ALL ACTIVITY)
const staffReportSchema = new mongoose.Schema({
    staffId: { type: String, unique: true },
    warnsGiven: Number,
    mutesGiven: Number,
    bansGiven: Number,
    ticketsCreated: Number,
    ticketsClaimed: Number,
    messagesSent: Number,
    voiceMinutes: Number
});
const StaffReport = mongoose.model("StaffReport", staffReportSchema);

// TICKETS
const ticketSchema = new mongoose.Schema({
    id: Number,
    channelId: String,
    userId: String,
    claimedBy: String,
    createdAt: Number
});
const Ticket = mongoose.model("Ticket", ticketSchema);

// ============================================================
// EXPORT API (FINAL CLEAN VERSION)
// ============================================================

module.exports = {

    // ----------------- WARNS -----------------
    async addWarn(userId, modId, reason) {
        const newId = await getNextId("warns");
        await Warn.create({
            id: newId,
            userId,
            moderatorId: modId,
            reason,
            timestamp: Date.now()
        });
    },

    async getWarns(userId, callback) {
        const rows = await Warn.find({ userId }).sort({ timestamp: -1 });
        callback(rows || []);
    },

    async getActiveWarn(userId, callback) {
        const EXP = 15 * 60 * 1000;
        const row = await Warn.findOne({ userId }).sort({ timestamp: -1 });
        if (!row) return callback(null);
        callback(Date.now() - row.timestamp < EXP ? row : null);
    },

    deleteExpiredWarns() {
        return Warn.deleteMany({ timestamp: { $lt: Date.now() - 15 * 60 * 1000 } });
    },

    // ----------------- MUTES -----------------
    async addMute(userId, modId, type, reason, duration) {
        const now = Date.now();
        const newId = await getNextId("mutes");

        await Mute.create({
            id: newId,
            userId,
            moderatorId: modId,
            type,
            reason,
            duration,
            unmuteAt: now + duration,
            timestamp: now
        });
    },

    async getDueUnmutes(callback) {
        const rows = await Mute.find({ unmuteAt: { $lte: Date.now() } });
        callback(rows || []);
    },

    removeMute(id) {
        return Mute.deleteOne({ id });
    },

    // ----------------- SPECIAL STAFF WARNS -----------------
    async addSpecialWarn(userId, modId, reason) {
        const newId = await getNextId("staff_special_warns");
        await SpecialWarn.create({
            id: newId,
            userId,
            moderatorId: modId,
            reason,
            timestamp: Date.now()
        });
    },

    async getSpecialWarnCount(userId, callback) {
        const count = await SpecialWarn.countDocuments({ userId });
        callback(count);
    },

    async deleteLatestSpecialWarn(userId, callback) {
        const row = await SpecialWarn.findOne({ userId }).sort({ id: -1 });
        if (!row) return callback(false);
        await SpecialWarn.deleteOne({ id: row.id });
        callback(true);
    },

    // ----------------- STAFF REPORT SYSTEM -----------------
    async ensureStaffRecord(staffId) {
        await StaffReport.updateOne(
            { staffId },
            {
                $setOnInsert: {
                    warnsGiven: 0,
                    mutesGiven: 0,
                    bansGiven: 0,
                    ticketsCreated: 0,
                    ticketsClaimed: 0,
                    messagesSent: 0,
                    voiceMinutes: 0
                }
            },
            { upsert: true }
        );
    },

    incrementStaffField(staffId, field) {
        return StaffReport.updateOne(
            { staffId },
            { $inc: { [field]: 1 } }
        );
    },

    addVoiceMinutes(staffId, minutes) {
        return StaffReport.updateOne(
            { staffId },
            { $inc: { voiceMinutes: minutes } }
        );
    },

    async getStaffReport(staffId, callback) {
        const row = await StaffReport.findOne({ staffId });
        callback(row || null);
    },

    async getAllStaffReports(callback) {
        const rows = await StaffReport.find();
        callback(rows || []);
    },

    resetStaffReports() {
        return StaffReport.deleteMany({});
    },

    // ----------------- MESSAGES -----------------
    async logMessage(userId, channelId) {
        const newId = await getNextId("messages");
        await Message.create({
            id: newId,
            userId,
            channelId,
            timestamp: Date.now()
        });
    },

    async getMessageCount(userId, callback) {
        const CHANNEL = "1447682897694691503";
        const count = await Message.countDocuments({ userId, channelId: CHANNEL });
        callback(count);
    },

    resetMessages() {
        return Message.deleteMany({});
    },

    // ----------------- TICKET SYSTEM -----------------
    async addTicket(channelId, userId) {
        const newId = await getNextId("tickets");
        await Ticket.create({
            id: newId,
            channelId,
            userId,
            claimedBy: null,
            createdAt: Date.now()
        });
    },

    async getTicket(channelId, callback) {
        const ticket = await Ticket.findOne({ channelId });
        callback(ticket || null);
    },

    deleteTicket(channelId) {
        return Ticket.deleteOne({ channelId });
    },

    async incrementStaffTickets(staffId) {
        return StaffReport.updateOne(
            { staffId },
            { $inc: { ticketsClaimed: 1 } }
        );
    }
};
