import mysql from "mysql";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const host = process.env.HOST;
const user = process.env.USER;
const password = process.env.PASSWORD;
const database = process.env.DATABASE;

export const db = mysql.createConnection({
  host,
  user,
  password,
  database,
});
