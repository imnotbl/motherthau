const escape = require("escape-html");

module.exports = {
    async generateTranscript(channel) {
        const messages = [];
        let lastId;

        while (true) {
            const fetched = await channel.messages.fetch({
                limit: 100,
                before: lastId
            });

            if (!fetched.size) break;
            messages.push(...fetched.values());
            lastId = fetched.last().id;
        }

        messages.reverse();

        const ticketName = escape(channel.name);
        const now = new Date().toLocaleString("ro-RO");

        const renderMessage = (m) => {
            const time = new Date(m.createdTimestamp).toLocaleString("ro-RO");
            const content = m.content ? escape(m.content) : "";

            let html = `
<div class="msg">
    <div class="avatar">
        <img src="${m.author.displayAvatarURL({ size: 64 })}">
    </div>
    <div class="content">
        <div class="meta">
            <span class="author">${escape(m.author.tag)}</span>
            <span class="time">${time}</span>
        </div>
        <div class="text">${content}</div>
`;

            for (const att of m.attachments.values()) {
                html += `<div class="attach">📎 <a href="${att.url}" target="_blank">${att.url}</a></div>`;
            }

            if (m.embeds.length) {
                html += `<div class="embed-note">📘 Embed inclus</div>`;
            }

            return html + `</div></div>`;
        };

        return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Transcript – ${ticketName}</title>

<style>
body {
    margin: 0;
    background: #0f172a;
    color: #e5e7eb;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
header {
    padding: 16px;
    background: #020617;
    border-bottom: 1px solid #1e293b;
}
header h1 {
    margin: 0;
    font-size: 20px;
}
header small {
    color: #94a3b8;
}
main {
    max-width: 900px;
    margin: auto;
    padding: 16px;
}
.msg {
    display: flex;
    gap: 12px;
    background: #020617;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
}
.avatar img {
    width: 42px;
    height: 42px;
    border-radius: 999px;
}
.meta {
    display: flex;
    gap: 10px;
    font-size: 13px;
}
.author {
    font-weight: 600;
    color: #60a5fa;
}
.time {
    color: #94a3b8;
}
.text {
    margin-top: 4px;
    white-space: pre-wrap;
}
.attach {
    margin-top: 6px;
    font-size: 12px;
}
.attach a {
    color: #38bdf8;
    text-decoration: none;
}
.embed-note {
    margin-top: 6px;
    font-size: 12px;
    color: #a5b4fc;
}
</style>
</head>

<body>
<header>
    <h1>#${ticketName}</h1>
    <small>Transcript generat automat • ${now}</small>
</header>

<main>
${messages.map(renderMessage).join("")}
</main>
</body>
</html>`;
    }
};
s