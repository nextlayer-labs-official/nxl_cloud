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
    this.from = process.env.SMTP_FROM || "Skylyer <no-reply@skylyer.cloud>";

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
      "Verify your email — Skylyer",
      `Hi ${name},\n\nVerify your email address to finish setting up your Skylyer account:\n${link}\n\nThis link expires in 24 hours.`,
      `<p>Hi ${name},</p><p>Verify your email address to finish setting up your Skylyer account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    );
  }

  async sendPasswordResetEmail(to: string, name: string, link: string) {
    await this.send(
      to,
      "Reset your password — Skylyer",
      `Hi ${name},\n\nReset your Skylyer password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
      `<p>Hi ${name},</p><p>Reset your Skylyer password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
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
      `${sharerName} shared "${resourceName}" with you — Skylyer`,
      `Hi,\n\n${sharerName} gave you access to ${levelText} the ${resourceType} "${resourceName}" on Skylyer.\n\nOpen it here:\n${link}`,
      `<p>Hi,</p><p>${sharerName} gave you access to ${levelText} the ${resourceType} "${resourceName}" on Skylyer.</p><p><a href="${link}">${link}</a></p>`,
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
      `${sharerName} invited you to Skylyer`,
      `Hi,\n\n${sharerName} wants to give you access to ${levelText} the ${resourceType} "${resourceName}" on Skylyer. Create a free account to open it:\n${registerLink}`,
      `<p>Hi,</p><p>${sharerName} wants to give you access to ${levelText} the ${resourceType} "${resourceName}" on Skylyer. Create a free account to open it:</p><p><a href="${registerLink}">${registerLink}</a></p>`,
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
      `${requesterName} requested access to "${resourceName}" — Skylyer`,
      `Hi,\n\n${requesterName} asked for access to the ${resourceType} "${resourceName}" on Skylyer.${messageLine}\n\nReview the request here:\n${reviewLink}`,
      `<p>Hi,</p><p>${requesterName} asked for access to the ${resourceType} "${resourceName}" on Skylyer.</p>${messageHtml}<p><a href="${reviewLink}">${reviewLink}</a></p>`,
    );
  }

  async sendAccessDeniedEmail(to: string, resourceName: string, resourceType: "file" | "folder") {
    await this.send(
      to,
      `Your access request was declined — Skylyer`,
      `Hi,\n\nYour request for access to the ${resourceType} "${resourceName}" was declined.`,
      `<p>Hi,</p><p>Your request for access to the ${resourceType} "${resourceName}" was declined.</p>`,
    );
  }

  /** Sent to the CURRENT partner when a mapped customer files a request to leave or switch away — needs their approve/reject in the partner portal. */
  async sendPartnerChangeRequestEmail(to: string, organizationName: string, actionDescription: string, link: string) {
    await this.send(
      to,
      `${organizationName} wants to ${actionDescription} — Skylyer`,
      `Hi,\n\n${organizationName} has asked to ${actionDescription}. Review it in your partner portal:\n${link}`,
      `<p>Hi,</p><p>${organizationName} has asked to ${actionDescription}.</p><p><a href="${link}">${link}</a></p>`,
    );
  }

  /** Sent to the customer once their leave/switch request is approved. */
  async sendPartnerChangeApprovedEmail(to: string, partnerName: string, actionDescription: string, link: string) {
    await this.send(
      to,
      `Your request was approved — Skylyer`,
      `Hi,\n\n${partnerName} approved your request to ${actionDescription}.\n\n${link}`,
      `<p>Hi,</p><p>${partnerName} approved your request to ${actionDescription}.</p><p><a href="${link}">${link}</a></p>`,
    );
  }

  /** Sent to the customer if their leave/switch request is declined — the mapping stays as it was. */
  async sendPartnerChangeRejectedEmail(to: string, partnerName: string, actionDescription: string, link: string) {
    await this.send(
      to,
      `Your request was declined — Skylyer`,
      `Hi,\n\n${partnerName} declined your request to ${actionDescription}.\n\n${link}`,
      `<p>Hi,</p><p>${partnerName} declined your request to ${actionDescription}.</p><p><a href="${link}">${link}</a></p>`,
    );
  }
}
