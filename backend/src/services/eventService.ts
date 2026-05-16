export type IndexedEvent = {
  contractId: string;
  type: string;
  ledger: number;
  payload: unknown;
};

export const eventService = {
  async indexLatestEvents(): Promise<IndexedEvent[]> {
    return [];
  }
};
