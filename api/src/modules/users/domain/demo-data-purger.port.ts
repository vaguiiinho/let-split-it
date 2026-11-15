export type PurgeDemoDataResult = { groups: number; invites: number; people: number };

/** Remove, de forma atômica, os dados criados por usuários de demonstração (Adendo A, DM3). */
export interface DemoDataPurger {
  purge(): Promise<PurgeDemoDataResult>;
}

export const DEMO_DATA_PURGER = Symbol('DEMO_DATA_PURGER');
