/**
 * Send a user to their role's home screen.
 *
 * Extracted from the login screen because invite acceptance now needs the same
 * map: accepting a coach invite hands back a token with a new role, and the
 * screen has to land the user where that role lives.
 */
export function routeForRole(
  router: { replace: (href: never) => void },
  role: string | null,
): void {
  if (role === 'owner') {
    router.replace('/schedule-dashboard' as never);
  } else if (role === 'coach') {
    router.replace('/coach-classes' as never);
  } else if (role === 'athlete') {
    router.replace('/(tabs)/schedule' as never);
  } else {
    router.replace('/no-gym' as never);
  }
}
