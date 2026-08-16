import { Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Best-effort mailer — unlike BillingService's Razorpay client (which throws
 * when unconfigured, since billing must fail loudly), this quietly no-ops and
 * logs when SMTP env vars are absent. Registration and password-reset must
 * keep working without real SMTP creds in dev, and forgot-password specifically
 * must never behave differently based on configuration state (that would leak
 * whether an email exists).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    this.from = process.env.SMTP_FROM || "Nextlayer Cloud <no-reply@nextlayer.cloud>";

    this.transporter =
      host && port && user && password
        ? nodemailer.createTransport({
            host,
            port: Number(port),
            secure: process.env.SMTP_SECURE === "true",
            auth: { user, pass: password },
          })
        : null;
  }

  private async send(to: string, subject: string, text: string, html: string) {
    if (!this.transporter) {
      this.logger.warn(`SMTP isn't configured — skipping email "${subject}" to ${to}.`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    } catch (err) {
      this.logger.warn(`Failed to send email "${subject}" to ${to}: ${(err as Error).message}`);
    }
  }

  async sendVerificationEmail(to: string, name: string, link: string) {
    await this.send(
      to,
      "Verify your email — Nextlayer Cloud",
      `Hi ${name},\n\nVerify your email address to finish setting up your Nextlayer Cloud account:\n${link}\n\nThis link expires in 24 hours.`,
      `<p>Hi ${name},</p><p>Verify your email address to finish setting up your Nextlayer Cloud account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    );
  }

  async sendPasswordResetEmail(to: string, name: string, link: string) {
    await this.send(
      to,
      "Reset your password — Nextlayer Cloud",
      `Hi ${name},\n\nReset your Nextlayer Cloud password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
      `<p>Hi ${name},</p><p>Reset your Nextlayer Cloud password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    );
  }

  async sendShareNotificationEmail(
    to: string,
    sharerName: string,
    resourceName: string,
    resourceType: "file" | "folder",
    accessLevel: "VIEWER" | "EDITOR",
    link: string,
  ) {
    const levelText = accessLevel === "EDITOR" ? "edit" : "view";
    await this.send(
      to,
      `${sharerName} shared "${resourceName}" with you — Nextlayer Cloud`,
      `Hi,\n\n${sharerName} gave you access to ${levelText} the ${resourceType} "${resourceName}" on Nextlayer Cloud.\n\nOpen it here:\n${link}`,
      `<p>Hi,</p><p>${sharerName} gave you access to ${levelText} the ${resourceType} "${resourceName}" on Nextlayer Cloud.</p><p><a href="${link}">${link}</a></p>`,
    );
  }

  async sendInviteEmail(
    to: string,
    sharerName: string,
    resourceName: string,
    resourceType: "file" | "folder",
    accessLevel: "VIEWER" | "EDITOR",
    registerLink: string,
  ) {
    const levelText = accessLevel === "EDITOR" ? "edit" : "view";
    await this.send(
      to,
      `${sharerName} invited you to Nextlayer Cloud — Nextlayer Cloud`,
      `Hi,\n\n${sharerName} wants to give you access to ${levelText} the ${resourceType} "${resourceName}" on Nextlayer Cloud. Create a free account to open it:\n${registerLink}`,
      `<p>Hi,</p><p>${sharerName} wants to give you access to ${levelText} the ${resourceType} "${resourceName}" on Nextlayer Cloud. Create a free account to open it:</p><p><a href="${registerLink}">${registerLink}</a></p>`,
    );
  }

  async sendAccessRequestEmail(
    to: string,
    requesterName: string,
    resourceName: string,
    resourceType: "file" | "folder",
    message: string | undefined,
    reviewLink: string,
  ) {
    const messageLine = message ? `\n\nTheir message: "${message}"` : "";
    const messageHtml = message ? `<p>Their message: "${message}"</p>` : "";
    await this.send(
      to,
      `${requesterName} requested access to "${resourceName}" — Nextlayer Cloud`,
      `Hi,\n\n${requesterName} asked for access to the ${resourceType} "${resourceName}" on Nextlayer Cloud.${messageLine}\n\nReview the request here:\n${reviewLink}`,
      `<p>Hi,</p><p>${requesterName} asked for access to the ${resourceType} "${resourceName}" on Nextlayer Cloud.</p>${messageHtml}<p><a href="${reviewLink}">${reviewLink}</a></p>`,
    );
  }

  async sendAccessDeniedEmail(to: string, resourceName: string, resourceType: "file" | "folder") {
    await this.send(
      to,
      `Your access request was declined — Nextlayer Cloud`,
      `Hi,\n\nYour request for access to the ${resourceType} "${resourceName}" was declined.`,
      `<p>Hi,</p><p>Your request for access to the ${resourceType} "${resourceName}" was declined.</p>`,
    );
  }
}
