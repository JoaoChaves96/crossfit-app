import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentGym = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return request.user?.gymId ?? request.params?.gymId;
  },
);
