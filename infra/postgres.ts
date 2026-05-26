export function setupPostgres(
  {
    db_name,
    password,
    user,
  }: { db_name: string; password: string; user: string },
  { host }: { host: string },
) {
  return new { db_name, host, password, user }();
}
