module.exports = {
    roles: {
        tier1: [
            "1447684058426638478",
            "1447684023198421163",
            "1447683980441944356",
            "1447683910912839771",
            "1447683825902813416",
            "1447683794780950739",
            "1447683757283999906"
        ],
        tier2: [
            "1447683673255186563",
            "1447683482359824434",
            "1447682951557943358"
        ],
        tier3: [
            "1447684085001748631",
            "1447684141519999047",
            "1447684240966815977"
        ],
        warnMute: "1447684240966815977",
        ban: "1447894056700088442"
    },

    hasRole(member, roleId) {
        return member.roles.cache.has(roleId);
    },

    canWarnMute(member) {
        return member.roles.cache.has(this.roles.warnMute) ||
               this.roles.tier2.some(r => member.roles.cache.has(r));
    },

    canBan(member) {
        return member.roles.cache.has(this.roles.ban) ||
               this.roles.tier2.some(r => member.roles.cache.has(r));
    },

    isTier1(member) {
        return this.roles.tier1.some(r => member.roles.cache.has(r));
    },

    isTier2(member) {
        return this.roles.tier2.some(r => member.roles.cache.has(r));
    },
        isTier3(member) {
        return this.roles.tier3.some(r => member.roles.cache.has(r));
    }
};
