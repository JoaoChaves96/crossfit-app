import { INestApplication } from '@nestjs/common';

/**
 * Bind the app to a single ephemeral port for the whole spec file.
 *
 * Why this exists rather than `app.init()` alone: supertest resolves a base URL
 * per request, and when the server is not already listening it binds one itself —
 * `if (!addr) this._server = app.listen(0)` in supertest/lib/test.js — then closes
 * it again in `end()` once the response is asserted. With `init()` only, that is a
 * fresh bind-and-close per request: ~240 of them per run, multiplied by the seven
 * worker processes jest starts on an 8-core machine.
 *
 * That churn is what made the suite flaky roughly one run in three, and it is why
 * the failure moved between specs instead of sticking to one: a port freed by one
 * worker gets rebound by another while a socket still points at the old owner, and
 * the crossed connection surfaces at whichever end reads first. Every signature we
 * saw is that one fault wearing a different hat —
 *
 *   - `socket hang up` — the server went away under a client that was waiting
 *   - `Parse Error: Expected HTTP/, RTSP/ or ICE/` — the client read bytes that
 *     were not the start of a response
 *   - an unexplained `501 Not Implemented` or `404` on a route that exists — the
 *     *server* read bytes that were not the start of a request, and node answers
 *     501 when it cannot make a method out of them
 *
 * Listening once makes `app.address()` truthy for the spec's whole life, so
 * supertest reuses that one port and never binds or closes anything. `app.close()`
 * in afterAll still tears it down.
 *
 * Do not replace this with `app.init()`. The suite passes either way most of the
 * time, which is exactly the problem.
 */
export async function listenOnEphemeralPort(app: INestApplication): Promise<void> {
  // listen() runs init() itself, so callers need only this.
  await app.listen(0);
}
