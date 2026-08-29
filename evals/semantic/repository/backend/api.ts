import { Router } from "express";

export const api = Router();
api.get("/api/users/:id", getUser);
api.post("/api/users", createUser);
