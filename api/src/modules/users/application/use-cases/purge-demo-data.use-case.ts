import { DemoDataPurger, PurgeDemoDataResult } from '../../domain/demo-data-purger.port';

export type PurgeDemoDataInput = Record<string, never>;
export type PurgeDemoDataOutput = PurgeDemoDataResult;

/**
 * Apaga rolês de usuários demo (e, em cascata, membros/despesas/pagamentos/convites), convites restantes
 * envolvendo demo e pessoas criadas por demo sem uso. Mantém os usuários demo e suas Persons.
 */
export class PurgeDemoDataUseCase {
  constructor(private readonly purger: DemoDataPurger) {}

  async execute(_input: PurgeDemoDataInput = {}): Promise<PurgeDemoDataOutput> {
    return this.purger.purge();
  }
}
