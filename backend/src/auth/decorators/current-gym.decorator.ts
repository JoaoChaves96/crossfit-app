import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentGym: Extracts current gym context from request
 *
 * In MVP, reads from request.user.currentGymId or gymId from headers
 * TypeScript suppression: getRequest() returns any type in MVP auth stub
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
export const CurrentGym = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // TODO: Implement proper gym context extraction
    // For MVP, get from request or route params

    const gymId =
      request.user?.currentGymId ||
      (request.headers?.['x-gym-id'] as string) ||
      request.params?.gymId ||
      'gym-123';
    return gymId;
  },
);
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
