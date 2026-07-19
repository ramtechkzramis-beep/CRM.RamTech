import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { AdminDepartments } from "@/components/admin-departments";
import { AdminEmployees } from "@/components/admin-employees";
import { getAllEmployees, getDepartments, getDepartmentUsage } from "@/lib/admin";

export default async function AdminPage() {
  const profile = await requireProfile();

  if (!canManageUsers(profile.role)) {
    notFound();
  }

  const [departments, employees] = await Promise.all([
    getDepartments(),
    getAllEmployees(),
  ]);

  const usageEntries = await Promise.all(
    departments.map(async (dept) => [dept.id, await getDepartmentUsage(dept.id)] as const),
  );
  const usage = Object.fromEntries(usageEntries);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Сотрудники" subtitle="Отделы, роли и доступы" />

      <AdminDepartments departments={departments} usage={usage} />

      <AdminEmployees
        employees={employees}
        departments={departments}
        currentUserId={profile.id}
      />
    </div>
  );
}
