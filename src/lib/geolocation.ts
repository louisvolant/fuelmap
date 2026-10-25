export type GeolocationPermission = "granted" | "denied" | "prompt" | "unsupported";

/**
 * Read the geolocation permission without prompting, when supported.
 *
 * Safari (and therefore installed iOS PWAs) does not implement the
 * Permissions API for geolocation, hence the `"unsupported"` state.
 */
export async function queryGeolocationPermission(): Promise<GeolocationPermission> {
  try {
    const status = await navigator.permissions?.query({
      name: "geolocation" as PermissionName,
    });
    return status?.state ?? "unsupported";
  } catch {
    return "unsupported";
  }
}
