import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes/router.js";

dotenv.config({ path: "./.env" });

const port = process.env.PORT;

const app = express();

// Chame o middleware cors como uma função
app.use(cors());

app.use(router);

app.listen(port, () => {
  console.log(`App rodando na porta ${port}`);
});
