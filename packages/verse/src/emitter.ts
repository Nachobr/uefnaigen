import type {
  VerseModule,
  VerseClass,
  VerseFunction,
  VerseField,
  VerseImport,
} from "@forgeai/schemas";

const INDENT = "    ";

export class VerseEmitter {
  emit(module: VerseModule): string {
    const lines: string[] = [];

    for (const imp of module.imports) {
      lines.push(this.emitImport(imp));
    }

    if (module.imports.length > 0) lines.push("");

    for (const decl of module.declarations) {
      if (decl.kind === "class") {
        lines.push(...this.emitClass(decl));
      } else {
        lines.push(...this.emitFunction(decl, 0));
      }
      lines.push("");
    }

    return lines.join("\n").trimEnd() + "\n";
  }

  private emitImport(imp: VerseImport): string {
    return `using { ${imp.path} }`;
  }

  private emitClass(cls: VerseClass): string[] {
    const lines: string[] = [];
    const ext = cls.extends ? `(${cls.extends})` : "";
    lines.push(`${cls.name} := class${ext}:`);
    lines.push("");

    for (const field of cls.fields) {
      lines.push(...this.emitField(field));
    }

    if (cls.fields.length > 0 && cls.methods.length > 0) lines.push("");

    for (let i = 0; i < cls.methods.length; i++) {
      lines.push(...this.emitFunction(cls.methods[i], 1));
      if (i < cls.methods.length - 1) lines.push("");
    }

    return lines;
  }

  private emitField(field: VerseField): string[] {
    const lines: string[] = [];
    if (field.editable) {
      lines.push(`${INDENT}@editable`);
    }
    const defaultVal = field.defaultValue
      ? ` = ${field.defaultValue.code}`
      : field.type.endsWith("[]")
        ? " = array{}"
        : "";
    const varKeyword = field.editable ? "" : "var ";
    lines.push(`${INDENT}${varKeyword}${field.name} : ${field.type}${defaultVal}`);
    return lines;
  }

  private emitFunction(fn: VerseFunction, depth: number): string[] {
    const indent = INDENT.repeat(depth);
    const bodyIndent = INDENT.repeat(depth + 1);
    const lines: string[] = [];

    const attrs = fn.attributes?.length
      ? `<${fn.attributes.join(", ")}>`
      : "";

    const params = fn.params
      .map((p) => `${p.name}:${p.type}`)
      .join(", ");

    const ret = fn.returnType ? `:${fn.returnType}` : "";
    lines.push(`${indent}${fn.name}${attrs}(${params})${ret} =`);

    if (fn.body.length === 0) {
      lines.push(`${bodyIndent}# TODO: implement`);
    } else {
      for (const stmt of fn.body) {
        for (const line of stmt.code.split("\n")) {
          lines.push(`${bodyIndent}${line}`);
        }
      }
    }

    return lines;
  }
}
