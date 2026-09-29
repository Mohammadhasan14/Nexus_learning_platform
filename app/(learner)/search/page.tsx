import type { Metadata } from "next";
import { searchData } from "@/modules/search/data";
import { SearchResults } from "@/components/search/results";
export const metadata: Metadata = { title: "Search — Nexus Learning" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams,
    query = typeof params.q === "string" ? params.q : "";
  const result = await searchData(query);
  return (
    <>
      <p className="eyebrow">FIND YOUR NEXT STEP</p>
      <h1>Search your workspace.</h1>
      <p>
        Find actions and unlocked lessons in your enrolled course versions. Use
        at least two characters for lessons. Private notes and grading keys are
        never searched.
      </p>
      <form action="/search" className="workspace-search">
        <div className="field">
          <label htmlFor="workspace-query">Search lessons and actions</label>
          <input
            type="search"
            id="workspace-query"
            name="q"
            maxLength={100}
            defaultValue={query.slice(0, 100)}
          />
        </div>
        <button className="button button-primary">Search</button>
      </form>
      <SearchResults result={result} />
    </>
  );
}
