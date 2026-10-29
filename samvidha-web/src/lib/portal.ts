/**
 * Samvidha Portal Scraper
 * ------------------------
 * This module traps the IARE Samvidha portal endpoints and extracts live
 * student data (attendance, CIE marks, profile, timetable, results, PDFs).
 *
 * No database is used. Every request is made live to the Samvidha portal
 * using the authenticated PHPSESSID session obtained at login.
 */

const SAMVIDHA_HOST = "https://samvidha.iare.ac.in";

import * as http from "http";
import https from "https";
import querystring from "querystring";

export interface PortalSession {
  username: string;
  phpSessId: string;
  csrfToken: string;
  loggedIn: boolean;
}

/**
 * Perform a GET request to the Samvidha portal with the session cookie.
 * Returns status, body, and raw headers (needed to capture set-cookie).
 */
export async function samvidhaGet(
  session: PortalSession,
  path: string
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(SAMVIDHA_HOST + path);
    const opts = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + (url.search || ""),
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: session.phpSessId ? `PHPSESSID=${session.phpSessId}` : "",
      },
    };

    const req = https.request(opts, (res: http.IncomingMessage) => {
      let data = "";
      res.on("data", (chunk: string | Buffer) => (data += chunk.toString()));
      res.on("end", () =>
        resolve({ status: res.statusCode || 200, body: data, headers: res.headers })
      );
    });

    req.on("error", reject);
    req.end();
  });
}

/**
 * Perform a POST form request to the Samvidha portal.
 */
export async function samvidhaPost(
  session: PortalSession,
  path: string,
  body: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(SAMVIDHA_HOST + path);
    const form = querystring.stringify(body);

    const opts = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-CSRF-Token": session.csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: `PHPSESSID=${session.phpSessId}`,
        "Content-Length": Buffer.byteLength(form),
      },
    };

    const req = https.request(opts, (res: http.IncomingMessage) => {
      let data = "";
      res.on("data", (chunk: string | Buffer) => (data += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode || 200, body: data }));
    });

    req.on("error", reject);
    req.write(form);
    req.end();
  });
}

/**
 * Extract the CSRF token from a Samvidha HTML page.
 */
function extractCsrfToken(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/);
  return m ? m[1] : null;
}

/**
 * Extract the PHPSESSID from a response's set-cookie headers is handled by
 * the caller via the login flow. Here we just parse cookies from a header string.
 */
function extractPhpSessId(setCookie: string | string[] | undefined): string | null {
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const m = c.match(/PHPSESSID=([^;]+)/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Log in to the Samvidha portal and return an authenticated session.
 */
export async function loginToSamvidha(
  username: string,
  password: string
): Promise<{ success: boolean; session?: PortalSession; error?: string; portalStatus?: number; portalBody?: string }> {
  try {
    // Step 1: GET homepage to obtain CSRF token and initial session (PHPSESSID)
    const homeRes = await fetch(`${SAMVIDHA_HOST}/`, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "manual",
    });

    const setCookie = homeRes.headers.get("set-cookie") || "";
    const phpSessId = extractPhpSessId(setCookie);
    const homeBody = await homeRes.text();
    const csrfToken = extractCsrfToken(homeBody);

    if (!csrfToken) {
      return {
        success: false,
        error: "Could not read CSRF token from Samvidha login page.",
        portalStatus: homeRes.status,
        portalBody: homeBody.slice(0, 500),
      };
    }

    // Step 2: POST login credentials using the same session cookie
    const form = new URLSearchParams({ username, password }).toString();
    const loginRes = await fetch(`${SAMVIDHA_HOST}/pages/login/checkUser.php`, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-CSRF-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://samvidha.iare.ac.in",
        "Referer": "https://samvidha.iare.ac.in/",
        Cookie: phpSessId ? `PHPSESSID=${phpSessId}` : "",
      },
      body: form,
      redirect: "manual",
    });

    const loginSetCookie = loginRes.headers.get("set-cookie") || "";
    const loginSessId = extractPhpSessId(loginSetCookie);
    const finalSessId = (loginSessId || phpSessId || "") as string;

    const loginBody = await loginRes.text();

    let parsed: { status?: number | string; msg?: string } = {};
    try {
      parsed = JSON.parse(loginBody);
    } catch {
      parsed = { status: 0, msg: loginBody };
    }

    const statusNum = Number(parsed.status);
    if (statusNum !== 1) {
      const errorMsg =
        statusNum === 2
          ? "Your Login is expired or not active. Please contact administrator!"
          : parsed.msg || "Invalid username or password.";
      return {
        success: false,
        error: errorMsg,
        portalStatus: loginRes.status,
        portalBody: loginBody,
      };
    }

    const session: PortalSession = {
      username,
      phpSessId: finalSessId,
      csrfToken,
      loggedIn: true,
    };
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || "Login failed." };
  }
}

