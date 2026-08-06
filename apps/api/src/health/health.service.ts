import { Injectable } from "@nestjs/common";
import { prisma } from "@nextlayer/database";

@Injectable()
export class HealthService {
  async check() {
    const organizationCount = await prisma.organization.count();
    return {
      status: "ok" as const,
      database: "connected" as const,
      organizationCount,
      timestamp: new Date().toISOString(),
    };
  }
}
