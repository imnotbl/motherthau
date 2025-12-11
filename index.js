require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

// DB IMPORTAT PENTRU LOGAREA MESAJELOR
const DB = require("./utils/db");
const STAFF_MSG_CHANNEL = "1447682897694691503";

// ------------------------------------------------------
// CLIENT INIT
// ------------------------------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

// ------------------------------------------------------
// LOAD COMMANDS
// ------------------------------------------------------
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const cmd = require(path.join(commandsPath, file));
    if (!cmd.name || !cmd.execute) continue;
    client.commands.set(cmd.name, cmd);
}

// ------------------------------------------------------
// LOAD SYSTEMS
// ------------------------------------------------------
require("./utils/helpMenuHandler")(client);
require("./tickets/ticketHandler")(client);
require("./utils/voiceTracker")(client);
require("./systems/antiraid")(client);

const { startUnmuteScheduler } = require("./utils/unmuteScheduler");
startUnmuteScheduler(client);

// ------------------------------------------------------
// READY
// ------------------------------------------------------
client.once("ready", () => {
    console.log(`🔥 Awoken Bot este online ca ${client.user.tag}`);
});

require("./events/staffWelcome")(client);
require("./events/leaveStaff")(client);

// ------------------------------------------------------
// MESSAGE COMMANDS + LOG MESAJ STAFF
// ------------------------------------------------------
client.on("messageCreate", async (message) => {

    if (!message.guild || message.author.bot) return;

    // ------------------------------------------------------
    // LOGAREA MESAJELOR STAFF în canalul setat
    // ------------------------------------------------------
    if (message.channel.id === STAFF_MSG_CHANNEL) {
        DB.logMessage(message.author.id, message.channel.id);
    }

    // ------------------------------------------------------
    // COMENZI CU PREFIX DIN ENV
    // ------------------------------------------------------
    const prefix = process.env.PREFIX;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.commands.get(cmdName);
    if (!cmd) return;

    try {
        await cmd.execute(message, args, client);
    } catch (err) {
        console.error(err);
        message.reply("❌ A apărut o eroare la execuția comenzii.");
    }
});

client.login(process.env.TOKEN);
