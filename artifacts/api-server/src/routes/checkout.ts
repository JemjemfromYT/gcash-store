import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PAYMONGO_SECRET = process.env["PAYMONGO_SECRET_KEY"];

function authHeader(): string {
  if (!PAYMONGO_SECRET) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured");
  }
  return "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64");
}

function getOrigin(req: import("express").Request): string {
  const forwardedHost = req.get("x-forwarded-host");
  const forwardedProto = req.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? req.get("host");
  return `${forwardedProto}://${host}`;
}

router.post("/create-checkout", async (req, res) => {
  if (!PAYMONGO_SECRET) {
    req.log.error("PAYMONGO_SECRET_KEY missing");
    res.status(500).json({ error: "Payments are not configured." });
    return;
  }

  try {
    const origin = getOrigin(req);
    const itemName: string =
      typeof req.body?.name === "string" ? req.body.name : "Premium Item";
    const amountPesos: number =
      typeof req.body?.amount === "number" ? req.body.amount : 50;
    const amountCentavos = Math.round(amountPesos * 100);

    const payload = {
      data: {
        attributes: {
          line_items: [
            {
              currency: "PHP",
              amount: amountCentavos,
              name: itemName,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card", "paymaya"],
          success_url: `${origin}/success?paid=true`,
          cancel_url: `${origin}/cancel`,
          description: itemName,
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
      const detail =
        json?.errors?.[0]?.detail ?? "Failed to create checkout session";
      res.status(response.status).json({ error: detail });
      return;
    }

    const checkoutUrl = json?.data?.attributes?.checkout_url;
    if (!checkoutUrl) {
      res.status(502).json({ error: "PayMongo returned no checkout_url" });
      return;
    }

    res.json({ checkoutUrl });
  } catch (err) {
    req.log.error({ err }, "create-checkout failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
