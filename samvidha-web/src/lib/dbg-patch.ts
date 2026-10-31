import * as fs from "fs";
const src = fs.readFileSync("samvidha-web/src/lib/portal.ts", "utf8");
// Count occurrences of key identifiers to spot duplicate definitions
console.log("parseCreditRegister count:", (src.match(/function parseCreditRegister/g) || []).length);
console.log("getRows count:", (src.match(/function getRows/g) || []).length);
console.log("stripTags count:", (src.match(/function stripTags/g) || []).length);
// print the exact getRows + stripTags definitions
const gr = src.match(/function getRows[\s\S]{0,400}/);
console.log(gr ? gr[0] : "getRows NOT FOUND");
