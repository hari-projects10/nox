import { initBotId } from "botid/client/core";

/* Invisible bot check on the assistant's endpoint: the browser attaches a
   challenge token that /api/chat verifies before any model call. */
initBotId({
  protect: [{ path: "/api/chat", method: "POST" }],
});
