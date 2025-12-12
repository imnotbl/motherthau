const axios = require("axios");

const OWNER = "imnotbl"; // username GitHub
const REPO = "awoken-transcript"; // repo GitHub Pages
const BRANCH = "main";
const TOKEN = process.env.GITHUB_TOKEN;

const api = axios.create({
    baseURL: "https://api.github.com",
    timeout: 10000,
    headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${TOKEN}`,
        "User-Agent": "awoken-bot"
    }
});

async function uploadTranscript(html, fileName) {
    if (!TOKEN) {
        throw new Error("GITHUB_TOKEN nu este setat.");
    }

    const path = `transcripts/${fileName}`;
    const content = Buffer.from(html, "utf8").toString("base64");

    let sha = null;

    try {
        const res = await api.get(`/repos/${OWNER}/${REPO}/contents/${path}`);
        sha = res.data.sha;
    } catch (err) {
        if (err.response?.status !== 404) {
            throw err;
        }
    }

    await api.put(`/repos/${OWNER}/${REPO}/contents/${path}`, {
        message: `${sha ? "Update" : "Add"} transcript ${fileName}`,
        content,
        branch: BRANCH,
        ...(sha && { sha })
    });

    // 🔥 LINK PUBLIC GITHUB PAGES
    return `https://${OWNER}.github.io/${REPO}/${path}`;
}

module.exports = { uploadTranscript };
