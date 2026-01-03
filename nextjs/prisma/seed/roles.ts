import { PrismaClient } from '../../src/generated/client';

export async function seedRoles(prisma: PrismaClient) {
  console.log("Seeding Roles and Permissions...");

  const systemPermissions = [
    { id: "timo_sync", description: "Quyền đồng bộ dữ liệu giao dịch Timo" },
    { id: "view_dashboard", description: "Quyền truy cập bảng điều khiển" },
  ];

  for (const p of systemPermissions) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: { description: p.description },
      create: p,
    });
  }

  const systemRoles = [
    { id: "Admin", description: "Quản trị viên hệ thống (Full quyền)" },
    { id: "Guest", description: "Người dùng mới" },
    { id: "timo_sync", description: "Quyền đồng bộ dữ liệu giao dịch Timo (Role tương thích cũ)" }
  ];

  for (const r of systemRoles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: r
    });
  }

  const allPermissions = await prisma.permission.findMany();
  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: "Admin",
          permissionId: p.id,
        }
      },
      update: {},
      create: {
        roleId: "Admin",
        permissionId: p.id,
      }
    });
  }

  console.log("Roles and Permissions seeded successfully!");
}
