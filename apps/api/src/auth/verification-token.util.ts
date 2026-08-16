import { randomBytes } from "node:crypto";
import { prisma, type TokenPurpose } from "@nextlayer/database";
import { EmailService } from "../email/email.service";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Deletes any existing unused tokens of this purpose first, so they don't pile up as a user requests link after link. */
export async function createVerificationToken(userId: string, purpose: TokenPurpose, ttlMs: number) {
  await prisma.verificationToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { userId, purpose, token, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

/** Shared by AuthService (user-triggered resend) and AdminService (support-triggered resend) so both send the exact same email/link. */
export async function sendVerificationEmailFor(
  email: EmailService,
  user: { id: string; email: string; name: string },
) {
  const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION", EMAIL_VERIFICATION_TTL_MS);
  await email.sendVerificationEmail(
    user.email,
    user.name,
    `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/verify-email?token=${token}`,
  );
}
