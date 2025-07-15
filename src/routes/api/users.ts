import { createServerFileRoute } from "@tanstack/react-start/server";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createMiddleware, json } from "@tanstack/react-start";
import type { User } from "~/utils/users";
import { z } from "zod";

const userLoggerMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    console.info("In: /users");
    console.info("Request Headers:", getRequestHeaders());
    const result = await next();
    result.response.headers.set("x-users", "true");
    console.info("Out: /users");
    return result;
  },
);

const testParentMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    console.info("In: testParentMiddleware");
    const result = await next({ context: { testParent: true } });
    result.response.headers.set("x-test-parent", "true");
    console.info("Out: testParentMiddleware");
    return result;
  },
);

const testMiddleware = createMiddleware({ type: "request" })
  .middleware([testParentMiddleware])
  .server(async ({ next, request }) => {
    console.info("In: testMiddleware");
    const result = await next({ context: { test: true } });
    result.response.headers.set("x-test", "true");

    // if (Math.random() > 0.5) {
    //   throw new Response(null, {
    //     status: 302,
    //     headers: { Location: 'https://www.google.com' },
    //   })
    // }

    console.info("Out: testMiddleware");
    return result;
  });

export const ServerRoute = createServerFileRoute("/api/users")
  .middleware([userLoggerMiddleware, testParentMiddleware, testMiddleware])
  .methods({
    GET: async ({ request, context }) => {
      console.info("GET /api/users @", request.url);
      console.info("Fetching users... @", request.url);
      console.info("Context:", context); // context inferred type is { testParent: boolean; test: boolean; }, but actual context is always replaced by the last middleware's context.
      const res = await fetch("https://jsonplaceholder.typicode.com/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = (await res.json()) as Array<User>;

      const list = data.slice(0, 10);

      return json(list.map((u) => ({ id: u.id, name: u.name, email: u.email })));
    },
  });
