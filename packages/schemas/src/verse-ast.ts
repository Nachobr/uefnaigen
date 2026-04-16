import { z } from "zod";

export const VerseExpression = z.object({
  kind: z.literal("expression"),
  code: z.string(),
});
export type VerseExpression = z.infer<typeof VerseExpression>;

export const VerseParam = z.object({
  name: z.string(),
  type: z.string(),
});
export type VerseParam = z.infer<typeof VerseParam>;

export const VerseField = z.object({
  kind: z.literal("field"),
  name: z.string(),
  type: z.string(),
  editable: z.boolean().optional(),
  defaultValue: VerseExpression.optional(),
});
export type VerseField = z.infer<typeof VerseField>;

export const VerseStatement = z.object({
  kind: z.literal("statement"),
  code: z.string(),
});
export type VerseStatement = z.infer<typeof VerseStatement>;

export const VerseFunction = z.object({
  kind: z.literal("function"),
  name: z.string(),
  params: z.array(VerseParam),
  returnType: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  body: z.array(VerseStatement),
});
export type VerseFunction = z.infer<typeof VerseFunction>;

export const VerseClass = z.object({
  kind: z.literal("class"),
  name: z.string(),
  extends: z.string().optional(),
  fields: z.array(VerseField),
  methods: z.array(VerseFunction),
});
export type VerseClass = z.infer<typeof VerseClass>;

export const VerseImport = z.object({
  kind: z.literal("import"),
  path: z.string(),
});
export type VerseImport = z.infer<typeof VerseImport>;

export const VerseModule = z.object({
  kind: z.literal("module"),
  name: z.string(),
  imports: z.array(VerseImport),
  declarations: z.array(z.union([VerseClass, VerseFunction])),
});
export type VerseModule = z.infer<typeof VerseModule>;
