"use server";
import { searchData } from "./data";
import type { SearchResult } from "./data";
export async function runSearch(query: unknown): Promise<SearchResult> {
  if (typeof query !== "string")
    return { items: [], more: false, error: "Enter a search term." };
  return searchData(query);
}
