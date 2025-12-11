// utils/githubUploader.js
// Urcă transcriptul ca fișier HTML în repo-ul GitHub Pages (motherthau)

const axios = require("axios");

const OWNER = process.env.GH_PAGES_OWNER || "imnotbl";
const REPO = process.env.GH_PAGES_REPO || "motherthau";
const BRANCH = process.env.GH_PAGES_BRANCH || "gh-pages";
const DIR = process.env.GH_PAGES_DIR || "transcripts";
const TOKEN = process.env.GH_TOKEN;

// helper – ia SHA dacă fișierul există deja
async function getFileSha(path) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`;

    try {
        const res = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                "User-Agent": "awoken-bot"
            }
        });

        return res.data.sha;
    } catch (err) {
        if (err.response && err.response.status === 404) return null;
        console.error("GitHub getFileSha error:", err.response?.data || err.message);
        throw err;
    }
}

// upload principal
async function uploadTranscript(html, fileName) {
    if (!TOKEN) {
        throw new Error("GH_TOKEN lipsă în environment (Railway Variables).");
    }

    const relPath = DIR ? `${DIR}/${fileName}` : fileName;
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(relPath)}`;

    const contentB64 = Buffer.from(html, "utf8").toString("base64");
    const existingSha = await getFileSha(relPath);

    const body = {
        message: `Update transcript ${fileName}`,
        content: contentB64,
        branch: BRANCH
    };

    if (existingSha) body.sha = existingSha;

    await axios.put(url, body, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            "User-Agent": "awoken-bot",
            Accept: "application/vnd.github+json"
        }
    });

    // URL public al transcriptului (GitHub Pages)
    const base = `https://${OWNER}.github.io/${REPO}`;
    const finalUrl = DIR ? `${base}/${DIR}/${fileName}` : `${base}/${fileName}`;
    return finalUrl;
}

module.exports = { uploadTranscript };
