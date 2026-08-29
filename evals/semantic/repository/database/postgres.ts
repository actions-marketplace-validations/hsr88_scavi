import postgres from "postgres";

export const database = postgres(process.env.DATABASE_URL ?? "postgres://localhost/app");
export async function saveUser(user: User) { return database`insert into users ${database(user)}` }
