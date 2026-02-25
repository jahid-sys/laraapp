import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let userId: string;
  let taskId: string;

  describe("Tasks CRUD", () => {
    test("Sign up test user", async () => {
      const { token, user } = await signUpTestUser();
      authToken = token;
      userId = user.id;
      expect(authToken).toBeDefined();
      expect(userId).toBeDefined();
    });

    test("Get tasks - empty list initially", async () => {
      const res = await authenticatedApi("/api/tasks", authToken);
      await expectStatus(res, 200);
      const tasks = await res.json();
      expect(Array.isArray(tasks)).toBe(true);
    });

    test("Get tasks without auth - 401", async () => {
      const res = await api("/api/tasks");
      await expectStatus(res, 401);
    });

    test("Create task with required title", async () => {
      const res = await authenticatedApi("/api/tasks", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Buy groceries" }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      taskId = data.id;
      expect(data.id).toBeDefined();
      expect(data.title).toBe("Buy groceries");
      expect(data.completed).toBe(false);
      expect(data.priority).toBe("medium");
      expect(data.userId).toBeDefined();
      expect(data.createdAt).toBeDefined();
    });

    test("Create task with all fields", async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const res = await authenticatedApi("/api/tasks", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Finish report",
          priority: "high",
          dueDate: dueDate,
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      expect(data.title).toBe("Finish report");
      expect(data.priority).toBe("high");
      expect(data.dueDate).toBe(dueDate);
    });

    test("Create task without title - 400", async () => {
      const res = await authenticatedApi("/api/tasks", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "low" }),
      });
      await expectStatus(res, 400);
    });

    test("Create task without auth - 401", async () => {
      const res = await api("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" }),
      });
      await expectStatus(res, 401);
    });

    test("Get tasks - returns created task", async () => {
      const res = await authenticatedApi("/api/tasks", authToken);
      await expectStatus(res, 200);
      const tasks = await res.json();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      const foundTask = tasks.find((t: any) => t.id === taskId);
      expect(foundTask).toBeDefined();
      expect(foundTask.title).toBe("Buy groceries");
    });

    test("Update task - mark as completed", async () => {
      const res = await authenticatedApi(`/api/tasks/${taskId}`, authToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, priority: "low" }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.id).toBe(taskId);
      expect(data.completed).toBe(true);
      expect(data.priority).toBe("low");
      expect(data.title).toBe("Buy groceries");
    });

    test("Update task with new title", async () => {
      const res = await authenticatedApi(`/api/tasks/${taskId}`, authToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Buy groceries and cook" }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.title).toBe("Buy groceries and cook");
    });

    test("Update task without auth - 401", async () => {
      const res = await api(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      await expectStatus(res, 401);
    });

    test("Update nonexistent task - 404", async () => {
      const res = await authenticatedApi(
        "/api/tasks/00000000-0000-0000-0000-000000000000",
        authToken,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated" }),
        }
      );
      await expectStatus(res, 404);
    });

    test("Update task with invalid UUID format - 400", async () => {
      const res = await authenticatedApi("/api/tasks/invalid-uuid", authToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      await expectStatus(res, 400);
    });

    test("Delete task", async () => {
      const res = await authenticatedApi(`/api/tasks/${taskId}`, authToken, {
        method: "DELETE",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("Delete nonexistent task - 404", async () => {
      const res = await authenticatedApi(
        "/api/tasks/00000000-0000-0000-0000-000000000000",
        authToken,
        {
          method: "DELETE",
        }
      );
      await expectStatus(res, 404);
    });

    test("Delete task without auth - 401", async () => {
      const res = await api(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      await expectStatus(res, 401);
    });

    test("Verify deleted task is gone", async () => {
      const res = await authenticatedApi(`/api/tasks/${taskId}`, authToken);
      await expectStatus(res, 404);
    });

    test("Create multiple tasks and list them", async () => {
      const task1Res = await authenticatedApi("/api/tasks", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Task 1", priority: "low" }),
      });
      await expectStatus(task1Res, 201);
      const task1 = await task1Res.json();

      const task2Res = await authenticatedApi("/api/tasks", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Task 2", priority: "high" }),
      });
      await expectStatus(task2Res, 201);
      const task2 = await task2Res.json();

      const listRes = await authenticatedApi("/api/tasks", authToken);
      await expectStatus(listRes, 200);
      const tasks = await listRes.json();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.find((t: any) => t.id === task1.id)).toBeDefined();
      expect(tasks.find((t: any) => t.id === task2.id)).toBeDefined();
    });
  });
});
