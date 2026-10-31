/**
 * Samvidha Portal Scraper — IARE Intelligence
 * --------------------------------------------
 * Traps the IARE Samvidha portal endpoints and extracts live student data
 * (attendance, credit register / CGPA, timetable, question papers, grade
 * sheets, CIA marks, PAT/CDC, biometric, profile).
 *
 * No database is used. Every request is made live to the Samvidha portal
 * using the authenticated PHPSESSID session obtained at login.
 */

const SAMVIDHA_HOST = "https://samvidha.iare.ac.in";

export interface PortalSession {
  username: string;
  phpSessId: string;
  csrfToken: string;
  loggedIn: boolean;
}

/* ------------------------------------------------------------------ */
/* Low level request helpers                                           */
/* ------------------------------------------------------------------ */

export async function samvidhaGet(
  session: PortalSession,
  path: string
): Promise<{ status: number; body: string }> {
  const res = await fetch(SAMVIDHA_HOST + path, {
    redirect: "manual",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: session.phpSessId ? `PHPSESSID=${session.phpSessId}` : "",
    },
  });
  return { status: res.status, body: await res.text() };
}

export async function samvidhaPost(
  session: PortalSession,
  path: string,
  body: Record<string, string>,
  referer = "/home"
): Promise<{ status: number; body: string }> {
  const form = new URLSearchParams(body).toString();
  const res = await fetch(SAMVIDHA_HOST + path, {
    redirect: "manual",
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-CSRF-Token": session.csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      Origin: SAMVIDHA_HOST,
      Referer: SAMVIDHA_HOST + referer,
      Cookie: `PHPSESSID=${session.phpSessId}`,
    },
    body: form,
  });
  return { status: res.status, body: await res.text() };
}

function extractCsrfToken(html: string): string | null {
  const m = html.match(
    /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/
  );
  return m ? m[1] : null;
}

function extractPhpSessId(setCookie: string | string[] | undefined): string | null {
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const m = c.match(/PHPSESSID=([^;]+)/);
    if (m) return m[1];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export async function loginToSamvidha(
  username: string,
  password: string
): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
  try {
    const homeRes = await fetch(`${SAMVIDHA_HOST}/`, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const setCookie =
      homeRes.headers.get("set-cookie") ||
      (homeRes.headers.getSetCookie?.() || [])[0] ||
      "";
    const phpSessId = extractPhpSessId(setCookie);
    const homeBody = await homeRes.text();
    const csrfToken = extractCsrfToken(homeBody);

    if (!csrfToken) {
      return { success: false, error: "Could not read CSRF token from Samvidha login page." };
    }

    const loginRes = await fetch(`${SAMVIDHA_HOST}/pages/login/checkUser.php`, {
      redirect: "manual",
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-CSRF-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Origin: SAMVIDHA_HOST,
        Referer: SAMVIDHA_HOST + "/",
        Cookie: phpSessId ? `PHPSESSID=${phpSessId}` : "",
      },
      body: new URLSearchParams({ username, password }).toString(),
    });

    const loginSetCookie =
      loginRes.headers.get("set-cookie") ||
      (loginRes.headers.getSetCookie?.() || [])[0] ||
      "";
    const loginSessId = extractPhpSessId(loginSetCookie);
    const finalSessId = loginSessId || phpSessId || "";

    const loginBody = await loginRes.text();
    let parsed: { status?: number | string; msg?: string } = {};
    try {
      parsed = JSON.parse(loginBody);
    } catch {
      parsed = { status: 0, msg: loginBody };
    }

    if (Number(parsed.status) !== 1) {
      const errorMsg =
        Number(parsed.status) === 2
          ? "Your Login is expired or not active. Please contact administrator!"
          : parsed.msg || "Invalid username or password.";
      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      session: { username, phpSessId: finalSessId, csrfToken, loggedIn: true },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Login failed." };
  }
}

/* ------------------------------------------------------------------ */
/* HTML helpers                                                        */
/* ------------------------------------------------------------------ */

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getTables(html: string): string[] {
  return [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => m[0]);
}

function getRows(tableHtml: string): string[][] {
  return [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]))
  );
}

/* ------------------------------------------------------------------ */
/* Profile / identity                                                  */
/* ------------------------------------------------------------------ */

export function parseHomeIdentity(html: string) {
  // Sidebar pattern: NAME NAME ROLLNO "B.Tech V Semester - A Section" "Branch"
  const identity: Record<string, string> = {};
  const nameMatch = html.match(/KOLA|([A-Z][A-Z ]{4,})\s+([A-Z0-9]{10})\s+([A-Za-z. ]+Section)/);
  const m = html.match(
    /([A-Z][A-Z .]+?)\s+([A-Z][A-Z .]+?)\s+(2[0-9][0-9]{2}[A-Z][0-9A-Z]{2}[A-Z0-9])\s+(B\.Tech[^<]*?Section)\s+([\s\S]*?)<\//i
  );
  if (m) {
    identity.name = m[1].trim();
    identity.rollno = m[3].trim();
    identity.classInfo = m[4].trim();
    identity.branch = stripTags(m[5]).trim();
  } else if (nameMatch) {
    identity.rollno = nameMatch[2];
  }
  if (!identity.rollno) {
    const rollOnly = html.match(/\b(2[0-9]{3}[A-Z][0-9A-Z]{2}[A-Z0-9])\b/);
    if (rollOnly) identity.rollno = rollOnly[1];
  }
  return identity;
}

