export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
}

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
}

export interface PartnerSessionUser {
  id: string;
  email: string;
  name: string;
  code: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      adminUser?: AdminSessionUser;
      partner?: PartnerSessionUser;
    }
  }
}
