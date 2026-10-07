import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SessionData } from "../../auth/services/session.service";

export const CurrentUser = createParamDecorator(
  (data: keyof SessionData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session as SessionData | undefined;

    if (!session) {
      return null;
    }

    return data ? session[data] : session;
  },
);
