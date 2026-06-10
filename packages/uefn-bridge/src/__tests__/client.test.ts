import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { UefnHttpClient, UefnListenerError } from "../client.js";

async function withServer(handler: (req: IncomingMessage, res: ServerResponse, body: string) => void | Promise<void>) {
  const requests: Array<{ method?: string; url?: string; body: unknown }> = [];
  const server = createServer(async (req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      const parsed = body ? JSON.parse(body) as unknown : undefined;
      requests.push({ method: req.method, url: req.url, body: parsed });
      await handler(req, res, body);
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No server address");
  return { baseUrl: `http://127.0.0.1:${address.port}`, requests, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

describe("UefnHttpClient", () => {
  it("sends commands to POST / using the listener envelope", async () => {
    const server = await withServer((_, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ success: true, result: { project_name: "Test" } }));
    });
    try {
      const client = new UefnHttpClient(server.baseUrl);
      await client.getProjectInfo();

      expect(server.requests[0]).toEqual({
        method: "POST",
        url: "/",
        body: { command: "get_project_info", params: {} },
      });
    } finally {
      await server.close();
    }
  });

  it("throws UefnListenerError for listener failures", async () => {
    const server = await withServer((_, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ success: false, error: "boom" }));
    });
    try {
      const client = new UefnHttpClient(server.baseUrl);
      await expect(client.getProjectInfo()).rejects.toBeInstanceOf(UefnListenerError);
    } finally {
      await server.close();
    }
  });

  it("pings GET / and returns false for connection failures", async () => {
    const server = await withServer((_, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ status: "ok" }));
    });
    try {
      const client = new UefnHttpClient(server.baseUrl);
      await expect(client.ping()).resolves.toBe(true);
    } finally {
      await server.close();
    }

    await expect(new UefnHttpClient("http://127.0.0.1:1").ping()).resolves.toBe(false);
  });

  it("does not send label to spawn_actor", async () => {
    const server = await withServer((_, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ success: true, result: { actor: { name: "Actor" } } }));
    });
    try {
      const client = new UefnHttpClient(server.baseUrl);
      await client.spawnActor({ asset_path: "/Asset", location: [1, 2, 3], rotation: [0, 0, 0] });

      expect(server.requests[0].body).toEqual({
        command: "spawn_actor",
        params: { asset_path: "/Asset", location: [1, 2, 3], rotation: [0, 0, 0] },
      });
      expect(JSON.stringify(server.requests[0].body)).not.toContain("label");
    } finally {
      await server.close();
    }
  });
});
