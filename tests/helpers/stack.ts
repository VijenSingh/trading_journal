// Starts a throwaway stack for end-to-end tests: an in-memory MongoDB replica set
// (transactions work) and the built app (`next build` must have run) on a free port.
//
// Safety: the app is started with every sensitive variable set explicitly, and before
// any test writes anything we prove the server reads the in-memory database. If a
// value from .env.local ever won, the run stops before touching real data.
import { spawn, ChildProcess } from "child_process";
import net from "net";
import path from "path";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import { MongoClient, Db } from "mongodb";

const ROOT = path.resolve(__dirname, "..", "..");

export interface Stack {
  base: string;
  db: Db;
  cookie: string;
  api: (p: string, init?: RequestInit) => Promise<Response>;
  json: (p: string, body?: unknown, method?: string) => Promise<any>;
  login: (password?: string) => Promise<Response>;
  restart: (env?: Record<string, string>) => Promise<void>;
  /** route relative fetch("/api/â€¦") calls (as made by lib/backupClient) to this server */
  patchGlobalFetch: () => void;
  stop: () => Promise<void>;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}

async function waitUp(base: string, proc: ChildProcess) {
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    if (proc.exitCode != null) throw new Error(`next start exited with ${proc.exitCode}`);
    try { await fetch(base + "/manifest.json"); return; } catch { /* not yet */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error("next start did not come up in 90s");
}

export async function startStack(env: Record<string, string> = {}): Promise<Stack> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ launchTimeout: 60_000 }],
  });
  const uri = replSet.getUri("tradermind");
  const client = await MongoClient.connect(uri);
  const db = client.db("tradermind");
  const realFetch = globalThis.fetch;

  let proc: ChildProcess;
  let base = "";
  const baseEnv = (): NodeJS.ProcessEnv => ({
    ...process.env,
    NODE_ENV: "production" as const,
    NEXT_TELEMETRY_DISABLED: "1",
    MONGODB_URI: uri,
    AUTH_PASSWORD: "test-password",
    AUTH_SECRET: "test-secret",
    CRON_SECRET: "test-cron",
    BLOB_READ_WRITE_TOKEN: "",
    BLOB_PATH_PREFIX: "e2e-never-used/",
    VAPID_PRIVATE_KEY: "",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
    ...env,
  });

  const launch = async (extra: Record<string, string> = {}) => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    proc = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: ROOT, env: { ...baseEnv(), ...extra } as NodeJS.ProcessEnv, stdio: ["ignore", "ignore", process.env.E2E_VERBOSE ? "inherit" : "ignore"],
    });
    await waitUp(base, proc);
  };

  await launch();

  const stack: Stack = {
    get base() { return base; },
    db,
    cookie: "",
    api: (p, init = {}) => realFetch(base + p, { redirect: "manual", ...init, headers: { ...(init.headers || {}), cookie: stack.cookie } }),
    json: async (p, body, method = body === undefined ? "GET" : "POST") => {
      const r = await stack.api(p, body === undefined ? { method } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return r.json();
    },
    login: async (password = "test-password") => {
      const r = await realFetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const c = (r.headers.get("set-cookie") || "").split(";")[0];
      if (r.ok) stack.cookie = c;
      return r;
    },
    restart: async (extra = {}) => { proc.kill(); await launch(extra); },
    patchGlobalFetch: () => {
      globalThis.fetch = ((url: any, init: any = {}) =>
        realFetch(typeof url === "string" && url.startsWith("/") ? base + url : url, { ...init, headers: { ...(init.headers || {}), cookie: stack.cookie } })) as typeof fetch;
    },
    stop: async () => {
      globalThis.fetch = realFetch;
      proc?.kill();
      await client.close();
      await replSet.stop();
    },
  };

  // Prove the server reads the in-memory DB: a pair written straight into it must come
  // back from the API. Nothing has been written through the app yet.
  await stack.login();
  await db.collection("pairs").insertOne({ name: "__e2e_sentinel__" });
  const pairs = await stack.json("/api/pairs");
  if (!pairs?.data?.includes("__e2e_sentinel__")) {
    await stack.stop();
    throw new Error("SAFETY STOP: the app is not using the test database (check .env.local). Nothing was written.");
  }
  await db.collection("pairs").deleteMany({});

  // Same for Blob: unless this test passed a token, the app must see none at all.
  if (!env.BLOB_READ_WRITE_TOKEN) {
    const b = await stack.api("/api/backups");
    if (b.status !== 503) {
      await stack.stop();
      throw new Error("SAFETY STOP: the app picked up a Blob token from .env.local. Nothing was written.");
    }
  }
  return stack;
}
