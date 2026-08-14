import * as fs from 'fs';
import * as path from 'path';
import { RequestMethod } from '@nestjs/common';
import {
  PATH_METADATA,
  METHOD_METADATA,
  GUARDS_METADATA,
} from '@nestjs/common/constants';
import { GymStatusGuard } from './gym-status.guard';

/**
 * Every gym-scoped mutation must be frozen when its gym is not active.
 *
 * This is a coverage test, not a behaviour test: GymStatusGuard is mounted per
 * controller, and a mount is a thing you can forget. That is exactly how the
 * debt this guard repays came about — `gyms.status` was checked in three
 * handlers out of roughly forty mutations, so the rule was true in the places
 * someone remembered and false everywhere else.
 *
 * So instead of trusting the mounts, walk every route the app actually
 * publishes: if its path carries `:gymId` and it is not a read, the guard has to
 * be there. A new controller fails this test on the day it is added, in the file
 * that explains why.
 *
 * The one gym-scoped mutation with no `:gymId` to key on —
 * `POST /api/invites/:inviteToken/accept` — is checked inside InviteService
 * instead, and covered by invite.service.spec.ts.
 */

const MUTATIONS = new Set([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
  RequestMethod.ALL,
]);

const API_DIR = path.join(__dirname, '..', '..', 'api');

function controllerFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });
}

type RouteUnderTest = {
  label: string;
  guards: unknown[];
};

function collectRoutes(): RouteUnderTest[] {
  const routes: RouteUnderTest[] = [];

  for (const file of controllerFiles(API_DIR)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exported = require(file) as Record<string, unknown>;

    for (const value of Object.values(exported)) {
      if (typeof value !== 'function') continue;

      const controllerPath = Reflect.getMetadata(PATH_METADATA, value) as
        | string
        | undefined;
      if (controllerPath === undefined) continue;

      const controllerGuards =
        (Reflect.getMetadata(GUARDS_METADATA, value) as unknown[]) ?? [];
      const prototype = (value as { prototype: object }).prototype;

      for (const name of Object.getOwnPropertyNames(prototype)) {
        if (name === 'constructor') continue;

        const handler = (prototype as Record<string, unknown>)[name];
        if (typeof handler !== 'function') continue;

        const routePath = Reflect.getMetadata(PATH_METADATA, handler) as
          | string
          | undefined;
        if (routePath === undefined) continue;

        const httpMethod = Reflect.getMetadata(
          METHOD_METADATA,
          handler,
        ) as RequestMethod;

        const fullPath = `${controllerPath}/${routePath}`.replace(/\/+/g, '/');
        if (!fullPath.includes(':gymId')) continue;
        if (!MUTATIONS.has(httpMethod)) continue;

        const handlerGuards =
          (Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[]) ?? [];

        routes.push({
          label: `${RequestMethod[httpMethod]} ${fullPath} (${
            (value as { name: string }).name
          }.${name})`,
          guards: [...controllerGuards, ...handlerGuards],
        });
      }
    }
  }

  return routes;
}

describe('GymStatusGuard coverage', () => {
  const routes = collectRoutes();

  it('finds the gym-scoped mutations to check', () => {
    // A refactor that stopped this walk from seeing any route would otherwise
    // make every assertion below vacuously pass.
    expect(routes.length).toBeGreaterThan(20);
  });

  it.each(routes.map((r) => [r.label, r] as const))(
    'freezes %s',
    (_label, route) => {
      expect(route.guards).toContain(GymStatusGuard);
    },
  );
});
