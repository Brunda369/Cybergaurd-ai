import { createServer } from "http";
import { handler } from "./handler";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      // Create a mock API Gateway event from HTTP request
      const event: APIGatewayProxyEventV2 = {
        version: "2.0",
        routeKey: `${req.method} ${req.url}`,
        rawPath: req.url || "/",
        rawQueryString: "",
        headers: req.headers as Record<string, string>,
        requestContext: {
          http: {
            method: req.method || "GET",
            path: req.url || "/",
            protocol: "HTTP/1.1",
            sourceIp: req.socket.remoteAddress || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "",
          },
          routeKey: `${req.method} ${req.url}`,
          stage: "$default",
          requestId: Math.random().toString(36).substr(2, 9),
          timeEpoch: Date.now(),
          time: new Date().toISOString(),
          domainName: req.headers.host || "localhost",
          domainPrefix: "api",
          accountId: "123456789012",
          apiId: "api",
        },
        body: body || undefined,
        isBase64Encoded: false,
      };

      const result = await handler(event);

      // Handle result which could be object or string
      if (typeof result === "string") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(result);
      } else {
        const headers: Record<string, string | number | boolean> = result.headers || {};
        const cleanHeaders: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(headers)) {
          cleanHeaders[key] = String(value);
        }
        res.writeHead(result.statusCode || 200, cleanHeaders);
        res.end(result.body);
      }
    } catch (error) {
      console.error("Error handling request:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
        })
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
