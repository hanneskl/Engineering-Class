/**
 * Routing, such as it is.
 *
 * The trainer is one HTML page with no server routes — GitHub Pages has
 * nothing to rewrite a path like `/m2-netzwerk` back to `index.html`, so a
 * refresh or a shared link would 404. The URL fragment never reaches the
 * server, so a hash-based route costs nothing to get wrong: `#/m2-netzwerk`
 * is just a string the browser already keeps in its own history for us.
 *
 * This file is deliberately just two pure functions. The App owns the
 * `hashchange` listener and the one `location.hash = …` write; keeping the
 * parsing here is what makes it testable without a DOM.
 */

export type Route = { kind: 'home' } | { kind: 'lesson'; lessonId: string }

/** What the address bar should say for a route. Home is `#/`, not empty — see hashForRoute. */
export function hashForRoute(route: Route): string {
  return route.kind === 'lesson' ? `#/${encodeURIComponent(route.lessonId)}` : '#/'
}

/**
 * The reverse. `isValidLesson` guards against a stale or hand-edited hash —
 * a module that no longer exists sends the student home instead of to a
 * blank lesson screen.
 */
export function routeFromHash(hash: string, isValidLesson: (id: string) => boolean): Route {
  const id = decodeURIComponent(hash.replace(/^#\/?/, ''))
  return id && isValidLesson(id) ? { kind: 'lesson', lessonId: id } : { kind: 'home' }
}
