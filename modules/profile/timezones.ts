export function timezoneOptions(current = "UTC") {
  return Array.from(
    new Set(["UTC", current, ...Intl.supportedValuesOf("timeZone")]),
  ).sort();
}
