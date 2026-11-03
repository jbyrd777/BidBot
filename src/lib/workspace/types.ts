import type { TeamHolder } from "@/lib/team/store";

export type Role = "owner" | "admin" | "sales" | "estimator" | "project_manager" | "viewer";

export interface Change {
  table: string;
  op: string;
  row: unknown;
}

/** Everything one request needs about the signed in person's company. Loaded fresh per request; never shared. */
export interface Workspace extends TeamHolder {
  id: string;
  mode: "demo" | "db";
  me: { userId: string; role: Role; name: string; about: string; email?: string };
  changes: Change[];
}

export const CAN_DECIDE: Role[] = ["owner", "admin", "sales", "estimator"];
export const CAN_APPROVE: Role[] = ["owner", "admin", "sales", "estimator", "project_manager"];
export const CAN_MANAGE: Role[] = ["owner", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  sales: "Sales",
  estimator: "Estimator",
  project_manager: "Project manager",
  viewer: "Viewer",
};
