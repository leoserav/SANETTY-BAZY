
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import worker from "./dist/server/index.js";

const db = new DatabaseSync("bonos.sqlite");
db.exec((await readFile("drizzle/0000_bonos.sql", "utf8")).replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS"));
const DB = {
  prepare(sql) {
    const statement = db.prepare(sql);
    return { bind: (...values) => ({
      run: () => statement.run(...values),
      first: () => statement.get(...values)
    }), all: () => ({ results: statement.all() }) };
  }
};
const port = Number(process.env.PORT || 4173);
const origin = "http://127.0.0.1:" + port;
createServer(async (incoming, outgoing) => {
  try {
    const options = { method: incoming.method, headers: incoming.headers };
    if (!["GET", "HEAD"].includes(incoming.method)) {
      options.body = Readable.toWeb(incoming);
      options.duplex = "half";
    }
    const response = await worker.fetch(new Request(origin + incoming.url, options), { ...process.env, DB });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch {
    outgoing.writeHead(500).end("Error de vista previa");
  }
}).listen(port, "127.0.0.1", () => console.log(origin));
