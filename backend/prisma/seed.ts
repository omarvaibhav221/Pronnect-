import { PrismaClient, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding...");

  const password = await hash("Password123!");

  const admin = await prisma.user.create({
    data: { email: "admin@pronnect.dev", passwordHash: password, name: "Ava Ndlovu", role: "ADMIN" },
  });

  const pm1 = await prisma.user.create({
    data: { email: "pm1@pronnect.dev", passwordHash: password, name: "Priya Menon", role: "PM" },
  });
  const pm2 = await prisma.user.create({
    data: { email: "pm2@pronnect.dev", passwordHash: password, name: "Carlos Duarte", role: "PM" },
  });

  const dev1 = await prisma.user.create({
    data: { email: "dev1@pronnect.dev", passwordHash: password, name: "Ravi Shah", role: "DEVELOPER" },
  });
  const dev2 = await prisma.user.create({
    data: { email: "dev2@pronnect.dev", passwordHash: password, name: "Mei Lin", role: "DEVELOPER" },
  });
  const dev3 = await prisma.user.create({
    data: { email: "dev3@pronnect.dev", passwordHash: password, name: "Jonah Okafor", role: "DEVELOPER" },
  });
  const dev4 = await prisma.user.create({
    data: { email: "dev4@pronnect.dev", passwordHash: password, name: "Sofia Rinaldi", role: "DEVELOPER" },
  });

  const clientA = await prisma.client.create({ data: { name: "Harlow Retail" } });
  const clientB = await prisma.client.create({ data: { name: "Fenwick Logistics" } });
  const clientC = await prisma.client.create({ data: { name: "Dunmore & Co." } });

  const projectA = await prisma.project.create({ data: { name: "Storefront Relaunch", clientId: clientA.id, pmId: pm1.id } });
  const projectB = await prisma.project.create({ data: { name: "Ops Data Pipeline", clientId: clientB.id, pmId: pm2.id } });
  const projectC = await prisma.project.create({ data: { name: "Support Portal Migration", clientId: clientC.id, pmId: pm1.id } });

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86400000);

  type TaskSeed = { title: string; assignedToId: string; status: TaskStatus; priority: TaskPriority; dueDate: Date; overdue?: boolean };

  const tasksA: TaskSeed[] = [
    { title: "Homepage redesign", assignedToId: dev1.id, status: "DONE", priority: "HIGH", dueDate: days(-6) },
    { title: "Checkout flow QA", assignedToId: dev1.id, status: "IN_REVIEW", priority: "HIGH", dueDate: days(2) },
    { title: "Inventory sync job", assignedToId: dev2.id, status: "IN_PROGRESS", priority: "CRITICAL", dueDate: days(-2), overdue: true },
    { title: "Launch comms plan", assignedToId: dev2.id, status: "TODO", priority: "MEDIUM", dueDate: days(5) },
    { title: "Accessibility audit", assignedToId: dev1.id, status: "TODO", priority: "LOW", dueDate: days(9) },
  ];

  const tasksB: TaskSeed[] = [
    { title: "Warehouse feed ingestion", assignedToId: dev3.id, status: "DONE", priority: "HIGH", dueDate: days(-10) },
    { title: "Dedup rules engine", assignedToId: dev3.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: days(3) },
    { title: "Dashboard v1", assignedToId: dev4.id, status: "IN_REVIEW", priority: "MEDIUM", dueDate: days(1) },
    { title: "Handoff documentation", assignedToId: dev4.id, status: "TODO", priority: "LOW", dueDate: days(-1), overdue: true },
    { title: "Load test the pipeline", assignedToId: dev3.id, status: "TODO", priority: "CRITICAL", dueDate: days(4) },
  ];

  const tasksC: TaskSeed[] = [
    { title: "Content audit", assignedToId: dev2.id, status: "DONE", priority: "MEDIUM", dueDate: days(-8) },
    { title: "New information architecture", assignedToId: dev2.id, status: "DONE", priority: "MEDIUM", dueDate: days(-4) },
    { title: "Article migration script", assignedToId: dev4.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: days(6) },
    { title: "Redirect map", assignedToId: dev4.id, status: "TODO", priority: "LOW", dueDate: days(10) },
    { title: "Client sign-off review", assignedToId: dev1.id, status: "IN_REVIEW", priority: "HIGH", dueDate: days(2) },
  ];

  async function seedProjectTasks(projectId: string, list: TaskSeed[]) {
    for (const t of list) {
      const task = await prisma.task.create({
        data: {
          projectId,
          title: t.title,
          description: `${t.title} for the project.`,
          assignedToId: t.assignedToId,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          isOverdue: Boolean(t.overdue),
        },
      });
      // Pre-existing activity so the feed is not empty on first load.
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          projectId,
          userId: t.assignedToId,
          toStatus: task.status,
          message: `Task "${task.title}" created and set to ${task.status.replace("_", " ")}`,
        },
      });
    }
  }

  await seedProjectTasks(projectA.id, tasksA);
  await seedProjectTasks(projectB.id, tasksB);
  await seedProjectTasks(projectC.id, tasksC);

  console.log("Seed complete.");
  console.log("Login with any of these (password: Password123!):");
  console.log("  admin@pronnect.dev (ADMIN)");
  console.log("  pm1@pronnect.dev / pm2@pronnect.dev (PM)");
  console.log("  dev1@pronnect.dev ... dev4@pronnect.dev (DEVELOPER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
