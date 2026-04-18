import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser: Extracts authenticated user ID from request
 *
 * In MVP, reads from request.user.id (set by auth middleware)
 * TypeScript suppression: getRequest() returns any type in MVP auth stub
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // TODO: Implement proper JWT extraction
    // For MVP, get from request or environment

    const userId =
      request.user?.id ||
      (request.headers?.['x-user-id'] as string) ||
      'user-123';
    return userId;
  },
);
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