export function parseProfile(html: string) {
  const details: Record<string, string> = {};
  const fields: Array<[string, RegExp]> = [
    ["rollno", /Roll Number\s*([A-Z0-9]+)/],
    ["abcId", /ABC ID\s*([0-9-]+)/],
    ["aebasId", /JNTUH AEBAS\s*([0-9-]+)/],
    ["name", /Name\s*([A-Z][A-Z ]+[A-Z])\s*(AAdhar|Branch|Gender)/],
    ["aadhar", /AAdhar Number\s*([0-9 X]+)/],
    ["branch", /Branch\s*([A-Za-z ]+?)\s*(Year|Section|Gender)/],
    ["yearSem", /Year\/Sem\s*([A-Za-z0-9 .]+?)\s*Section/],
    ["section", /Section\s*([A-Z])\s*Gender/],
    ["gender", /Gender\s*([A-Z])\s*Father/],
    ["fatherName", /Father Name\s*([A-Z][A-Za-z .]+?)\s*Mother/],
    ["motherName", /Mother Name\s*([A-Z][A-Za-z .]+?)\s*Father Occupation Type/],
    ["fatherOccupationType", /Father Occupation Type\s*([A-Za-z ]+?)\s*Father Occupation/],
    ["fatherOccupation", /Father Occupation\s*([A-Za-z ]+?)\s*(Mother Occupation Type|Phone|$)/],
    ["motherOccupationType", /Mother Occupation Type\s*([A-Za-z ]+?)\s*(Mother Occupation|Phone|$)/],
    ["phone", /Phone Number\s*([0-9]+)/],
    ["email", /Email\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/],
    ["dob", /Date of Birth\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/],
    ["admissionYear", /Admission Year\s*([0-9]{4})/],
  ];
  const text = stripTags(html);
  for (const [key, re] of fields) {
    const m = text.match(re);
    if (m) details[key] = m[1].trim();
  }
  const nameRoll = html.match(/>([A-Z][A-Z .]+)\s*\|\s*([A-Z0-9]{10})</);
  if (nameRoll && !details.name) details.name = nameRoll[1].trim();
  if (nameRoll) details.rollno = nameRoll[2].trim();

  // Certificates table
  const certificates: Array<{ sNo: number; name: string; status: string }> = [];
  for (const t of getTables(html)) {
    for (const cells of getRows(t)) {
      if (cells.length >= 3 && !isNaN(Number(cells[0])) && cells[1]) {
        certificates.push({ sNo: Number(cells[0]), name: cells[1], status: cells[2] });
      }
    }
  }
  return { details, certificates };
}

export async function fetchProfile(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=profile");
  return parseProfile(res.body);
}

/* ------------------------------------------------------------------ */
/* Attendance (subject-wise summary + day-wise register)               */
/* ------------------------------------------------------------------ */

export interface AttendanceSubject {
  sNo: number;
  courseCode: string;
  courseName: string;
  courseType: string;
  courseCategory: string;
  conducted: number;
  attended: number;
  percentage: number;
  status: string;
}

export interface RegisterEntry {
  date: string;
  period: string;
  course: string;
  status: string; // P / A / P+x2 etc.
}

export interface AttendanceData {
  studentInfo: Record<string, string>;
  academicYear: string;
  semesterLastDate: string;
  portalNotice: string;
  hasData: boolean;
  subjects: AttendanceSubject[];
  register: RegisterEntry[];
}

