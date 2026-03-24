const { MongoClient } = require("mongodb");
const fs = require('fs');
async function run() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://ghoshivaibhav12_db_user:fysvOgBizY82TVUl@cluster0.l8wal97.mongodb.net/netflix-clone?appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection("users").find({ following: { $exists: true, $ne: [] } }).toArray();
    let out = "Users with following: " + users.length + "\n";
    for (const u of users) {
      out += `User ${u._id}\n`;
      out += "following: " + u.following.map(f => `${typeof f} - ${f?.constructor?.name} - ${f}`).join(", ") + "\n";
    }
    const followed = await db.collection("users").find({ followers: { $exists: true, $ne: [] } }).toArray();
    out += "\nUsers with followers:\n";
    for (const u of followed) {
      out += `User ${u._id}\n`;
      out += "followers: " + u.followers.map(f => `${typeof f} - ${f?.constructor?.name} - ${f}`).join(", ") + "\n";
    }
    fs.writeFileSync("db_out.txt", out);
    console.log("Wrote to db_out.txt");
  } catch(e) { console.error(e); } finally { await client.close(); }
}
run();
