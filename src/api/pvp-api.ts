import { ApiBase } from "#api/api-base";
import type { RunEntry } from "#types/save-data";

export interface PvpTeamSummary {
  id: string;
  playerName: string;
  name: string;
  uploadedAt: number;
  own: boolean;
  party: { species: number; fusionSpecies?: number; level: number }[];
}

export interface PvpTeam extends PvpTeamSummary {
  runEntry: RunEntry;
}

class PvPAPI extends ApiBase {
  private async request<T>(path: string, body?: object): Promise<T> {
    try {
      const response = await this.doFetch(path, {
        method: body ? "POST" : "GET",
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
      });
      return await this.read<T>(response);
    } catch (error) {
      if (error instanceof TypeError || (error instanceof DOMException && error.name === "TimeoutError")) {
        throw new Error("共享服务连接失败或超时，请稍后重试；也可使用分享码挑战。");
      }
      throw error;
    }
  }

  private async read<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("PVP 共享服务尚未部署或记录已删除。可以先使用分享码挑战。");
      }
      if (response.status === 401) {
        throw new Error("请先登录账号后使用共享队伍。");
      }
      throw new Error((await response.text()).slice(0, 200) || "共享服务请求失败，请稍后重试。");
    }
    return response.json();
  }

  async list(before = ""): Promise<PvpTeamSummary[]> {
    return this.request(`/pvp/teams?before=${encodeURIComponent(before)}`);
  }

  async mine(): Promise<{ playerName: string; teams: PvpTeamSummary[] }> {
    return this.request("/pvp/mine");
  }

  async get(id: string): Promise<PvpTeam> {
    return this.request(`/pvp/teams/${encodeURIComponent(id)}`);
  }

  async upload(runEntry: RunEntry, playerName: string): Promise<PvpTeam> {
    return this.request("/pvp/teams", { runEntry, playerName });
  }

  async remove(id: string): Promise<{ success: boolean }> {
    return this.request(`/pvp/teams/${encodeURIComponent(id)}/delete`, {});
  }
}

export const pvpApi = new PvPAPI(import.meta.env.VITE_SERVER_URL ?? "http://localhost:8001");
