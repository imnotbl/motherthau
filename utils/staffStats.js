const DB = require("./db");

module.exports = {
    async addWarnStaff(staffId) {
        await DB.ensureStaffRecord(staffId);
        await DB.incrementStaffField(staffId, "warnsGiven");
    },

    async addMuteStaff(staffId) {
        await DB.ensureStaffRecord(staffId);
        await DB.incrementStaffField(staffId, "mutesGiven");
    },

    async addBanStaff(staffId) {
        await DB.ensureStaffRecord(staffId);
        await DB.incrementStaffField(staffId, "bansGiven");
    }
};
