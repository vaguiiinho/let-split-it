import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { DemoDataPurger, PurgeDemoDataResult } from '../domain/demo-data-purger.port';

@Injectable()
export class PrismaDemoDataPurger implements DemoDataPurger {
  constructor(private readonly prisma: PrismaService) {}

  async purge(): Promise<PurgeDemoDataResult> {
    return this.prisma.$transaction(async (tx) => {
      const demo = { isDemo: true };
      // 1. rolês de donos demo (cascade: membros, despesas, pagamentos, convites)
      const groups = await tx.group.deleteMany({ where: { owner: demo } });
      // 2. convites restantes com convidante ou convidado demo
      const invites = await tx.groupInvite.deleteMany({
        where: { OR: [{ inviter: demo }, { invitee: demo }] },
      });
      // 3. pessoas criadas por demo, sem usuário e sem participação em rolê restante
      // (despesas/pagamentos só referenciam membros do rolê, então sem membership também não há referências)
      const people = await tx.person.deleteMany({
        where: {
          createdBy: demo,
          user: null,
          memberships: { none: {} },
          paid: { none: {} },
          shares: { none: {} },
          paymentsSent: { none: {} },
          paymentsReceived: { none: {} },
        },
      });
      return { groups: groups.count, invites: invites.count, people: people.count };
    });
  }
}
