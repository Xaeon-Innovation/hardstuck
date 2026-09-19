require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const postgres = require("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

console.log("connecting", url.replace(/:[^:@/]+@/, ":****@"));
const sql = postgres(url, { max: 1 });

sql`select current_user as user, current_database() as db`
  .then(async (rows) => {
    console.log("ok", rows);
    await sql.end();
  })
  .catch(async (err) => {
    console.error("ERR", err);
    await sql.end({ timeout: 1 });
    process.exit(1);
  });
