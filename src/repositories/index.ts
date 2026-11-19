import { Repos } from './types';
import { localRepos } from './local';

/**
 * Repository factory.
 * When a backend is connected, swap localRepos with a remote adapter.
 * UI code depends only on the `Repos` interface.
 */
export function getRepos(): Repos {
  // future: if (import.meta.env.VITE_API_BASE_URL) return remoteRepos;
  return localRepos;
}

export type { Repos };