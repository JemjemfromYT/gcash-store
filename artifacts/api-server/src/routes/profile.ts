import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";

const router: IRouter = Router();

const HERO_PRICES: Record<string, number> = {
  justin: 29,
  jian: 29,
  joseph: 29,
  jaballas: 29,
  joshua: 29,
  jazmine: 29,
};

function normalizeName(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (t.length < 1 || t.length > 24) return null;
  return t;
}
function normalizePin(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!/^\d{4,8}$/.test(t)) return null;
  return t;
}

async function findOrCreateProfile(name: string, pin: string) {
  const existing = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.name, name))
    .limit(1);

  if (existing.length > 0) {
    const profile = existing[0]!;
    const ok = await bcrypt.compare(pin, profile.pinHash);
    if (!ok) return { error: "Wrong PIN for this name." as const };
    return { profile };
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const inserted = await db
    .insert(profilesTable)
    .values({ name, pinHash, unlockedHeroes: [] })
    .returning();
  return { profile: inserted[0]! };
}

router.post("/profile/login", async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const pin = normalizePin(req.body?.pin);
    if (!name) {
      res.status(400).json({ error: "Name must be 1-24 characters." });
      return;
    }
    if (!pin) {
      res.status(400).json({ error: "PIN must be 4-8 digits." });
      return;
    }
    const result = await findOrCreateProfile(name, pin);
    if ("error" in result) {
      res.status(401).json({ error: result.error });
      return;
    }
    res.json({
      name: result.profile.name,
      unlockedHeroes: result.profile.unlockedHeroes,
    });
  } catch (err) {
    req.log.error({ err }, "profile/login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

const PAYMONGO_SECRET = process.env["PAYMONGO_SECRET_KEY"];

function authHeader(): string {
  if (!PAYMONGO_SECRET) throw new Error("PAYMONGO_SECRET_KEY not set");
  return "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64");
}

function getOrigin(req: import("express").Request): string {
  const forwardedHost = req.get("x-forwarded-host");
  const forwardedProto = req.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? req.get("host");
  return `${forwardedProto}://${host}`;
}

router.post("/heroes/checkout", async (req, res) => {
  if (!PAYMONGO_SECRET) {
    res.status(500).json({ error: "Payments are not configured." });
    return;
  }
  try {
    const name = normalizeName(req.body?.name);
    const pin = normalizePin(req.body?.pin);
    const heroId = typeof req.body?.heroId === "string" ? req.body.heroId : "";
    if (!name || !pin) {
      res.status(400).json({ error: "Name and PIN required." });
      return;
    }
    const price = HERO_PRICES[heroId];
    if (!price) {
      res.status(400).json({ error: "Unknown hero." });
      return;
    }
    const result = await findOrCreateProfile(name, pin);
    if ("error" in result) {
      res.status(401).json({ error: result.error });
      return;
    }
    if (result.profile.unlockedHeroes.includes(heroId)) {
      res.status(400).json({ error: "Hero already unlocked." });
      return;
    }

    const origin = getOrigin(req);
    const successUrl = `${origin}/game/?paid=true&hero=${encodeURIComponent(heroId)}`;
    const cancelUrl = `${origin}/game/?paid=cancel`;

    const payload = {
      data: {
        attributes: {
          line_items: [
            {
              currency: "PHP",
              amount: price * 100,
              name: `Hero Unlock: ${heroId}`,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card", "paymaya"],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: `Unlock hero ${heroId} in Neural Survival`,
          metadata: { heroId, profileName: name },
        },
      },
    };

    const response = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader(),
        },
        body: JSON.stringify(payload),
      },
    );
    const json = (await response.json()) as {
      data?: { attributes?: { checkout_url?: string } };
      errors?: Array<{ detail?: string }>;
    };
    if (!response.ok) {
      req.log.error({ status: response.status, json }, "PayMongo error");
      res
        .status(response.status)
        .json({ error: json?.errors?.[0]?.detail ?? "Checkout failed." });
      return;
    }
    const checkoutUrl = json?.data?.attributes?.checkout_url;
    if (!checkoutUrl) {
      res.status(502).json({ error: "PayMongo returned no URL." });
      return;
    }
    res.json({ checkoutUrl });
  } catch (err) {
    req.log.error({ err }, "heroes/checkout failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/heroes/unlock", async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const pin = normalizePin(req.body?.pin);
    const heroId = typeof req.body?.heroId === "string" ? req.body.heroId : "";
    if (!name || !pin) {
      res.status(400).json({ error: "Name and PIN required." });
      return;
    }
    if (!HERO_PRICES[heroId]) {
      res.status(400).json({ error: "Unknown hero." });
      return;
    }
    const result = await findOrCreateProfile(name, pin);
    if ("error" in result) {
      res.status(401).json({ error: result.error });
      return;
    }
    const profile = result.profile;
    if (!profile.unlockedHeroes.includes(heroId)) {
      const updated = await db
        .update(profilesTable)
        .set({
          unlockedHeroes: sql`array_append(${profilesTable.unlockedHeroes}, ${heroId})`,
        })
        .where(eq(profilesTable.id, profile.id))
        .returning();
      res.json({
        name: updated[0]!.name,
        unlockedHeroes: updated[0]!.unlockedHeroes,
      });
      return;
    }
    res.json({ name: profile.name, unlockedHeroes: profile.unlockedHeroes });
  } catch (err) {
    req.log.error({ err }, "heroes/unlock failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
