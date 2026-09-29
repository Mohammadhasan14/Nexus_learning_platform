import Link from "next/link";
import type { SearchResult } from "@/modules/search/data";
export function SearchResults({
  result,
  onNavigate,
}: {
  result: SearchResult;
  onNavigate?: () => void;
}) {
  if (result.error) return <p role="alert">{result.error}</p>;
  return (
    <>
      <p role="status">
        {result.items.length
          ? `${result.items.length} ${result.items.length === 1 ? "result" : "results"}.`
          : "No matching lessons or actions. Try a shorter term, or visit Courses to enrol and unlock lessons."}
        {result.more &&
          " Showing the first 20 lessons; narrow your search for more specific results."}
      </p>
      <ul className="search-results">
        {result.items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} onClick={onNavigate}>
              <span className="eyebrow">{item.kind}</span>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
