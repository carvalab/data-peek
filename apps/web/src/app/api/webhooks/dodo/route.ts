import { NextRequest, NextResponse } from "next/server";
import { db, customers, licenses } from "@/db";
import { eq } from "drizzle-orm";
import { generateLicenseKey, calculateUpdatesUntil } from "@/lib/license";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_123");

// DodoPayments webhook event types
type DodoEventType =
  | "payment.completed"
  | "payment.refunded"
  | "payment.failed";

interface DodoWebhookPayload {
  event: DodoEventType;
  data: {
    payment_id: string;
    product_id: string;
    customer: {
      email: string;
      name?: string;
      customer_id: string;
    };
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
  };
}

// Verify DodoPayments webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  if (!signature || !process.env.DODO_WEBHOOK_SECRET) {
    console.warn("Missing webhook signature or secret");
    return false;
  }

  // DodoPayments uses HMAC-SHA256 for webhook signatures
  const crypto = await import("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", process.env.DODO_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Send welcome email with license key
async function sendWelcomeEmail(
  email: string,
  name: string | undefined,
  licenseKey: string,
  updatesUntil: Date
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: "data-peek <hello@datapeek.app>",
      to: email,
      subject: "Your data-peek Pro license 🎉",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22d3ee;">Welcome to data-peek Pro!</h1>

          <p>Hi ${name || "there"},</p>

          <p>Thank you for purchasing data-peek Pro! Your license is ready to use.</p>

          <div style="background: #111113; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Your License Key:</p>
            <p style="color: #fafafa; font-family: monospace; font-size: 18px; margin: 0; letter-spacing: 1px;">${licenseKey}</p>
          </div>

          <h3>Quick Start:</h3>
          <ol>
            <li>Download data-peek from <a href="https://datapeek.app/download" style="color: #22d3ee;">datapeek.app/download</a></li>
            <li>Open the app and go to <strong>Settings → License</strong></li>
            <li>Enter your license key</li>
          </ol>

          <h3>Your license includes:</h3>
          <ul>
            <li>✓ 1 year of updates (until ${updatesUntil.toLocaleDateString()})</li>
            <li>✓ 3 device activations</li>
            <li>✓ All Pro features unlocked</li>
          </ul>

          <p>Need help? Just reply to this email.</p>

          <p>Happy querying!<br>— The data-peek team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-dodo-signature");

    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      const isValid = await verifyWebhookSignature(payload, signature);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(payload) as DodoWebhookPayload;

    switch (event.event) {
      case "payment.completed": {
        const { data } = event;

        // Find or create customer
        let customer = await db.query.customers.findFirst({
          where: eq(customers.email, data.customer.email),
        });

        if (!customer) {
          const [newCustomer] = await db
            .insert(customers)
            .values({
              email: data.customer.email,
              name: data.customer.name,
              dodoCustomerId: data.customer.customer_id,
            })
            .returning();
          customer = newCustomer;
        } else if (!customer.dodoCustomerId) {
          // Update existing customer with DodoPayments ID
          await db
            .update(customers)
            .set({ dodoCustomerId: data.customer.customer_id })
            .where(eq(customers.id, customer.id));
        }

        // Generate license key
        const licenseKey = generateLicenseKey("DPRO");
        const updatesUntil = calculateUpdatesUntil();

        // Create license
        await db.insert(licenses).values({
          customerId: customer.id,
          licenseKey,
          plan: "pro",
          status: "active",
          maxActivations: 3,
          dodoPaymentId: data.payment_id,
          dodoProductId: data.product_id,
          updatesUntil,
        });

        // Send welcome email
        await sendWelcomeEmail(
          data.customer.email,
          data.customer.name,
          licenseKey,
          updatesUntil
        );

        console.log(
          `License created for ${data.customer.email}: ${licenseKey}`
        );
        break;
      }

      case "payment.refunded": {
        const { data } = event;

        // Find and revoke the license
        const license = await db.query.licenses.findFirst({
          where: eq(licenses.dodoPaymentId, data.payment_id),
        });

        if (license) {
          await db
            .update(licenses)
            .set({ status: "revoked" })
            .where(eq(licenses.id, license.id));

          console.log(`License revoked for payment ${data.payment_id}`);
        }
        break;
      }

      case "payment.failed": {
        const { data } = event;
        console.log(
          `Payment failed for ${data.customer.email}: ${data.payment_id}`
        );
        // Could send a failed payment notification email here
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
