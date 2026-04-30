import { z, type ZodErrorMap } from 'zod';
import bg from '../../messages/bg.json';

const ZOD = (bg as { errorsZod: Record<string, string> }).errorsZod;

const errorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return { message: ZOD.invalidType };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: ZOD.invalidEmail };
      return { message: ZOD.invalidEmail };
    case z.ZodIssueCode.too_small:
      return { message: ZOD.required };
    case z.ZodIssueCode.too_big:
      return { message: ZOD.tooLong };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: ZOD.invalidEnum };
    case z.ZodIssueCode.custom:
      return { message: ZOD.custom };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(errorMap);

export { z };