/**
 * Strip HTML tags into plain text.
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parse the attendance page HTML into structured course attendance data.
 */
export function parseAttendance(html: string) {
  const studentInfo: Record<string, string> = {};
  const infoMatch = html.match(/Rollno\s*([^\s<]+)[\s\S]*?Name\s*([^<]+)/);
  if (infoMatch) {
    studentInfo.rollno = infoMatch[1].trim();
    studentInfo.name = infoMatch[2].trim();
  }

  const semesterMatch = html.match(/Semester\s*([^<]+)/);
  if (semesterMatch) studentInfo.semester = semesterMatch[1].trim();

  const regMatch = html.match(/Regulation\s*([^<]+)/);
  if (regMatch) studentInfo.regulation = regMatch[1].trim();

  const ayMatch = html.match(/Academic Year\s*([^<]+)/);
  if (ayMatch) studentInfo.academicYear = ayMatch[1].trim();

  // Extract the attendance data table
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  const courses: Array<{
    sNo: number;
    courseCode: string;
    courseName: string;
    courseType: string;
    courseCategory: string;
    conducted: number;
    attended: number;
    percentage: number;
    status: string;
  }> = [];

  if (tableMatch) {
    // The second table is the attendance data table (first is student info)
    const dataTable = tableMatch[tableMatch.length - 1];
    const rows = [...dataTable.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
        stripTags(c[1])
      );
      if (cells.length >= 9 && !isNaN(Number(cells[0]))) {
        courses.push({
          sNo: Number(cells[0]),
          courseCode: cells[1],
          courseName: cells[2],
          courseType: cells[3],
          courseCategory: cells[4],
          conducted: Number(cells[5]) || 0,
          attended: Number(cells[6]) || 0,
          percentage: Number(cells[7]) || 0,
          status: cells[8],
        });
      }
    }
  }

  return { studentInfo, courses };
}

/**
 * Fetch live attendance from the Samvidha portal.
 */
export async function fetchAttendance(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=stud_att_STD");
  return parseAttendance(res.body);
}

/**
 * Parse CIE marks page HTML into structured data.
 */
