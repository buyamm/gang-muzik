import type { User } from "@shared/types";

export type StudioEnv = {
  Bindings: Env;
  Variables: { user: User | null };
};
