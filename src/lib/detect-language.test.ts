import { describe, expect, it } from "vitest";
import { detectLanguage } from "./detect-language";

describe("detectLanguage", () => {
  it("should return null for short or non-code input", () => {
    expect(detectLanguage("hi")).toBeNull();
    expect(detectLanguage("   not enough tokens here   ")).toBeNull();
    expect(detectLanguage("please roast this later")).toBeNull();
  });

  it("should prefer TSX when JSX, React hooks, and type annotations are present", () => {
    const sample = `
import { useState, useEffect, useMemo, useCallback, createContext } from "react";
type Props = { label: string };
interface Count { n: number }
export function Panel(props: Props): React.ReactNode {
  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => {
    setOpen(true);
  }, []);
  const value = useMemo(() => open, [open]);
  useCallback(() => value, [value]);
  createContext<Count | null>(null);
  return (
    <section>
      <button>{props.label}</button>
    </section>
  );
}
`;
    expect(detectLanguage(sample)).toEqual({
      id: "tsx",
      label: "TypeScript / React",
    });
  });

  it("should prefer TypeScript over JavaScript when type syntax is present without JSX", () => {
    const sample = `
export interface User { id: string; name: string }
export function greet(user: User): string {
  const label: string = user.name;
  return label;
}
`.repeat(2);
    expect(detectLanguage(sample)).toEqual({
      id: "ts",
      label: "TypeScript",
    });
  });

  it("should detect SQL when SELECT/JOIN dominate", () => {
    const sample = `
SELECT c.name, SUM(s.total) AS total
FROM customers c
JOIN sales s ON s.customer_id = c.id
WHERE s.deleted_at IS NULL
GROUP BY c.name
ORDER BY total DESC
LIMIT 20;
`.repeat(2);
    expect(detectLanguage(sample)).toEqual({ id: "sql", label: "SQL" });
  });
});
