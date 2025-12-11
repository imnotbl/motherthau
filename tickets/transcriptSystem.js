// tickets/transcriptSystem.js
const escape = require("escape-html");

module.exports = {
    async generateTranscript(channel) {
        // ============================
        // 1. FETCH MESAJ + ORDONARE
        // ============================
        let messages = [];
        let lastId;

        while (true) {
            const fetched = await channel.messages.fetch({
                limit: 100,
                before: lastId
            });

            if (fetched.size === 0) break;

            messages.push(...fetched.values());
            lastId = fetched.last().id;
        }

        // cronologic (cel mai vechi -> cel mai nou)
        messages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        const guildName = channel.guild?.name || "Unknown Server";
        const channelName = channel.name;
        const exportedAt = new Date().toLocaleString("ro-RO");

        // set participanți
        const participants = new Map();
        for (const m of messages) {
            if (!participants.has(m.author.id)) {
                participants.set(m.author.id, m.author.tag);
            }
        }

        // ============================
        // 2. TEMPLATE HTML PREMIUM
        // ============================
        let html = `<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>Transcript #${escape(channelName)} - ${escape(guildName)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            color-scheme: dark;
        }
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0b0b10;
            color: #dcddde;
        }
        .page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            position: sticky;
            top: 0;
            z-index: 10;
            background: linear-gradient(90deg, #4c1d95, #581c87, #1f2937);
            padding: 16px 32px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.6);
        }
        .header-title {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header-title span.channel {
            color: #e5e7eb;
        }
        .header-sub {
            font-size: 13px;
            color: #e5e7eb;
            opacity: 0.9;
        }
        .header-tags {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .tag {
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(15,23,42,0.85);
            border: 1px solid rgba(148,163,184,0.5);
            color: #e5e7eb;
        }
        .content {
            padding: 20px 0 40px;
            display: flex;
            justify-content: center;
        }
        .chat-container {
            width: 100%;
            max-width: 960px;
            padding: 0 16px;
        }
        .system-note {
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            margin-bottom: 12px;
        }
        .divider {
            display: flex;
            align-items: center;
            margin: 16px 0;
            font-size: 12px;
            color: #9ca3af;
        }
        .divider::before, .divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(75,85,99,0.8), transparent);
        }
        .divider span {
            margin: 0 10px;
        }
        .message {
            display: grid;
            grid-template-columns: 42px 1fr;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 8px;
            transition: background 0.15s ease, transform 0.15s ease;
        }
        .message:hover {
            background: rgba(15,23,42,0.85);
            transform: translateY(-1px);
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 999px;
            overflow: hidden;
            background: #111827;
        }
        .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .msg-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 2px;
        }
        .username {
            font-weight: 600;
            font-size: 14px;
            color: #e5e7eb;
        }
        .timestamp {
            font-size: 11px;
            color: #9ca3af;
        }
        .msg-content {
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .msg-content a {
            color: #60a5fa;
        }
        .attachments {
            margin-top: 6px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .attachment {
            font-size: 12px;
            color: #9ca3af;
        }
        .attachment a {
            color: #60a5fa;
        }
        .image-preview {
            margin-top: 4px;
            max-width: 340px;
            border-radius: 8px;
            border: 1px solid #111827;
            overflow: hidden;
        }
        .image-preview img {
            width: 100%;
            display: block;
        }
        .embed-badge {
            margin-top: 6px;
            font-size: 11px;
            color: #a5b4fc;
        }
        .footer {
            text-align: center;
            font-size: 11px;
            color: #6b7280;
            padding: 16px 0 24px;
        }
        #scrollBottom {
            position: fixed;
            right: 18px;
            bottom: 18px;
            background: rgba(37,99,235,0.95);
            color: #e5e7eb;
            border: none;
            border-radius: 999px;
            padding: 8px 14px;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 6px 14px rgba(15,23,42,0.7);
            display: none;
            align-items: center;
            gap: 6px;
        }
        #scrollBottom span {
            font-size: 16px;
            line-height: 1;
        }
        @media (max-width: 600px) {
            .header {
                padding: 12px 16px;
            }
            .header-title {
                font-size: 18px;
            }
            .chat-container {
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>
<div class="page">
    <header class="header">
        <div class="header-title">
            <span class="channel">#${escape(channelName)}</span>
            <span style="opacity:0.75;font-size:13px;">— Transcript</span>
        </div>
        <div class="header-sub">
            Server: <strong>${escape(guildName)}</strong> • Exportat la ${escape(exportedAt)}
        </div>
        <div class="header-tags">
            <div class="tag">Mesaje: ${messages.length}</div>
            <div class="tag">Participanți: ${participants.size}</div>
        </div>
    </header>

    <main class="content">
        <div class="chat-container">
            <div class="system-note">
                Acesta este un transcript generat automat. Mesajele pot fi șterse ulterior de pe server,
                dar vor rămâne salvate aici.
            </div>
            <div class="divider"><span>Început conversație</span></div>
`;

        // ============================
        // 3. MESAJ CU MESAJ
        // ============================
        for (const m of messages) {
            const time = new Date(m.createdTimestamp).toLocaleString("ro-RO");
            const avatar = m.author.displayAvatarURL({ size: 128, extension: "png" });

            const content = m.content
                ? escape(m.content).replace(/\n/g, "<br>")
                : "";

            html += `
            <div class="message">
                <div class="avatar">
                    <img src="${avatar}" alt="${escape(m.author.tag)}">
                </div>
                <div class="msg-body">
                    <div class="msg-header">
                        <span class="username">${escape(m.author.tag)}</span>
                        <span class="timestamp">${escape(time)}</span>
                    </div>
                    <div class="msg-content">${content || "<i style='color:#6b7280;'>[fără text]</i>"}</div>
            `;

            // Attachments
            if (m.attachments.size > 0) {
                html += `<div class="attachments">`;
                m.attachments.forEach(att => {
                    const safeUrl = escape(att.url);
                    const fileName = escape(att.name || "attachment");
                    const isImage = att.contentType && att.contentType.startsWith("image");

                    html += `
                        <div class="attachment">
                            📎 <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${fileName}</a>
                        </div>
                    `;

                    if (isImage) {
                        html += `
                            <div class="image-preview">
                                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                                    <img src="${safeUrl}" alt="${fileName}">
                                </a>
                            </div>
                        `;
                    }
                });
                html += `</div>`;
            }

            // Embeds
            if (m.embeds && m.embeds.length > 0) {
                html += `<div class="embed-badge">📘 Embed inclus (conținutul complet este disponibil în Discord).</div>`;
            }

            html += `
                </div>
            </div>
            `;
        }

        // ============================
        // 4. FOOTER + JS PENTRU SCROLL
        // ============================
        html += `
            <div class="divider"><span>Sfârșit conversație</span></div>
        </div>
    </main>

    <footer class="footer">
        Transcript generat pentru #${escape(channelName)} • ${escape(guildName)}
    </footer>
</div>

<button id="scrollBottom">
    <span>↓</span> Jos de tot
</button>

<script>
    const btn = document.getElementById('scrollBottom');

    window.addEventListener('scroll', () => {
        const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
        btn.style.display = nearBottom ? 'none' : 'flex';
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
</script>
</body>
</html>`;

        return html;
    }
};
