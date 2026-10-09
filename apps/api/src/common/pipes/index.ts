import { BadRequestException, Injectable } from "@nestjs/common";

type ParseResult<T> =
  { success: true; data: T } | { success: false; error: { issues: unknown[] } };

interface RuntimeSchema<T> {
  safeParse(value: unknown): ParseResult<T>;
}

@Injectable()
export class ZodValidationPipe<T> {
  constructor(private readonly schema: RuntimeSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos.",
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
