// routes/games.js — Publisher API for game catalog

const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db/pool");
const supabase = require("../services/supabaseService");
const BUCKET_NAME = supabase.BUCKET_NAME || "game-assets";

// CRITICAL FIX: Point directly to the gameServing.js middleware path, skipping the buggy proxy
const getPlayUrl = (slug) => {
  return `/games/${slug}/index.html?v=${Date.now()}`;
};

const router = express.Router();

const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads", "games");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  dest: path.resolve(__dirname, "..", "uploads", "tmp"),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".zip") {
      return cb(new Error("Only .zip files are accepted"));
    }
    cb(null, true);
  },
});

// ─── Helpers ─────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function validateZipContents(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const hasIndex = entries.some((entry) => {
    const name = entry.entryName.replace(/^[^/]+\//, "");
    return name === "index.html" || entry.entryName === "index.html";
  });

  if (!hasIndex)
    throw new Error("ZIP must contain an index.html at the root level");

  for (const entry of entries) {
    if (entry.entryName.includes(".."))
      throw new Error("ZIP contains suspicious path traversal entries");
  }

  return { entries, zip };
}

function extractZip(zip, entries, targetDir) {
  const topLevelDirs = new Set();
  for (const entry of entries) {
    const firstPart = entry.entryName.split("/")[0];
    topLevelDirs.add(firstPart);
  }

  const hasWrapper =
    topLevelDirs.size === 1 &&
    entries.every((e) => e.entryName.startsWith([...topLevelDirs][0] + "/"));

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    let outputPath = entry.entryName;
    if (hasWrapper) {
      outputPath = outputPath.substring(outputPath.indexOf("/") + 1);
    }
    if (!outputPath) continue;

    const fullPath = path.join(targetDir, outputPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, entry.getData());
  }
}

// ─── GET /api/games ──────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const developerId = req.query.developer_id;
    let queryText = `
      SELECT 
        gc.id, gc.slug, gc.title, gc.description, gc.thumbnail_url,
        gc.min_players, gc.max_players, gc.created_at, gc.developer_id,
        COUNT(mh.id)::int AS total_plays
      FROM game_catalog gc
      LEFT JOIN match_history mh ON mh.game_slug = gc.slug
      WHERE gc.is_active = true
    `;
    const params = [];

    if (developerId) {
      params.push(developerId);
      queryText += ` AND gc.developer_id = $${params.length}`;
    }

    queryText += ` GROUP BY gc.id ORDER BY gc.created_at DESC`;

    const { rows: games } = await db.query(queryText, params);
    const gamesWithUrls = games.map((g) => ({
      ...g,
      play_url: getPlayUrl(g.slug),
    }));
    res.json({ games: gamesWithUrls });
  } catch (err) {
    console.error("[api] GET /api/games error:", err.message);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

// ─── GET /api/games/:slug ────────────────────────────────

router.get("/:slug", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM game_catalog WHERE slug = $1 AND is_active = true",
      [req.params.slug],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Game not found" });

    const { rows: stats } = await db.query(
      `
      SELECT COUNT(*)::int AS total_plays, COUNT(DISTINCT player1_uuid) + COUNT(DISTINCT player2_uuid) AS unique_players
      FROM match_history WHERE game_slug = $1
    `,
      [req.params.slug],
    );

    res.json({
      game: { ...rows[0], play_url: getPlayUrl(rows[0].slug) },
      stats: stats[0] || { total_plays: 0, unique_players: 0 },
    });
  } catch (err) {
    console.error(
      `[api] GET /api/games/${req.params.slug} error:`,
      err.message,
    );
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

// ─── POST /api/games ─────────────────────────────────────

router.post("/", upload.single("gameZip"), async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ error: 'No file uploaded. Send a .zip as "gameZip" field.' });

    const { title, description, thumbnail_url, developer_id } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ error: "Title is required" });

    let slug = slugify(title);
    const { rows: existing } = await db.query(
      "SELECT slug FROM game_catalog WHERE slug = $1",
      [slug],
    );
    if (existing.length > 0)
      slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;

    const { entries, zip } = validateZipContents(tmpPath);
    const targetDir = path.join(UPLOADS_DIR, slug);
    extractZip(zip, entries, targetDir);

    if (!fs.existsSync(path.join(targetDir, "index.html"))) {
      fs.rmSync(targetDir, { recursive: true });
      return res
        .status(400)
        .json({ error: "Extracted ZIP does not contain index.html at root" });
    }

    console.log(
      `[api] Syncing "${slug}" to Supabase bucket: ${supabase.BUCKET_NAME}...`,
    );
    const playUrl = await supabase.uploadDirectory(targetDir, `games/${slug}`);

    const { rows } = await db.query(
      `
      INSERT INTO game_catalog (slug, title, description, thumbnail_url, developer_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `,
      [
        slug,
        title.trim(),
        (description || "").trim(),
        (thumbnail_url || "").trim(),
        developer_id || null,
      ],
    );

    console.log(`[api] Published game: "${title}" → ${playUrl}`);
    res
      .status(201)
      .json({ message: "Game published successfully", game: rows[0], playUrl });
  } catch (err) {
    console.error("[api] POST /api/games error:", err.message);
    res.status(400).json({ error: err.message });
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

// ─── PUT /api/games/:slug ────────────────────────────────
router.put("/:slug", upload.single("gameZip"), async (req, res) => {
  const tmpPath = req.file?.path;
  const { slug } = req.params;
  const { developer_id } = req.body;

  try {
    if (!req.file)
      return res.status(400).json({ error: "No update payload detected." });
    if (!developer_id) return res.status(401).json({ error: "Unauthorized." });

    const { rows: existing } = await db.query(
      "SELECT id FROM game_catalog WHERE slug = $1 AND developer_id = $2",
      [slug, developer_id],
    );
    if (existing.length === 0)
      return res.status(403).json({ error: "Permission denied." });

    const { entries, zip } = validateZipContents(tmpPath);
    const targetDir = path.join(UPLOADS_DIR, slug);

    if (fs.existsSync(targetDir))
      fs.rmSync(targetDir, { recursive: true, force: true });
    extractZip(zip, entries, targetDir);

    if (!fs.existsSync(path.join(targetDir, "index.html"))) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      return res
        .status(400)
        .json({ error: "Update rejected: Missing index.html" });
    }

    console.log(`[api] Pushing Update for "${slug}" to Supabase...`);
    await supabase.uploadDirectory(targetDir, `games/${slug}`);
    res.status(200).json({ message: "Game successfully updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

// ─── DELETE /api/games/:slug ─────────────────────────────
router.delete("/:slug", async (req, res) => {
  const { slug } = req.params;
  const { developer_id } = req.body;
  try {
    if (!developer_id) return res.status(401).json({ error: "Unauthorized" });
    const { rowCount } = await db.query(
      "DELETE FROM game_catalog WHERE slug = $1 AND developer_id = $2 RETURNING id",
      [slug, developer_id],
    );
    if (rowCount === 0)
      return res.status(403).json({ error: "Deletion prevented" });

    const targetDir = path.join(UPLOADS_DIR, slug);
    if (fs.existsSync(targetDir))
      fs.rmSync(targetDir, { recursive: true, force: true });

    res.status(200).json({ message: "Catalog Entity Removed Successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to purge entity" });
  }
});

router.post("/publish", (req, res, next) => router.handle(req, res, next));
module.exports = router;
