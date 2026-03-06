import { tool } from "ai";
import { z } from "zod";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || "";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const TMDB_HEADERS = {
  Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
  accept: "application/json",
};

/** Sanitize the title: strip leading @movie / @film prefix if the AI passes it through */
function sanitizeTitle(raw: string): string {
  return raw.replace(/^@?movie\s*/i, "").replace(/^@?film\s*/i, "").trim();
}

/** Fetch JSON from TMDB, returning null on any failure */
async function tmdbFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: TMDB_HEADERS });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const movieTools = {
  searchMovie: tool({
    description:
      "Search for a movie by title using TMDB and return its poster, title, release year, runtime, genres, and overview.",
    inputSchema: z.object({
      title: z.string().describe("The movie title to search for (just the title, no @movie prefix)"),
    }),
    execute: async ({ title }) => {
      const cleanTitle = sanitizeTitle(title);

      // Step 1: Search — NO language filter so regional/non-English films are included
      const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(cleanTitle)}&include_adult=false&page=1`;
      let searchData = await tmdbFetch(searchUrl);

      // Fallback: also try a multi-language search if first attempt returns nothing
      if (!searchData?.results?.length) {
        const fallbackUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(cleanTitle)}&include_adult=false&page=1`;
        const fallbackData = await tmdbFetch(fallbackUrl);
        const movieHit = fallbackData?.results?.find(
          (r: any) => r.media_type === "movie"
        );
        if (movieHit) {
          searchData = { results: [movieHit] };
        }
      }

      if (!searchData?.results?.length) {
        return {
          error: true,
          message: `Sorry, I couldn't find a movie called "${cleanTitle}". Please double-check the title and try again.`,
        };
      }

      // Pick the best match
      const movie = searchData.results[0];

      // Step 2: Full details (English preferred, fall back to original language)
      let details = await tmdbFetch(
        `https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`
      );

      // If overview is empty (common for regional films), refetch in original language
      if (details && !details.overview && details.original_language) {
        const nativeDetails = await tmdbFetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?language=${details.original_language}`
        );
        if (nativeDetails?.overview) {
          details = nativeDetails;
        }
      }

      // Use search-level data as final fallback
      const src = details ?? movie;

      return {
        error: false,
        title: src.title || movie.title,
        releaseYear: src.release_date
          ? new Date(src.release_date).getFullYear()
          : null,
        runtime: src.runtime || null,
        genres: (src.genres || []).map((g: { name: string }) => g.name),
        overview: src.overview || movie.overview || "No description available.",
        posterUrl: src.poster_path
          ? `${TMDB_IMAGE_BASE}/w500${src.poster_path}`
          : null,
        backdropUrl: src.backdrop_path
          ? `${TMDB_IMAGE_BASE}/w780${src.backdrop_path}`
          : null,
        rating: src.vote_average
          ? Math.round(src.vote_average * 10) / 10
          : null,
        voteCount: src.vote_count || 0,
        tagline: src.tagline || null,
        status: src.status || null,
        originalLanguage: src.original_language || null,
        budget: src.budget || null,
        revenue: src.revenue || null,
      };
    },
  }),
};