export function parseAttendance(html: string): AttendanceData {
  const data: AttendanceData = {
    studentInfo: {},
    academicYear: "",
    semesterLastDate: "",
    portalNotice: "",
    hasData: false,
    subjects: [],
    register: [],
  };

  const ay = stripTags(html).match(/Academic Year\s*(\d{4}-\d{2})/);
  if (ay) data.academicYear = ay[1];
  const sld = stripTags(html).match(/Semester Last Date\s*(\d{4}-\d{2}-\d{2})/);
  if (sld) data.semesterLastDate = sld[1];
  if (/Current Semester academic days are completed/.test(html)) {
    data.portalNotice =
      "Current Semester academic days are completed. This will be enabled in next semester.";
  }

  const infoMatch = html.match(/Rollno\s*([^\s<]+)[\s\S]*?Name\s*([^<]+)/);
  if (infoMatch) {
    data.studentInfo.rollno = infoMatch[1].trim();
    data.studentInfo.name = stripTags(infoMatch[2]);
  }

  for (const t of getTables(html)) {
    const rows = getRows(t);
    const header = rows[0] ? rows[0].join(" | ").toUpperCase() : "";

    // Subject-wise summary: S.No | Course Code | Course Name | Type | Category | Conducted | Attended | % | Status
    if (header.includes("COURSE CODE") && header.includes("CONDUCTED")) {
      for (const cells of rows.slice(1)) {
        if (cells.length >= 9 && !isNaN(Number(cells[0]))) {
          data.subjects.push({
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

    // Day-wise register: S.No | Course | Date | Period | Status  (or Date | Course | Period | Status)
    if (header.includes("DATE") && (header.includes("PERIOD") || header.includes("STATUS"))) {
      const dateIdx = rows[0].findIndex((c) => /date/i.test(c));
      const periodIdx = rows[0].findIndex((c) => /period/i.test(c));
      const courseIdx = rows[0].findIndex((c) => /course/i.test(c));
      const statusIdx = rows[0].findIndex((c) => /status/i.test(c));
      for (const cells of rows.slice(1)) {
        if (cells.length < 3) continue;
        const date = dateIdx >= 0 ? cells[dateIdx] : cells[1];
        const period = periodIdx >= 0 ? cells[periodIdx] : cells[2];
        const course = courseIdx >= 0 ? cells[courseIdx] : "";
        const status = statusIdx >= 0 ? cells[statusIdx] : cells[cells.length - 1];
        if (date && /\d/.test(date)) {
          data.register.push({ date, period, course, status });
        }
      }
    }
  }

  data.hasData = data.subjects.length > 0 || data.register.length > 0;
  return data;
}

export async function fetchAttendance(session: PortalSession): Promise<AttendanceData> {
  const res = await samvidhaGet(session, "/home?action=stud_att_STD");
  return parseAttendance(res.body);
}

/* ------------------------------------------------------------------ */
/* Credit register — semesters, grades, SGPA/CGPA history              */
/* ------------------------------------------------------------------ */

export interface CreditCourse {
  sNo: number;
  courseCode: string;
  courseName: string;
  grade: string;
  gradePoint: number | null;
  status: string;
  credits: number;
  attendance: number | null;
}

export interface CreditSemester {
  semester: string;
  courses: CreditCourse[];
  totalCredits: number;
  sgpa: number | null;
  cgpa: number | null;
  // exact calculation: sum(credits * gradePoint) / sum(credits)
  weightedPoints: number;
  evaluatedCredits: number;
}

export interface CreditRegisterData {
  rollNumber: string;
  name: string;
  branch: string;
  semesters: CreditSemester[];
  cgpa: number | null;
  pendingCourses: Array<{ category: string; required: string; registered: string; pending: string }>;
  gradeScale: Array<{ range: string; point: string; letter: string }>;
}

export function parseCreditRegister(html: string): CreditRegisterData {
  const out: CreditRegisterData = {
    rollNumber: "",
    name: "",
    branch: "",
    semesters: [],
    cgpa: null,
    pendingCourses: [],
    gradeScale: [],
  };

  const text = stripTags(html);
  const roll = text.match(/Roll Number\s*([A-Z0-9]+)/) || text.match(/Roll\s*([A-Z0-9]{10})/);
  if (roll) out.rollNumber = roll[1];
  const nameM = text.match(/Name\s*([A-Z][A-Z ]+[A-Z])\s*(Branch|Computer|Information|Electronics|Mechanical|Civil)/);
  if (nameM) out.name = nameM[1].trim();
  const branchM = text.match(/Branch\s+([A-Za-z ]+?)\s+(?:S\.No|Year\/Sem|Section|Gender|Regulation|Hall Ticket|Semester|Roll|Name)/);
  if (branchM) out.branch = branchM[1].trim();

  const tables = getTables(html);
  const mainTable = tables.find((t) => t.includes("Course Code") && t.includes("SGPA"));

  if (mainTable) {
    const rows = getRows(mainTable);
    let current: CreditSemester | null = null;

    for (const cells of rows) {
      const joined = cells.join(" | ");

      // Semester header row e.g. "I SEMESTER"
      const semHeader = joined.match(/^\s*(I|II|III|IV|V|VI|VII|VIII)\s+SEMESTER\s*$/i);
      if (semHeader) {
        current = {
          semester: semHeader[1] + " SEMESTER",
          courses: [],
          totalCredits: 0,
          sgpa: null,
          cgpa: null,
          weightedPoints: 0,
          evaluatedCredits: 0,
        };
        out.semesters.push(current);
        continue;
      }

      if (!current) continue;

      // SGPA / CGPA rows
      const sgpaM = joined.match(/Semester Grade Point Average \(SGPA\)\s*:\s*([0-9.]+)/i);
      if (sgpaM) {
        current.sgpa = Number(sgpaM[1]);
        continue;
      }
      const cgpaM = joined.match(/Cumulative Grade Point Average \(CGPA\)\s*:\s*([0-9.]+)/i);
      if (cgpaM) {
        current.cgpa = Number(cgpaM[1]);
        out.cgpa = Number(cgpaM[1]);
        continue;
      }
      if (/^Total/.test(joined)) {
        const creditsCell = cells.find((c) => /^[0-9.]+$/.test(c));
        if (creditsCell) current.totalCredits = Number(creditsCell);
        continue;
      }

      // Course row: sno | code | name | grade | gp | status | credits | attendance%
      if (cells.length >= 8 && !isNaN(Number(cells[0])) && cells[1] && /^[A-Z]{2,5}[0-9]/.test(cells[1])) {
        const gp = cells[4] && !isNaN(Number(cells[4])) ? Number(cells[4]) : null;
        const credits = Number(cells[6]) || 0;
        const att = cells[7] && !isNaN(Number(cells[7])) ? Number(cells[7]) : null;
        const course: CreditCourse = {
          sNo: Number(cells[0]),
          courseCode: cells[1],
          courseName: cells[2],
          grade: cells[3],
          gradePoint: gp,
          status: cells[5],
          credits,
          attendance: att,
        };
        current.courses.push(course);
        if (gp !== null) {
          current.weightedPoints += credits * gp;
          current.evaluatedCredits += credits;
        }
      }
    }
  }

  // Pending/completion table
  const pendingTable = tables.find((t) => t.includes("Yet To Be Registered"));
  if (pendingTable) {
    for (const cells of getRows(pendingTable)) {
      if (cells.length >= 4 && !/Course Category/.test(cells[0]) && cells[0]) {
        out.pendingCourses.push({
          category: cells[0],
          required: cells[1],
          registered: cells[2],
          pending: cells[3],
        });
      }
    }
  }

  // Grade scale table
  const scaleTable = tables.find((t) => t.includes("Letter Grades"));
  if (scaleTable) {
    const rows = getRows(scaleTable);
    const findRow = (label: string) => rows.find((r) => r[0] && r[0].toLowerCase().trim() === label)?.slice(1) || [];
    const ranges = findRow("range of marks");
    const points = findRow("grade point");
    const letters = findRow("letter grade");
    for (let i = 0; i < letters.length; i++) {
      out.gradeScale.push({
        range: ranges[i] || "",
        point: points[i] || "",
        letter: letters[i] || "",
      });
    }
  }

  return out;
}

export async function fetchCreditRegister(session: PortalSession): Promise<CreditRegisterData> {
  const res = await samvidhaGet(session, "/home?action=credit_register");
  return parseCreditRegister(res.body);
}

/* ------------------------------------------------------------------ */
/* Exam results — exam codes + grade sheets                            */
/* ------------------------------------------------------------------ */

export async function fetchExamCodeList(session: PortalSession) {
  const res = await samvidhaGet(
    session,
    `/pages/student/exam_result/ajax/examresults?action=exam_code_list&rollno=${encodeURIComponent(session.username)}`
  );
  try {
    const json = JSON.parse(res.body);
    return (json.data || []) as Array<{ sno: number; exam_title: string; exam_code: string }>;
  } catch {
    return [];
  }
}

export function parseGradeSheet(html: string) {
  const text = stripTags(html);
  const sheet: {
    rollNumber: string;
    name: string;
    branch: string;
    sgpa: number | null;
    courses: Array<{ sNo: number; courseCode: string; courseName: string; grade: string; gradePoint: number | null; status: string; credits: number }>;
  } = {
    rollNumber: "",
    name: "",
    branch: "",
    sgpa: null,
    courses: [],
  };

  const roll = text.match(/Roll Number\s*([A-Z0-9]+)/);
  if (roll) sheet.rollNumber = roll[1];
  const nameM = text.match(/Name\s*([A-Z][A-Z ]+[A-Z])\s*(Branch|COMPUTER|x)/);
  if (nameM) sheet.name = nameM[1].trim();
  const branchM = text.match(/Branch\s*(COMPUTER SCIENCE AND ENGINEERING|[A-Z ]+)/);
  if (branchM) sheet.branch = branchM[1].trim();
  const sgpaM = text.match(/Semester Grade Point Average \(SGPA\)\s*:\s*([0-9.]+)/i);
  if (sgpaM) sheet.sgpa = Number(sgpaM[1]);

  for (const t of getTables(html)) {
    for (const cells of getRows(t)) {
      if (cells.length >= 7 && !isNaN(Number(cells[0])) && /^[A-Z]{2,5}[0-9]/.test(cells[1] || "")) {
        sheet.courses.push({
          sNo: Number(cells[0]),
          courseCode: cells[1],
          courseName: cells[2],
          grade: cells[3],
          gradePoint: !isNaN(Number(cells[4])) ? Number(cells[4]) : null,
          status: cells[5],
          credits: Number(cells[6]) || 0,
        });
      }
    }
  }
  return sheet;
}

export async function fetchGradeSheet(session: PortalSession, examCode: string, examTitle: string) {
  const res = await samvidhaPost(
    session,
    "/pages/student/exam_result/ajax/grade_sheet",
    {
      rollno: session.username,
      exam_code: examCode,
      exam_title: examTitle,
      action: "result_form",
    },
    "/home?action=exam_results"
  );
  return parseGradeSheet(res.body);
}

/* ------------------------------------------------------------------ */
/* Question papers & solutions                                         */
/* ------------------------------------------------------------------ */

export interface QpExamOption {
  value: string; // e.g. BT5CIE1AUG26:2026-27:cie
  label: string; // e.g. CIE : BT5CIE1AUG26 - B.Tech V SEMESTER CIE-I EXAMINATIONS AUG 2026
  kind: "CIE" | "SEE";
}

export function parseQpOptions(html: string): QpExamOption[] {
  const options: QpExamOption[] = [];
  const selectMatch = html.match(/<select[^>]*name=["']exam_code["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!selectMatch) return options;
  for (const m of selectMatch[1].matchAll(/<option value="([^"]*)"[^>]*>([^<]+)<\/option>/g)) {
    if (!m[1]) continue;
    const kind: "CIE" | "SEE" = m[1].endsWith(":see") ? "SEE" : "CIE";
    options.push({ value: m[1], label: stripTags(m[2]), kind });
  }
  return options;
}

/**
 * The qp_scheme AJAX needs the department id the portal's own page JS uses
 * for the signed-in student. Parse it from the page instead of hardcoding.
 */
let qpDeptIdCache: string | null = null;

async function getQpDeptId(session: PortalSession): Promise<string> {
  if (qpDeptIdCache) return qpDeptIdCache;
  try {
    const page = await samvidhaGet(session, "/home?action=qp_scheme");
    const m =
      page.body.match(/dept_id['"]\]?\s*[:=]\s*['"]?(\d+)/i) ||
      page.body.match(/dept_id:\s*(\d+)/i);
    qpDeptIdCache = m ? m[1] : "";
  } catch {
    qpDeptIdCache = "";
  }
  return qpDeptIdCache;
}

export async function fetchQpList(session: PortalSession, examCode: string) {
  const deptId = await getQpDeptId(session);
  const payload: Record<string, string> = { exam_code: examCode, action: "get_qp_scheme_list" };
  if (deptId) payload.dept_id = deptId;
  const res = await samvidhaPost(
    session,
    "/pages/student/exam_result/ajax/qp_scheme.php",
    payload,
    "/home?action=qp_scheme"
  );
  try {
    const json = JSON.parse(res.body);
    return (json.data || []) as Array<{
      sno: number;
      sub_code: string;
      sub_title: string;
      exam_date: string;
      qp: string;
      solution: string;
    }>;
  } catch {
    return [];
  }
}

export async function fetchQpPage(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=qp_scheme");
  return parseQpOptions(res.body);
}

/* ------------------------------------------------------------------ */
/* Timetable                                                           */
/* ------------------------------------------------------------------ */

export interface TimetableCell {
  shortCode: string;
  branch: string;
  room: string;
  faculty: string;
}

export interface TimetableRow {
  day: string;
  date: string;
  cells: (TimetableCell | null)[];
}

export interface TimetableData {
  academicYear: string;
  section: string;
  periods: string[];
  rows: TimetableRow[];
  legend: Array<{ sNo: number; code: string; name: string; shortCode: string; staffId: string; staffName: string }>;
  blocks: Array<{ block: string; slots: Array<{ slot: string; time: string }> }>;
  ayOptions: string[];
  sectionOptions: Array<{ value: string; label: string }>;
}

export function parseTimetableCell(raw: string): TimetableCell | null {
  const text = stripTags(raw);
  if (!text) return null;
  // Pattern: "CAD (CSE-V-SEM-A) Room : 5108 Faculty Id : IARE11088" (faculty/room lists may be slash separated)
  const m = text.match(
    /^\s*([A-Z0-9 \/]+?)\s*\(([^)]+)\)\s*Room\s*:\s*(.*?)\s*Faculty Id\s*:\s*(.+)$/i
  );
  if (m) {
    return { shortCode: m[1].trim(), branch: m[2].trim(), room: m[3].trim(), faculty: m[4].trim() };
  }
  return { shortCode: text.slice(0, 40), branch: "", room: "", faculty: "" };
}

export function parseTimetable(html: string): TimetableData {
  const data: TimetableData = {
    academicYear: "",
    section: "",
    periods: [],
    rows: [],
    legend: [],
    blocks: [],
    ayOptions: [],
    sectionOptions: [],
  };

  // Select options
  const aySelect = html.match(/<select[^>]*id=["']ay["'][^>]*>([\s\S]*?)<\/select>/i);
  if (aySelect) {
    for (const m of aySelect[1].matchAll(/<option value="([^"]+)"/g)) if (m[1]) data.academicYear = data.academicYear || m[1];
    for (const m of aySelect[1].matchAll(/<option value="([^"]+)"[^>]*selected/gi)) data.academicYear = m[1];
    for (const m of aySelect[1].matchAll(/<option value="([^"]+)"[^>]*>/g)) if (m[1]) data.ayOptions.push(m[1]);
  }
  const secSelect = html.match(/<select[^>]*id=["']sec_data["'][^>]*>([\s\S]*?)<\/select>/i);
  if (secSelect) {
    for (const m of secSelect[1].matchAll(/<option\s+value="?([^">]*)"?[^>]*>([^<]*)<\/option>/g)) {
      const val = m[1].trim();
      if (val) data.sectionOptions.push({ value: val, label: stripTags(m[2]) });
    }
  }

  const tables = getTables(html);
  for (const t of tables) {
    const rows = getRows(t);

    // Main timetable grid: header has DAY/PERIOD
    const header = rows[0]?.join(" | ").toUpperCase() || "";
    const gridHeaderIdx = rows.findIndex((r) => /DAY\s*\/?\s*PERIOD|DAY\/PERIOD/i.test(r.join(" ")));
    if (gridHeaderIdx >= 0 && rows[gridHeaderIdx].length >= 3) {
      const headerRow = rows[gridHeaderIdx];
      data.periods = headerRow.slice(1).map((p) => stripTags(p).toUpperCase());
      for (const cells of rows.slice(gridHeaderIdx + 1)) {
        if (!cells.length) continue;
        const dayLabel = cells[0];
        if (!dayLabel || /DAY\/PERIOD/i.test(dayLabel)) continue;
        const dm = dayLabel.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*([\d-]+-\w+-\d{4})?/i);
        const row: TimetableRow = {
          day: dm ? dm[1] : stripTags(dayLabel),
          date: dm && dm[2] ? dm[2] : "",
          cells: cells.slice(1).map(parseTimetableCell),
        };
        if (row.cells.some((c) => c !== null)) data.rows.push(row);
      }
      // AY / Branch-Section info usually lives in the first row of the grid table
      const infoRow = rows[0]?.join(" | ") || "";
      const infoM = infoRow.match(/Academic Year\s*\|\s*(\d{4}-\d{2})\s*\|\s*Branch\/Section\s*\|\s*([^|]+)/i);
      if (infoM) {
        data.academicYear = infoM[1];
        data.section = stripTags(infoM[2]).trim();
      }
      continue;
    }

    // Legend: S.No | Subject Code | Subject Name | Short Code | Staff ID | Staff Name
    if (/SUBJECT CODE/i.test(header) && /STAFF/i.test(header)) {
      for (const cells of rows.slice(1)) {
        if (cells.length >= 6 && !isNaN(Number(cells[0]))) {
          data.legend.push({
            sNo: Number(cells[0]),
            code: cells[1],
            name: cells[2],
            shortCode: cells[3],
            staffId: cells[4],
            staffName: cells[5],
          });
        }
      }
      continue;
    }

    // Block timings: "BLOCK - I : BHARADWAZA" + "Period - 1 | 09:40 AM - 10:30 AM"
    if (/BLOCK/i.test(header) || rows.some((r) => /BLOCK/i.test(r.join(" ")))) {
      const blockNameMatch = t.match(/BLOCK\s*-\s*[IVX]+\s*:\s*[A-Z ]+/i);
      const blockName = blockNameMatch ? stripTags(blockNameMatch[0]) : "";
      const slots: Array<{ slot: string; time: string }> = [];
      for (const cells of rows) {
        if (cells.length >= 2 && /period|lunch/i.test(cells[0])) {
          slots.push({ slot: cells[0], time: cells[1] });
        }
      }
      if (slots.length) data.blocks.push({ block: blockName, slots });
      continue;
    }

    // AY/section info row: Academic Year | 2026-27 | Branch/Section | 145:...
    if (/ACADEMIC YEAR/i.test(header) && /BRANCH\/SECTION/i.test(header)) {
      const ayCell = rows[0]?.findIndex((c) => /\d{4}-\d{2}/.test(c));
      if (ayCell && ayCell > 0) data.academicYear = rows[0][ayCell].match(/\d{4}-\d{2}/)?.[0] || data.academicYear;
      const full = rows[0]?.join(" | ") || "";
      const secM = full.match(/Branch\/Section\s*\|\s*([^|]+:\S[^|]*)/i);
      if (secM) data.section = stripTags(secM[1]).trim();
    }
  }

  return data;
}

export async function fetchTimetableOptions(session: PortalSession): Promise<{ ayOptions: string[]; sectionOptions: Array<{ value: string; label: string }> }> {
  const res = await samvidhaGet(session, "/home?action=TT_std");
  const data = parseTimetable(res.body);
  return { ayOptions: data.ayOptions, sectionOptions: data.sectionOptions };
}

export async function fetchTimetable(session: PortalSession, ay: string, section: string): Promise<TimetableData> {
  const res = await samvidhaPost(
    session,
    "/home?action=TT_std",
    { ay, sec_data: section, btn_faculty_tt: "show" },
    "/home?action=TT_std"
  );
  const parsed = parseTimetable(res.body);
  parsed.academicYear = parsed.academicYear || ay;
  parsed.section = parsed.section || section;
  return parsed;
}

/* ------------------------------------------------------------------ */
/* PAT / CDC attendance                                                */
/* ------------------------------------------------------------------ */

export interface PatData {
  cdcCourses: string[];
  cdcRow: Record<string, string>;
  courses: Array<{ sNo: string; code: string; name: string; conducted: string; attended: string; percentage: string; status: string }>;
  daily: Array<{ sNo: string; course: string; date: string; period: string; status: string }>;
  hasData: boolean;
}

export async function fetchPatAttendance(session: PortalSession): Promise<PatData> {
  const res = await samvidhaGet(session, "/home?action=Attendance_std");
  const html = res.body;
  const tables = getTables(html);
  const out: PatData = { cdcCourses: [], cdcRow: {}, courses: [], daily: [], hasData: false };

  for (const t of tables) {
    const rows = getRows(t);
    const header = rows[0]?.join(" | ").toUpperCase() || "";
    if (header.includes("CDC001") || header.includes("CDC00")) {
      // CDC batch table — collect course names and, if present, this student's row
      const courseHeaders = rows[0].filter((c) => /^CDC\d+/.test(c)).map((c) => c.trim());
      out.cdcCourses = courseHeaders;
      for (const cells of rows.slice(1)) {
        if (cells.includes(session.username)) {
          cells.forEach((c, i) => (out.cdcRow[`col${i}`] = c));
        }
      }
      continue;
    }
    if (header.includes("COURSE CODE") && header.includes("CONDUCTED")) {
      for (const cells of rows.slice(1)) {
        if (cells.length >= 7 && !isNaN(Number(cells[0]))) {
          out.courses.push({
            sNo: cells[0], code: cells[1], name: cells[2],
            conducted: cells[3], attended: cells[4],
            percentage: cells[5], status: cells[6],
          });
        }
      }
      continue;
    }
    if (header.includes("DATE") && header.includes("PERIOD")) {
      for (const cells of rows.slice(1)) {
        if (cells.length >= 5 && !isNaN(Number(cells[0]))) {
          out.daily.push({ sNo: cells[0], course: cells[1], date: cells[2], period: cells[3], status: cells[4] });
        }
      }
    }
  }
  out.hasData = out.courses.length > 0 || out.daily.length > 0 || Object.keys(out.cdcRow).length > 2;
  return out;
}

/* ------------------------------------------------------------------ */
/* Biometric                                                           */
/* ------------------------------------------------------------------ */

export interface BiometricData {
  logs: Array<{ date: string; time: string; direction: string }>;
  hasData: boolean;
  portalNotice: string;
}

export async function fetchBiometric(session: PortalSession): Promise<BiometricData> {
  const res = await samvidhaGet(session, "/home?action=std_bio");
  const tables = getTables(res.body);
  const logs: Array<{ date: string; time: string; direction: string }> = [];
  for (const t of tables) {
    for (const cells of getRows(t)) {
      if (cells.length >= 2 && /\d{4}-\d{2}-\d{2}|\d{2}-\w{3}-\d{4}/.test(cells.join(" "))) {
        logs.push({
          date: cells[0] || "",
          time: cells[1] || "",
          direction: cells[2] || cells[1] || "",
        });
      }
    }
  }
  // The portal prints its own status line when the AEBAS report is closed.
  const noticeM = stripTags(res.body).match(
    /Current Semester academic days are completed[^.]*\.[^<]*?next semester\.?/i
  );
  return {
    logs,
    hasData: logs.length > 0,
    portalNotice: noticeM ? noticeM[0] : "",
  };
}

/* ------------------------------------------------------------------ */
/* CIA marks                                                           */
/* ------------------------------------------------------------------ */

export interface CieSemester {
  semester: string;
  academicYear: string;
  theory: Array<Record<string, string>>;
  labs: Array<Record<string, string>>;
}

export function parseCieMarks(html: string): { studentInfo: Record<string, string>; semesters: CieSemester[] } {
  const studentInfo: Record<string, string> = {};
  const text = stripTags(html);
  const nameM = text.match(/Name\s*([A-Z][A-Z ]+[A-Z])\s*(Roll|Branch)/);
  if (nameM) studentInfo.name = nameM[1].trim();
  const rollM = text.match(/Roll Number\s*([A-Z0-9]+)/) || text.match(/\b(2[0-9]{3}[A-Z][0-9A-Z]{2}[A-Z0-9])\b/);
  if (rollM) studentInfo.rollno = rollM[1];
  const branchM = text.match(/Branch\s*([A-Za-z ]+?)\s*(Regulation|Section)/);
  if (branchM) studentInfo.branch = branchM[1].trim();

  const semesters: CieSemester[] = [];
  for (const t of getTables(html)) {
    const tableText = stripTags(t);
    const semMatch = tableText.match(/Semester\s*-\s*(\d+)/i);
    if (!semMatch) continue;
    const ayMatch = tableText.match(/Academic Year\s*-\s*(\d{4}-\d{2})/i);
    const semKey = "Semester " + semMatch[1];
    const ay = ayMatch ? ayMatch[1] : "";

    let sem = semesters.find((s) => s.semester === semKey);
    if (!sem) {
      sem = { semester: semKey, academicYear: ay, theory: [], labs: [] };
      semesters.push(sem);
    }
    if (ay && !sem.academicYear) sem.academicYear = ay;

    // Theory + lab sections can live in the SAME table; classify row by row.
    // Section header rows mention "(Theory)" / "Laboratory Marks" / "Seminar Marks".
    let mode: "theory" | "lab" | null = null;
    for (const cells of getRows(t)) {
      const rowText = cells.join(" ").toLowerCase();
      if (/continuous internal assessment/.test(rowText) && /theory/.test(rowText)) {
        mode = "theory";
        continue;
      }
      if (/laboratory marks|practical|seminar marks/.test(rowText)) {
        mode = "lab";
        continue;
      }
      if (cells.length >= 4 && !isNaN(Number(cells[0])) && /^[A-Z]{2,5}[0-9]/.test(cells[1] || "")) {
        const rowObj: Record<string, string> = {
          sNo: cells[0],
          courseCode: cells[1],
          courseName: cells[2],
        };
        if (mode === "lab") {
          // cells: sNo | code | name | week marks (0..14) | exam marks | total
          const tail = cells.slice(3);
          const total = tail[tail.length - 1] || "";
          const exam = tail.length >= 2 ? tail[tail.length - 2] : "";
          const weeks = tail.slice(0, Math.max(0, tail.length - 2));
          rowObj.dayToDay = weeks.filter(Boolean).join(", ");
          rowObj.examMarks = exam;
          rowObj.total = total;
          sem.labs.push(rowObj);
        } else {
          // theory: sNo | code | name | CIE-I | AAT-I1 | AAT-I2 | CIE-II | AAT-II1 | AAT-II2 | Total
          rowObj.cieI = cells[3] ?? "";
          rowObj.aatI1 = cells[4] ?? "";
          rowObj.aatI2 = cells[5] ?? "";
          rowObj.cieII = cells[6] ?? "";
          rowObj.aatII1 = cells[7] ?? "";
          rowObj.aatII2 = cells[8] ?? "";
          rowObj.total = cells[9] ?? "";
          sem.theory.push(rowObj);
        }
      }
    }
  }
  semesters.sort((a, b) => Number(a.semester.replace(/\D/g, "")) - Number(b.semester.replace(/\D/g, "")));
  return { studentInfo, semesters };
}

export async function fetchCieMarks(session: PortalSession) {
  const res = await samvidhaGet(session, "/home?action=cie_marks_ug");
  return parseCieMarks(res.body);
}

/* ------------------------------------------------------------------ */
/* My Box                                                              */
/* ------------------------------------------------------------------ */

export function parseMyBoxJson(body: string) {
  const items: Array<{ sno: number; title: string; date: string; file: string }> = [];
  try {
    const json = JSON.parse(body);
    for (const it of Array.isArray(json) ? json : json.data || []) {
      items.push({ sno: Number(it.sno) || 0, title: it.title || "", date: it.date || "", file: it.file || "" });
    }
  } catch {
    // fall through to HTML parsing
    for (const m of body.matchAll(/<a[^>]+href="(https:\/\/[^"]+\.(?:pdf|PDF))"[^>]*>([\s\S]*?)<\/a>/g)) {
      items.push({ sno: 0, title: stripTags(m[2]) || m[1].split("/").pop() || "", date: "", file: m[1] });
    }
  }
  return items;
}

export async function fetchMyBox(session: PortalSession) {
  const res = await samvidhaGet(session, "/pages/student/ajax/inboxdata.php");
  return parseMyBoxJson(res.body);
}

/* ------------------------------------------------------------------ */
/* Logout                                                              */
/* ------------------------------------------------------------------ */

export async function logoutFromSamvidha(session: PortalSession) {
  try {
    await samvidhaGet(session, "/logout");
  } catch {
    // ignore
  }
}
