// server.js — JSONP-compatible Playwright backend (Render-ready)
import express from "express";
import { chromium } from "playwright";

const app = express();

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// -------------------- BROWSER INIT --------------------
let browser;
let page;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const ctx = await browser.newContext();
    page = await ctx.newPage();
    console.log("✅ Browser initialized (Render)");
  }
}

// -------------------- JSONP LOADER --------------------
async function loadJsonp(url) {
  const callbackName = "cb" + Date.now();

  return new Promise(async (resolve, reject) => {
    try {
      await page.exposeFunction(callbackName, (data) => {
        resolve(data.d);
      });

      await page.addScriptTag({ url: `${url}&callback=${callbackName}` });
    } catch (err) {
      reject(err);
    }
  });
}

// -------------------- ROUTES --------------------

// Faculties
app.get("/faculties", async (req, res) => {
  try {
    await initBrowser();
    const url =
      "https://vnz.osvita.net/WidgetSchedule.asmx/GetEmployeeFaculties?aVuzID=11613";
    const data = await loadJsonp(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Groups
app.get("/groups", async (req, res) => {
  try {
    await initBrowser();

    const { facultyId, form, course } = req.query;

    const url =
      `https://vnz.osvita.net/WidgetSchedule.asmx/GetStudyGroups` +
      `?aVuzID=11613` +
      `&aFacultyID="${facultyId}"` +
      `&aEducationForm="${form}"` +
      `&aCourse="${course}"` +
      `&aGiveStudyTimes=false`;

    const data = await loadJsonp(url);
    res.json(data.studyGroups || []);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Schedule
app.get("/schedule", async (req, res) => {
  try {
    await initBrowser();

    const { groupId, start, end } = req.query;
    const timestamp = Date.now();

    const url =
      `https://vnz.osvita.net/WidgetSchedule.asmx/GetScheduleDataX` +
      `?aVuzID=11613` +
      `&aStudyGroupID="${groupId}"` +
      `&aStartDate="${start}"` +
      `&aEndDate="${end}"` +
      `&aStudyTypeID=null` +
      `&_=${timestamp}`;

    const data = await loadJsonp(url);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
