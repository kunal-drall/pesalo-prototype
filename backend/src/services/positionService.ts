import { PositionInfo } from "../types";

export const positionService = {
  async getPositions(address: string): Promise<{
    address: string;
    fixed: PositionInfo[];
    flex: PositionInfo[];
    available: PositionInfo[];
  }> {
    return {
      address,
      fixed: [],
      flex: [],
      available: []
    };
  }
};
