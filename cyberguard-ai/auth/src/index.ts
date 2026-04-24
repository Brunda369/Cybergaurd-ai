import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fetch from "cross-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const HASURA_URL = process.env.HASURA_URL!;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET!;
const JWT_SECRET = process.env.JWT_SECRET!;

async function hasuraQuery(query: string, variables: any) {
  const res = await fetch(HASURA_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Hasura error");
  return json.data;
}

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const data = await hasuraQuery(
      `
      query ($email: String!) {
        users(where: { email: { _eq: $email } }, limit: 1) {
          id
          email
          password_hash
          role
        }
      }
      `,
      { email }
    );

    const user = data.users?.[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      {
        sub: user.id,
        "https://hasura.io/jwt/claims": {
          "x-hasura-allowed-roles": ["analyst", "viewer", "admin"],
          "x-hasura-default-role": "admin",
          "x-hasura-role": user.role,
          "x-hasura-user-id": user.id,
        },
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ token, role: user.role });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Login failed" });
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(4000, () => console.log("Auth server running on http://localhost:4000"));
