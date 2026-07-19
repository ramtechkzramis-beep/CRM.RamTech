import { createClient } from "@/lib/supabase/server";
import type { Department, Profile } from "@/lib/types";

export type EmployeeWithDepartment = Profile & {
  department: { id: string; name: string } | null;
};

export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Department[];
}

export async function getAllEmployees(): Promise<EmployeeWithDepartment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, department:departments(id, name)")
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EmployeeWithDepartment[];
}

/** Сколько сотрудников и клиентов привязано к отделу — для предупреждения перед удалением. */
export async function getDepartmentUsage(
  departmentId: string,
): Promise<{ employees: number; clients: number }> {
  const supabase = await createClient();

  const [employees, clients] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId),
  ]);

  return {
    employees: employees.count ?? 0,
    clients: clients.count ?? 0,
  };
}
