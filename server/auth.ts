import type { Express, NextFunction, Request, Response } from "express";
import crypto from "crypto";
import type { IncomingMessage } from "http";
import { storage } from "./storage";
import type { PlanCode, RoleCode, User } from "../shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TOKEN_TTL_SECONDS = parseInt(process.env.JWT_ACCESS_TTL_SECONDS || "86400", 10);
const REQUIRE_AUTH = process.env.REQUIRE_AUTH === "true";
export const AUTH_REQUIRED = REQUIRE_AUTH;

const PLAN_LIMITS: Record<PlanCode, { restPerMinute: number; wsConnections: number; settingsWrite: boolean; wsStream: boolean }> = {
  free: { restPerMinute: 60, wsConnections: 1, settingsWrite: false, wsStream: true },
  pro: { restPerMinute: 600, wsConnections: 3, settingsWrite: true, wsStream: true },
  enterprise: { restPerMinute: 3000, wsConnections: 20, settingsWrite: true, wsStream: true },
};

const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const userBuckets = new Map<string, { count: number; resetAt: number }>();
const wsConnectionsByKey = new Map<string, number>();

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signToken(payload: Record<string, unknown>) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ACCESS_TOKEN_TTL_SECONDS };
  const head = b64url(JSON.stringify(header));
  const bodyEncoded = b64url(JSON.stringify(body));
  const data = `${head}.${bodyEncoded}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifyToken(token: string): null | Record<string, any> {
  try {
    const [head, body, signature] = token.split(".");
    if (!head || !body || !signature) return null;
    const data = `${head}.${body}`;
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    if (expected !== signature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password: string, salt?: string) {
  const actualSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, actualSalt, 64).toString("hex");
  return `${actualSalt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, original] = storedHash.split(":");
  if (!salt || !original) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(original, "hex"), Buffer.from(derived, "hex"));
}

function getClientIp(req: Request | IncomingMessage) {
  const forwarded = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  const socketIp = req.socket.remoteAddress || "unknown";
  return forwarded || socketIp;
}

function getTokenFromRequest(req: Request | IncomingMessage) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("token");
  return token || null;
}

function bucketCheck(map: Map<string, { count: number; resetAt: number }>, key: string, limit: number) {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: Math.max(0, limit - bucket.count) };
}

export function issueAccessToken(user: User) {
  return signToken({ sub: user.id, email: user.email, role: user.role, plan: user.plan, status: user.status });
}

export function getPlanLimits(plan: PlanCode) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function requireRole(roles: RoleCode[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ message: "Требуется вход" });
    if (!roles.includes(req.authUser.role)) return res.status(403).json({ message: "Недостаточно прав" });
    next();
  };
}

export function requirePlanFeature(feature: "settingsWrite" | "wsStream") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ message: "Требуется вход" });
    const limits = getPlanLimits(req.authUser.plan);
    if (!limits[feature]) return res.status(403).json({ message: "Функция недоступна на вашем тарифе" });
    next();
  };
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload?.sub) return next();
  const user = storage.getUserById(String(payload.sub));
  if (user && user.status === "active") req.authUser = user;
  next();
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  authOptional(req, res, () => {
    if (!req.authUser) return res.status(401).json({ message: "Требуется вход" });
    next();
  });
}

export function monetizationGuard(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const ipCheck = bucketCheck(ipBuckets, `ip:${ip}`, 120);
  if (!ipCheck.ok) {
    res.setHeader("Retry-After", Math.ceil((ipCheck.retryAfterMs || 0) / 1000));
    return res.status(429).json({ message: "Слишком много запросов по IP" });
  }

  if (REQUIRE_AUTH && !req.authUser) {
    return res.status(401).json({ message: "Требуется вход" });
  }

  if (req.authUser) {
    const limits = getPlanLimits(req.authUser.plan);
    const userCheck = bucketCheck(userBuckets, `user:${req.authUser.id}`, limits.restPerMinute);
    if (!userCheck.ok) {
      res.setHeader("Retry-After", Math.ceil((userCheck.retryAfterMs || 0) / 1000));
      return res.status(429).json({ message: "Лимит запросов тарифа превышен" });
    }
    res.setHeader("X-RateLimit-Remaining", String(userCheck.remaining));
  }

  next();
}

export function authenticateWs(req: IncomingMessage) {
  const ip = getClientIp(req);
  const token = getTokenFromRequest(req);

  if (!token) {
    if (REQUIRE_AUTH) {
      return {
        ok: false,
        user: null as User | null,
        message: "Требуется токен",
        clientKey: null as string | null,
      };
    }

    const clientKey = `anon:${ip}`;
    const current = wsConnectionsByKey.get(clientKey) || 0;
    if (current >= 1) {
      return {
        ok: false,
        user: null as User | null,
        message: "Для анонимного доступа доступно только одно WebSocket-подключение",
        clientKey: null as string | null,
      };
    }

    return { ok: true, user: null as User | null, message: null, clientKey };
  }

  const payload = verifyToken(token);
  if (!payload?.sub) return { ok: false, user: null as User | null, message: "Неверный токен", clientKey: null as string | null };
  const user = storage.getUserById(String(payload.sub));
  if (!user || user.status !== "active") return { ok: false, user: null as User | null, message: "Пользователь недоступен", clientKey: null as string | null };
  const limits = getPlanLimits(user.plan);
  const clientKey = `user:${user.id}`;
  const current = wsConnectionsByKey.get(clientKey) || 0;
  if (current >= limits.wsConnections) return { ok: false, user: null as User | null, message: "Превышен лимит WebSocket-подключений", clientKey: null as string | null };
  return { ok: true, user, message: null, clientKey };
}

export function registerWsConnection(clientKey: string | null) {
  if (!clientKey) return;
  wsConnectionsByKey.set(clientKey, (wsConnectionsByKey.get(clientKey) || 0) + 1);
}

export function unregisterWsConnection(clientKey: string | null) {
  if (!clientKey) return;
  const current = wsConnectionsByKey.get(clientKey) || 0;
  if (current <= 1) wsConnectionsByKey.delete(clientKey);
  else wsConnectionsByKey.set(clientKey, current - 1);
}

export function installAuthRoutes(app: Express) {
  app.post("/api/auth/register", (req, res) => {
    const { email, password, role, plan } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Нужны email и пароль" });
    if (storage.getUserByEmail(String(email).toLowerCase())) return res.status(409).json({ message: "Пользователь уже существует" });
    const user = storage.createUser({
      email: String(email).toLowerCase(),
      passwordHash: hashPassword(String(password)),
      role: (role === "admin" ? "admin" : "viewer") as RoleCode,
      plan: (["free", "pro", "enterprise"].includes(plan) ? plan : "free") as PlanCode,
      status: "active",
    });
    const token = issueAccessToken(user);
    res.json({ token, user: storage.toSafeUser(user) });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    const user = storage.getUserByEmail(String(email || "").toLowerCase());
    if (!user || !verifyPassword(String(password || ""), user.passwordHash)) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }
    if (user.status !== "active") return res.status(403).json({ message: "Пользователь отключён" });
    const token = issueAccessToken(user);
    res.json({ token, user: storage.toSafeUser(user) });
  });

  app.get("/api/auth/me", authRequired, (req, res) => {
    res.json({ user: storage.toSafeUser(req.authUser!) });
  });
}

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
    }
  }
}
