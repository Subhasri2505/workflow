import { Rule, RuleEvaluation } from "@/types/workflow";

function containsFn(value: unknown, search: string): boolean {
  return String(value).includes(search);
}

function startsWithFn(value: unknown, prefix: string): boolean {
  return String(value).startsWith(prefix);
}

function endsWithFn(value: unknown, suffix: string): boolean {
  return String(value).endsWith(suffix);
}

export function evaluateCondition(
  condition: string,
  data: Record<string, unknown>
): boolean {
  if (condition === "DEFAULT") return true;

  try {
    // Replace function calls
    let expr = condition
      .replace(/contains\((\w+),\s*["']([^"']*)["']\)/g, (_, field, val) =>
        String(containsFn(data[field], val))
      )
      .replace(/startsWith\((\w+),\s*["']([^"']*)["']\)/g, (_, field, val) =>
        String(startsWithFn(data[field], val))
      )
      .replace(/endsWith\((\w+),\s*["']([^"']*)["']\)/g, (_, field, val) =>
        String(endsWithFn(data[field], val))
      );

    // Replace field references with actual values
    const fieldNames = Object.keys(data).sort((a, b) => b.length - a.length);
    for (const field of fieldNames) {
      const val = data[field];
      const replacement = typeof val === "string" ? `"${val}"` : String(val);
      expr = expr.replace(new RegExp(`\\b${field}\\b`, "g"), replacement);
    }

    // Replace == with === and != with !==
    expr = expr.replace(/([^!=<>])={2}(?!=)/g, "$1===");
    expr = expr.replace(/!={1}(?!=)/g, "!==");

    // eslint-disable-next-line no-eval
    return Boolean(eval(expr));
  } catch {
    return false;
  }
}

export function evaluateRules(
  rules: Rule[],
  data: Record<string, unknown>
): { evaluations: RuleEvaluation[]; matchedRule: Rule | null } {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluations: RuleEvaluation[] = [];
  let matchedRule: Rule | null = null;

  for (const rule of sorted) {
    const result = evaluateCondition(rule.condition, data);
    evaluations.push({ ruleId: rule.id, condition: rule.condition, result, evaluatedAt: new Date() });
    if (result && !matchedRule) {
      matchedRule = rule;
    }
  }

  return { evaluations, matchedRule };
}
