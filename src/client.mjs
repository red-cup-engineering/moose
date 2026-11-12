async function request(origin, path, { method = "GET", body, token } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (token !== undefined) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(new URL(path, origin), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `FeltOS request failed: ${response.status}`);
  return result;
}

/** One browser client owns one bearer session; character ids never select an HTTP actor. */
export function createMudClient(origin) {
  let token = null;
  let actor = null;
  const sessionRequest = (path, options = {}) => {
    if (token === null) throw new Error("Connect before using the FeltOS session.");
    return request(origin, path, { ...options, token });
  };

  return Object.freeze({
    health: () => request(origin, "/health"),
    metrics: () => request(origin, "/metrics"),
    connect: async () => {
      if (token !== null) throw new Error("This FeltOS client already owns a session.");
      const session = await request(origin, "/connect", { method: "POST", body: {} });
      token = session.token;
      actor = session.actor;
      return Object.freeze({ actor });
    },
    command: (command) => sessionRequest("/command", { method: "POST", body: { command } }),
    talk: async (command) => {
      const result = await sessionRequest("/talk", { method: "POST", body: { command } });
      if (command.trim().toLowerCase() === "quit") {
        token = null;
        actor = null;
      }
      return result;
    },
    tick: () => sessionRequest("/tick", { method: "POST" }),
    events: () => sessionRequest("/events"),
    register: async (name) => {
      const result = await sessionRequest("/account", { method: "POST", body: { action: "register", name } });
      actor = result.actor;
      return result;
    },
    login: async (name, password) => {
      const result = await sessionRequest("/account", { method: "POST", body: { action: "login", name, password } });
      actor = result.actor;
      return result;
    },
  });
}
