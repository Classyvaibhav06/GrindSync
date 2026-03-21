const { MongoClient } = require("mongodb");

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    // Clear users
    const result = await db.collection("users").deleteMany({});
    console.log(`Deleted ${result.deletedCount} users.`);
    
    // Clear accounts (Google linked accounts)
    const accountsResult = await db.collection("accounts").deleteMany({});
    console.log(`Deleted ${accountsResult.deletedCount} accounts.`);
    
    // Clear sessions
    const sessionsResult = await db.collection("sessions").deleteMany({});
    console.log(`Deleted ${sessionsResult.deletedCount} sessions.`);
  } catch (error) {
    console.error("Error clearing DB:", error);
  } finally {
    await client.close();
  }
}

run();