export function parseCieMarks(html: string) {
  const studentInfo: Record<string, string> = {};
  const nameMatch = html.match(/Name\s*\|\s*\|([^|]+)/);
  if (nameMatch) studentInfo.name = stripTags(nameMatch[1]);

  const rollMatch = html.match(/Roll Number\s*\|\s*\|([^|]+)/);
  if (rollMatch) studentInfo.rollno = stripTags(rollMatch[1]);

  const branchMatch = html.match(/Branch\s*\|\s*\|([^|]+)/);
  if (branchMatch) studentInfo.branch = stripTags(branchMatch[1]);

  const regulationMatch = html.match(/Regulation\s*\|\s*\|([^|]+)/);
  if (regulationMatch) studentInfo.regulation = stripTags(regulationMatch[1]);

  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
  const semesters: Array<{
    semester: string;
    academicYear: string;
    theory: Array<{
      sNo: number;
      courseCode: string;
      courseName: string;
      cieI: string;
      aatI1: string;
      aatI2: string;
      cieII: string;
      aatII1: string;
      aatII2: string;
      total: string;
    }>;
    labs: Array<{
      sNo: number;
      courseCode: string;
      courseName: string;
      dayToDay: string;
      examMarks: string;
      total: string;
    }>;
  }> = [];

  for (const t of tables) {
    const tableHtml = t[0];
    const semMatch = tableHtml.match(/Semester\s*-\s*([^<|]+)/);
    const ayMatch = tableHtml.match(/Academic Year\s*-\s*([^<|]+)/);
    if (!semMatch) continue;

    const isTheory = tableHtml.includes("Continuous Internal Assessment Marks (Theory)");
    const isLab = tableHtml.includes("Laboratory Marks") || tableHtml.includes("Practical");

    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const theoryList: any[] = [];
    const labList: any[] = [];

    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
        stripTags(c[1])
      );
      if (cells.length < 2) continue;

      // Theory rows: S.No | Course Code | Course Name | CIE-I | AAT:I-I | AAT:I-II | CIE-II | AAT:II-I | AAT:II-II | Total
      if (isTheory && !isNaN(Number(cells[0])) && cells.length >= 10) {
        theoryList.push({
          sNo: Number(cells[0]),
          courseCode: cells[1],
          courseName: cells[2],
          cieI: cells[3],
          aatI1: cells[4],
          aatI2: cells[5],
          cieII: cells[6],
          aatII1: cells[7],
          aatII2: cells[8],
          total: cells[9],
        });
      }
      // Lab rows: S.No | Course Code | Course Name | Day to Day | Exam Marks | Total
      if (isLab && !isNaN(Number(cells[0])) && cells.length >= 6) {
        labList.push({
          sNo: Number(cells[0]),
          courseCode: cells[1],
          courseName: cells[2],
          dayToDay: cells[3],
          examMarks: cells[4],
          total: cells[5],
        });
      }
    }

    semesters.push({
      semester: stripTags(semMatch[1]),
      academicYear: stripTags(ayMatch ? ayMatch[1] : ""),
      theory: theoryList,
      labs: labList,
    });
  }

  return { studentInfo, semesters };
}

/**
 * Fetch live CIE marks from the Samvidha portal.
 */
export async function fetchCieMarks(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=cie_marks_ug");
  return parseCieMarks(res.body);
}

/**
 * Parse the profile page HTML into student details + certificates.
 */
export function parseProfile(html: string) {
  const details: Record<string, string> = {};

  const nameMatch = html.match(/>([A-Z][A-Z ]+)\s*\|\s*([A-Z0-9]+)\s*<\/span>/);
  if (nameMatch) {
    details.name = nameMatch[1].trim();
    details.rollno = nameMatch[2].trim();
  }
  // Try the sidebar header pattern: NAME ROLLNO BRANCH SECTION DEPT
  const headerMatch = html.match(/([A-Z][A-Za-z ]+)\s+([A-Z0-9]{10})\s+([^<]{2,60})/);
  if (headerMatch) {
    details.name = headerMatch[1].trim();
    details.rollno = headerMatch[2].trim();
    details.department = headerMatch[3].trim();
  }

  const rollOnly = html.match(/24951A[0-9A-Z]{3}/);
  if (rollOnly && !details.rollno) details.rollno = rollOnly[0];

  // Certificates table
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
  const certificates: Array<{ sNo: number; name: string; status: string }> = [];
  for (const t of tables) {
    const rows = [...t[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
        c[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      );
      if (cells.length >= 2 && !isNaN(Number(cells[0])) && cells[1]) {
        certificates.push({
          sNo: Number(cells[0]),
          name: cells[1] || "",
          status: cells[2] || "",
        });
      }
    }
  }

  return { details, certificates };
}

/**
 * Fetch live profile from the Samvidha portal.
 */
export async function fetchProfile(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=profile");
  return { html: res.body, parsed: parseProfile(res.body) };
}

/**
 * Fetch live timetable from the Samvidha portal.
 */
export async function fetchTimetable(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=TT_std");
  return { html: res.body };
}

/**
 * Fetch live exam results from the Samvidha portal.
 */
export async function fetchExamResults(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=exam_results");
  return { html: res.body };
}

/**
 * Fetch live My Box (PDFs/notifications) from the Samvidha portal.
 */
export async function fetchMyBox(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=mybox");
  return { html: res.body };
}

/**
 * Log out from the Samvidha portal.
 */
export async function logoutFromSamvidha(session: PortalSession) {
  try {
    await samvidhaGet(session, "/logout");
  } catch {
    // ignore
  }
}
